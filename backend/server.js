require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const supabase = require('./supabase');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const distDir = path.join(__dirname, '../frontend/dist');
const fallbackFrontendDir = path.join(__dirname, '../frontend');
const staticDir = fs.existsSync(path.join(distDir, 'index.html')) ? distDir : fallbackFrontendDir;

app.use(cors());
app.use(express.json());
app.use(express.static(staticDir));

// Attach io to requests
app.use((req, res, next) => { req.io = io; next(); });

// Routes
const qrRoutes = require('./routes/qr');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const sessionsRoutes = require('./routes/sessions');
const adminRoutes = require('./routes/admin');

app.use('/api', qrRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', notificationRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', sessionsRoutes);
app.use('/api/admin', adminRoutes);

// ─── Auth Endpoints ──────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ error: 'id and password required' });

  try {
    let user = null;

    // 1. Check users table (teachers & admins)
    const { data: usersData } = await supabase.from('users').select('*')
      .or(`email.eq.${id},id.eq.${id}`).limit(1);
    if (usersData?.[0]) {
      user = usersData[0];
    }

    // 2. If not found, check students table
    if (!user) {
      const { data: studentData } = await supabase.from('students').select('*')
        .or(`roll.eq.${id},email.eq.${id},id.eq.${id}`).limit(1);
      if (studentData?.[0]) {
        const student = studentData[0];
        const { data: userData } = await supabase.from('users').select('password').eq('email', student.email).limit(1);
        user = { ...student, role: 'student', password: userData?.[0]?.password || 'pass123' };
      }
    }

    if (!user) return res.status(401).json({ error: 'User not found' });

    // Password check (in production, compare bcrypt hash)
    const expectedPass = user.password || 'pass123';
    if (password !== expectedPass) return res.status(401).json({ error: 'Invalid password' });

    const { password: _, ...safeUser } = user;
    const token = jwt.sign(safeUser, process.env.JWT_SECRET || 'qrollcall_secret_key_2024', { expiresIn: '24h' });
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const token = authHeader.replace('Bearer ', '');
    const user = jwt.verify(token, process.env.JWT_SECRET || 'qrollcall_secret_key_2024');
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/forgot-password', async (req, res) => {
  const { id, email } = req.body;
  const identifier = (id || email || '').trim();
  if (!identifier) return res.status(400).json({ error: 'Email or ID/Roll required' });

  try {
    let resolvedEmail = identifier;

    // Check users
    let { data: usersData } = await supabase.from('users').select('id, email').or(`email.eq.${identifier},id.eq.${identifier}`).limit(1);
    
    if (!usersData?.[0]) {
      // Check students
      const { data: studentData } = await supabase.from('students').select('id, email').or(`roll.eq.${identifier},email.eq.${identifier},id.eq.${identifier}`).limit(1);
      if (studentData?.[0]) {
        resolvedEmail = studentData[0].email;
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    } else {
      resolvedEmail = usersData[0].email;
    }

    if (!resolvedEmail) return res.status(400).json({ error: 'User does not have an email address associated.' });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const redirectTo = `${frontendUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(resolvedEmail, { redirectTo });
    if (error) throw error;

    res.json({ success: true, message: `Reset link sent to ${resolvedEmail}` });

  } catch (err) {
    console.error('[forgot-password]', err);
    res.status(500).json({ error: 'Failed to request reset' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword, accessToken, refreshToken } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password is required' });

  try {
    // Supabase recovery flow (preferred)
    if (accessToken && refreshToken) {
      const { error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionErr) throw sessionErr;

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      await supabase.auth.signOut();
      return res.json({ success: true, message: 'Password reset successfully' });
    }

    // Legacy JWT-based reset flow fallback
    if (!token) return res.status(400).json({ error: 'Reset token is required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qrollcall_secret_key_2024');

    if (decoded.role === 'student' || decoded.role === 'user') {
      const { error } = await supabase.from('users').upsert({
        id: decoded.targetId,
        email: decoded.email,
        password: newPassword,
        role: decoded.role === 'student' ? 'student' : undefined
      }, { onConflict: 'email' });

      if (error) throw error;
    }

    return res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(400).json({ error: err.message || 'Invalid or expired token' });
  }
});

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  try {
    const { randomUUID } = require('crypto');
    const payload = {
      id: randomUUID(),
      type: 'contact',
      student_id: null,
      student_name: `${name} (${email})`,
      subject: 'Admin Contact',
      message: message,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    let { error } = await supabase.from('notifications').insert(payload);

    if (error && (error.code === '23514' || (error.message || '').toLowerCase().includes('check constraint'))) {
      const fallbackPayload = { ...payload, type: 'email' };
      ({ error } = await supabase.from('notifications').insert(fallbackPayload));
    }

    if (error) throw error;
    res.json({ success: true, message: 'Message sent successfully. An admin will contact you soon.' });
  } catch (err) {
    console.error('[contact]', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join-teacher', (teacherId) => {
    socket.join(`teacher-${teacherId}`);
    console.log(`[Socket] Teacher ${teacherId} joined room`);
  });

  socket.on('join-student', (studentId) => {
    socket.join(`student-${studentId}`);
    console.log(`[Socket] Student ${studentId} joined room`);
  });

  socket.on('join-admins', () => {
    socket.join('admins');
    console.log('[Socket] Admin joined admins room');
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'QRollCall', db: 'supabase', timestamp: new Date().toISOString() });
});

// ─── Serve Frontend ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// SPA fallback for frontend routes (e.g., /login, /teacher, /admin/students)
app.get(/^(?!\/api|\/health|\/socket\.io).*/, (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 QRollCall server running at http://localhost:${PORT}`);
  console.log(`📦 Database: Supabase (${process.env.SUPABASE_URL})\n`);
});

// Nodemon Reload Trigger

