import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Maximize2, Users, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { generateQR } from '../api/api';
import { useSocket } from '../hooks/useSocket';

const TOKEN_DURATION = 60;

export default function QRDisplay() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  // Subject comes from the session the teacher clicked on
  const initialSubject = location.state?.subject || '';

  const [subject] = useState(initialSubject);
  const [token, setToken] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [expiry, setExpiry] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(TOKEN_DURATION);
  const [fullscreen, setFullscreen] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [fraudCount, setFraudCount] = useState(0);
  const [liveStudents, setLiveStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeToken, setActiveToken] = useState(null);

  const teacherId = user?.id || 't1';

  // Socket: join teacher room and listen for real-time events
  useSocket(`teacher-${teacherId}`, {
    'attendance-update': (record) => {
      setAttendanceCount(c => c + 1);
      setLiveStudents(prev => {
        const exists = prev.find(s => s.studentId === record.studentId);
        if (exists) return prev;
        return [record, ...prev].slice(0, 20);
      });
    },
    'fraud-alert': () => setFraudCount(c => c + 1),
  });

  const requestQR = useCallback(async (subj) => {
    if (!subj) {
      setError('No subject specified. Please start a session from the dashboard first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await generateQR(subj || subject, teacherId);
      setToken(data.token);
      setExpiry(data.expiry);
      setSecondsLeft(Math.round((data.expiry - Date.now()) / 1000));
      setQrPayload(JSON.stringify({ token: data.token, subject: data.subject, expiry: data.expiry }));
      setActiveToken(data.token);
    } catch (err) {
      console.error('QR generation failed', err);
      const msg = err.response?.data?.error || err.message || 'Failed to generate QR. Make sure you have started the session first.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [subject, teacherId]);

  useEffect(() => {
    if (subject) {
      requestQR(subject);
    } else {
      setError('No subject specified. Please start a session from the dashboard first.');
    }
  }, []); // eslint-disable-line

  // Countdown timer & auto-refresh
  useEffect(() => {
    if (!expiry) return;
    const i = setInterval(() => {
      const left = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) requestQR(subject);
    }, 500);
    return () => clearInterval(i);
  }, [expiry, subject, requestQR]);

  const progress = (secondsLeft / TOKEN_DURATION) * 100;
  const r = 28, circ = 2 * Math.PI * r;
  const timerColor = secondsLeft > 30 ? '#22C55E' : secondsLeft > 10 ? '#F59E0B' : '#EF4444';

  // If there's an error (no session started), show a friendly error page
  if (error && !qrPayload) {
    return (
      <div className="qr-display-page">
        <div className="qr-display-card fade-in" style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: 'white', marginBottom: 12 }}>Cannot Generate QR Code</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>{error}</p>
            <button className="btn" style={{ background: 'white', color: 'var(--primary)', fontWeight: 700 }} onClick={() => navigate('/teacher')}>
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-display-page" onClick={fullscreen ? () => setFullscreen(false) : undefined}>
      <div className="qr-display-card qr-display-card-shell fade-in" style={{ width: '100%', maxWidth: fullscreen ? 560 : 480 }}>
        {/* Header */}
        <div className="qr-display-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {!fullscreen && (
            <button className="btn btn-icon" style={{ background: 'rgba(255,255,255,.1)', color: 'white' }} onClick={() => navigate('/teacher')}>
              <ArrowLeft size={16} />
            </button>
          )}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Active Session</div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>{subject}</div>
          </div>
          <button className="btn btn-icon" style={{ background: 'rgba(255,255,255,.1)', color: 'white' }} onClick={() => setFullscreen(f => !f)}>
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Live stats */}
        {!fullscreen && (
          <div className="qr-display-stats" style={{ display: 'flex', gap: 12, width: '100%' }}>
            <div style={{ flex: 1, background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Users size={14} color="#22C55E" />
                <span style={{ color: '#22C55E', fontWeight: 800, fontSize: 20 }}>{attendanceCount}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>Present</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <AlertTriangle size={14} color="#EF4444" />
                <span style={{ color: '#EF4444', fontWeight: 800, fontSize: 20 }}>{fraudCount}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11 }}>Fraud Alerts</div>
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="qr-image-wrap">
          {loading && <div style={{ width: fullscreen ? 320 : 240, height: fullscreen ? 320 : 240, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: 12 }}><span style={{ color: '#94a3b8' }}>Generating…</span></div>}
          {!loading && qrPayload && <QRCodeSVG value={qrPayload} size={fullscreen ? 320 : 240} level="H" fgColor="#1e40af" bgColor="#ffffff" />}
        </div>

        {/* Countdown Ring */}
        <div className="countdown-ring">
          <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={5} />
            <circle cx={40} cy={40} r={r} fill="none" stroke={timerColor} strokeWidth={5}
              strokeDasharray={`${circ * progress / 100} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .5s,stroke .3s' }} />
          </svg>
          <div className="countdown-value" style={{ color: timerColor }}>{secondsLeft}</div>
        </div>

        <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, textAlign: 'center' }}>
          QR refreshes in <strong style={{ color: 'white' }}>{secondsLeft}s</strong>
        </div>

        <div className="qr-display-actions" style={{ display: 'flex', gap: 10, width: '100%' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => requestQR(subject)}>
            <RefreshCw size={15} /> Refresh QR
          </button>
          <button className="btn" style={{ background: 'rgba(239,68,68,.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,.3)' }}
            onClick={() => navigate('/live-attendance', { state: { token: activeToken, subject } })}>
            <Users size={15} /> Live View
          </button>
        </div>

        {/* Live feed */}
        {liveStudents.length > 0 && !fullscreen && (
          <div style={{ width: '100%', background: 'rgba(255,255,255,.05)', borderRadius: 12, padding: 12 }}>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>Recent Scans</div>
            {liveStudents.slice(0, 4).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,.08)' : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700, flexShrink: 0 }}>✓</div>
                <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 13 }}>{s.studentName}</span>
                <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, marginLeft: 'auto' }}>just now</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11 }}>Token: <code style={{ fontSize: 10 }}>{token.slice(0, 24)}…</code></div>
        </div>
      </div>
    </div>
  );
}
