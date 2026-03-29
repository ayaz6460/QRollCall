// src/api/api.js
import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseURL = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : '/api';

const api = axios.create({
  baseURL,
});

// Attach token from localStorage on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('qrc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (id, password) =>
  api.post('/login', { id, password }).then(r => r.data);

export const sendResetLink = (email) =>
  api.post('/forgot-password', { email }).then(r => r.data);

export const updateStudentPassword = (id, password) =>
  api.put(`/students/${id}/password`, { password }).then(r => r.data);

export const updateAdminTeacherPassword = (id, password) =>
  api.put(`/admin/teachers/${id}/password`, { password }).then(r => r.data);

// ─── QR ─────────────────────────────────────────────────────────────────────
export const generateQR = (subject, teacherId) =>
  api.post('/generate-qr', { subject, teacherId }).then(r => r.data);

export const getActiveSessions = () =>
  api.get('/sessions/active').then(r => r.data);

// ─── Attendance ──────────────────────────────────────────────────────────────
export const markAttendance = payload =>
  api.post('/mark-attendance', payload).then(r => r.data);

export const getStudentDashboard = studentId =>
  api.get('/student-dashboard', { params: { studentId } }).then(r => r.data);

export const getTeacherDashboard = () =>
  api.get('/teacher-dashboard').then(r => r.data);

export const startAssignedSession = (payload) =>
  api.put('/teacher-dashboard/start', payload).then(r => r.data);

export const stopAssignedSession = (token) =>
  api.put('/teacher-dashboard/stop', { token }).then(r => r.data);

export const getAttendanceHistory = studentId =>
  api.get('/attendance-history', { params: { studentId } }).then(r => r.data);

// ─── Sessions ────────────────────────────────────────────────────────────────
export const endSession = (token, manualState) =>
  api.post('/end-session', { token, manualState }).then(r => r.data);

// ─── Notifications ───────────────────────────────────────────────────────────
export const sendNotification = (studentIds, message, channels, subject) =>
  api.post('/send-notification', { studentIds, message, channels, subject }).then(r => r.data);

export const getNotifications = studentId =>
  api.get('/notifications', { params: studentId ? { studentId } : {} }).then(r => r.data);

// ─── Fraud ───────────────────────────────────────────────────────────────────
export const getFraudLogs = () =>
  api.get('/fraud-logs').then(r => r.data);

export const updateFraudStatus = (id, status) =>
  api.post('/update-fraud-status', { id, status }).then(r => r.data);

// ─── Analytics ───────────────────────────────────────────────────────────────
export const getAnalytics = () =>
  api.get('/analytics').then(r => r.data);

// ─── Students ────────────────────────────────────────────────────────────────
export const getStudents = () => api.get('/students').then(res => res.data);
export const getStudent = (id) => api.get(`/students/${id}`).then(res => res.data);
export const getStudentAttendanceHistory = (id) => api.get(`/attendance-history?studentId=${id}`).then(res => res.data);

export const createStudent = (data) => api.post('/students', data).then(r => r.data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data).then(r => r.data);
export const deleteStudent = (id) => api.delete(`/students/${id}`).then(r => r.data);

// ─── Admin Master Hub ────────────────────────────────────────────────────────
export const getAdminStats = () => api.get('/admin/system-stats').then(r => r.data);
export const getAdminTeachers = () => api.get('/admin/teachers').then(r => r.data);
export const createAdminTeacher = (data) => api.post('/admin/teachers', data).then(r => r.data);
export const updateAdminTeacher = (id, data) => api.put(`/admin/teachers/${id}`, data).then(r => r.data);
export const getAdminAdmins = () => api.get('/admin/admins').then(r => r.data);
export const createAdminAdmin = (data) => api.post('/admin/admins', data).then(r => r.data);
export const getAdminSessions = () => api.get('/admin/sessions').then(r => r.data);
export const createAdminSession = (data) => api.post('/admin/sessions', data).then(r => r.data);
export const deleteAdminSession = (token) => api.delete(`/admin/sessions/${token}`).then(r => r.data);
export const getAdminAttendance = () => api.get('/admin/attendance').then(r => r.data);
export const updateAdminAttendance = (id, status) => api.put(`/admin/attendance/${id}`, { status }).then(r => r.data);
export const getAdminComms = () => api.get('/admin/communications').then(r => r.data);

export default api;
