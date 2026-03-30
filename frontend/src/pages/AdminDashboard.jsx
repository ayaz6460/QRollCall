import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getAdminStats, getAdminTeachers, createAdminTeacher, updateAdminTeacher, getStudents, createStudent, updateStudent, deleteStudent, getAdminSessions, deleteAdminSession, createAdminSession, getAdminAttendance, updateAdminAttendance, getAdminComms, getAnalytics, sendNotification, updateStudentPassword, updateAdminTeacherPassword } from '../api/api';
import { BarChart, Users, GraduationCap, Calendar, CheckSquare, MessageSquare, ShieldAlert, Plus, Mail, Smartphone, Search, Trash2, ChevronRight, Edit2, Send, Loader, Key, User } from 'lucide-react';
import { Chart as ChartJS, BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

ChartJS.register(BarElement, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

const chartOpts = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { bodyFont: { family: 'Inter' }, titleFont: { family: 'Inter' } } },
  scales: { x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 } } }, y: { grid: { color: '#f0f4f8' }, ticks: { font: { family: 'Inter', size: 12 } }, max: 100, min: 0 } },
};

/* ─────────────────── AdminLayout wrapper ─────────────────── */
function AdminLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-layout">
      <Sidebar role="admin" userName={user?.name || 'Administrator'} onLogout={logout} />
      <div className="main-content">
        <Topbar title={title} subtitle={subtitle || 'Administration Panel'} userName={user?.name || 'Admin'} />
        <div className="page-content fade-in">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────── OVERVIEW ─────────────────── */
export function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    getAdminStats().then(setStats).catch(console.error);
    getAnalytics().then(setAnalyticsData).catch(console.error);
  }, []);

  const subjectData = analyticsData?.subjectData || [];
  const weeklyTrend = analyticsData?.weeklyTrend || [];

  const barData = {
    labels: subjectData.map(s => s.subject.split(' ')[0]),
    datasets: [{ data: subjectData.map(s => s.percent), backgroundColor: subjectData.map(s => s.percent >= 75 ? '#22C55E' : s.percent >= 60 ? '#F59E0B' : '#EF4444'), borderRadius: 8 }]
  };
  const overallPresent = analyticsData?.overallPresent || 0;
  const overallAbsent = analyticsData?.overallAbsent || 0;
  const total = overallPresent + overallAbsent;
  const overallPct = total > 0 ? Math.round((overallPresent / total) * 100) : 0;
  const pieData = { labels: ['Present', 'Absent'], datasets: [{ data: [overallPct, 100 - overallPct], backgroundColor: ['#2563EB', '#E5E9F0'], borderWidth: 0, hoverOffset: 4 }] };
  const lineData = { labels: weeklyTrend.map(d => d.day), datasets: [{ data: weeklyTrend.map(d => d.present), fill: true, borderColor: '#2563EB', borderWidth: 2.5, backgroundColor: 'rgba(37,99,235,.08)', pointBackgroundColor: '#2563EB', pointRadius: 4, tension: .4 }] };
  const lineOpts = { ...chartOpts, scales: { ...chartOpts.scales, y: { ...chartOpts.scales.y, max: undefined, min: 0 } } };

  return (
    <AdminLayout title="Overview" subtitle="System Statistics & Analytics">
      <div className="grid grid-4 gap-20" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Students</div><div className="stat-value">{stats?.totalStudents || '--'}</div></div>
        <div className="stat-card"><div className="stat-label">Total Teachers</div><div className="stat-value">{stats?.totalTeachers || '--'}</div></div>
        <div className="stat-card success"><div className="stat-label">System Health</div><div className="stat-value" style={{ color: 'var(--success)' }}>{stats?.systemHealth || '--'}%</div></div>
        <div className="stat-card"><div className="stat-label">Global Attendance</div><div className="stat-value text-primary">{stats?.overallPercent || '--'}%</div></div>
      </div>
      {analyticsData && (
        <div className="grid grid-3 gap-20" style={{ marginBottom: 24 }}>
          <div className="card"><div className="card-header"><span className="card-title">Attendance by Subject (%)</span></div><div className="card-body" style={{ height: 260, padding: 20 }}><Bar data={barData} options={chartOpts} /></div></div>
          <div className="card"><div className="card-header"><span className="card-title">Presence Trend (Last 7 Days)</span></div><div className="card-body" style={{ height: 260, padding: 20 }}><Line data={lineData} options={lineOpts} /></div></div>
          <div className="card"><div className="card-header"><span className="card-title">Overall Distribution</span></div><div className="card-body" style={{ height: 260, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '80%', height: '80%' }}><Pie data={pieData} options={{ ...chartOpts, scales: undefined }} /></div></div></div>
        </div>
      )}
      <div className="grid grid-2 gap-20">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Mail size={24} /></div>
          <div><div className="stat-value">{stats?.communications?.emails || 0}</div><div className="stat-label">SMTP Emails Sent</div></div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div className="stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Smartphone size={24} /></div>
          <div><div className="stat-value">{stats?.communications?.sms || 0}</div><div className="stat-label">Twilio SMS Delivered</div></div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ─────────────────── TEACHERS ─────────────────── */
export function AdminTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', department: '' });

  const fetchTeachers = () => getAdminTeachers().then(setTeachers).catch(console.error);
  useEffect(() => { fetchTeachers() }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) await updateAdminTeacher(editId, formData);
      else await createAdminTeacher(formData);
      setShowModal(false); setFormData({ name: '', email: '', password: '', department: '' }); fetchTeachers();
    } catch { alert(`Failed to ${isEdit ? 'update' : 'create'} teacher`); }
  };
  const openAddModal = () => { setIsEdit(false); setEditId(null); setFormData({ name: '', email: '', password: '', department: '' }); setShowModal(true); };
  const openEditModal = (t) => { setIsEdit(true); setEditId(t.id); setFormData({ name: t.name, email: t.email, password: '', department: t.department || '' }); setShowModal(true); };

  return (
    <AdminLayout title="Teachers" subtitle="Manage Teaching Staff">
      <div className="dashboard-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3>Teacher Management</h3>
        <button className="btn btn-primary" onClick={openAddModal}><Plus size={16} /> Add Teacher</button>
      </div>
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <table className="data-table"><thead><tr>
          <th>Name</th><th>Subjects</th><th>Email</th><th>Department</th><th style={{ width: 80, textAlign: 'center' }}>Actions</th>
        </tr></thead><tbody>
          {teachers.map(t => (
            <tr key={t.id}>
              <td style={{ fontWeight: 600 }}>{t.name}</td>
              <td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(t.department || 'General').split(',').map((s,i) => <span key={i} className="badge" style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,0.1)' }}>{s.trim()}</span>)}</div></td>
              <td style={{ color: 'var(--text-secondary)' }}>{t.email}</td>
              <td style={{ color: 'var(--text-muted)' }}>{t.department || '—'}</td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button className="btn btn-icon" onClick={() => openEditModal(t)} style={{ padding: 6, color: 'var(--text-secondary)' }} title="Edit"><Edit2 size={16} /></button>
                  <button
                    className="btn btn-icon"
                    onClick={async () => {
                      const nextPassword = window.prompt(`Set new password for ${t.name} (min 6 chars):`);
                      if (!nextPassword) return;
                      if (nextPassword.length < 6) {
                        alert('Password must be at least 6 characters.');
                        return;
                      }
                      try {
                        await updateAdminTeacherPassword(t.id, nextPassword);
                        alert(`Password updated for ${t.name}.`);
                      } catch (err) {
                        alert(err.response?.data?.error || 'Failed to update teacher password');
                      }
                    }}
                    style={{ padding: 6, color: 'var(--text-secondary)' }}
                    title="Change Password"
                  ><Key size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {teachers.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No teachers found.</td></tr>}
        </tbody></table>
      </div></div>

      {showModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 450, padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 24, fontSize: 22, fontWeight: 700 }}>{isEdit ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            <form onSubmit={handleSave}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label><input required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Prof. Jane Doe" /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label><input required type="email" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@school.edu" disabled={isEdit} /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Department / Subjects</label><input className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="Computer Science, Mathematics" /></div>
              {!isEdit && <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label><input required type="password" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="6+ characters" /></div>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12, borderRadius: 12 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }}>{isEdit ? 'Save Changes' : 'Create'}</button>
            </div></form>
          </div>
        </div>, document.body
      )}
    </AdminLayout>
  );
}

/* ─────────────────── STUDENTS ─────────────────── */
export function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [isStudentEdit, setIsStudentEdit] = useState(false);
  const [studentFormData, setStudentFormData] = useState({ id: '', name: '', roll: '', email: '', parent_phone: '', password: '' });
  const [isSending, setIsSending] = useState(false);
  const [msgPayload, setMsgPayload] = useState({ subject: '', message: '', email: true, sms: false });

  const msgTemplates = [
    { label: 'Holiday', icon: '🌴', subject: 'Upcoming Holiday Notice', message: 'Dear Student,\n\nPlease be informed that the institution will remain closed due to the upcoming holiday. Classes will resume as per schedule afterwards.\n\nRegards,\nAdministration' },
    { label: 'Exams', icon: '📝', subject: 'Examination Schedule Update', message: 'Dear Student,\n\nThe upcoming examination dates have been announced. Please check the student portal for your timetable.\n\nBest of luck,\nAdministration' },
    { label: 'Attendance', icon: '⚠️', subject: 'Critical Attendance Warning', message: 'Dear Student,\n\nYour attendance has fallen below the required threshold. Please attend classes regularly.\n\nRegards,\nAdministration' },
    { label: 'Fees', icon: '💰', subject: 'Fee Payment Reminder', message: 'Dear Student,\n\nYour fee payment for the current term is due. Please clear dues at the earliest.\n\nRegards,\nAdministration' }
  ];

  const fetchStudents = () => getStudents().then(res => setStudents(res.students || [])).catch(console.error);
  useEffect(() => { fetchStudents() }, []);

  const handleDelete = async (id) => { if (window.confirm("Delete this student?")) { await deleteStudent(id).catch(console.error); fetchStudents(); } };
  const openAddStudent = () => { setIsStudentEdit(false); setStudentFormData({ id: '', name: '', roll: '', email: '', parent_phone: '', password: '' }); setShowStudentModal(true); };
  const openEditStudent = (s) => { setIsStudentEdit(true); setStudentFormData({ id: s.id, name: s.name, roll: s.roll, email: s.email, parent_phone: s.parent_phone || '', password: '' }); setShowStudentModal(true); };
  const handleSaveStudent = async (e) => { e.preventDefault(); try { if (isStudentEdit) await updateStudent(studentFormData.id, studentFormData); else await createStudent(studentFormData); setShowStudentModal(false); fetchStudents(); } catch { alert('Failed. Check if Roll or Email already exists.'); } };

  const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.roll.toLowerCase().includes(search.toLowerCase()));
  const handleSelectAll = (e) => { if (e.target.checked) setSelectedIds(filtered.map(s => s.id)); else setSelectedIds([]); };
  const handleSelect = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id)); else setSelectedIds([...selectedIds, id]); };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!selectedIds.length) return alert('No students selected');
    const channels = [];
    if (msgPayload.email) channels.push('email');
    if (msgPayload.sms) channels.push('sms');
    if (!channels.length) return alert('Select at least one channel');
    try { setIsSending(true); await sendNotification(selectedIds, msgPayload.message, channels, msgPayload.subject); alert('Broadcast sent!'); setShowMsgModal(false); setSelectedIds([]); } catch { alert('Failed'); } finally { setIsSending(false); }
  };

  return (
    <AdminLayout title="Students" subtitle="Student Roster & Management">
      <div className="dashboard-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="dashboard-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3>Student Roster</h3>
          <button className="btn btn-secondary btn-sm" onClick={openAddStudent} style={{ borderRadius: 20 }}><Plus size={14} /> Add</button>
          <button className="btn btn-primary btn-sm" disabled={!selectedIds.length} onClick={() => setShowMsgModal(true)} style={{ opacity: selectedIds.length ? 1 : .5, borderRadius: 20 }}>
            <Send size={14} /> Broadcast {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>
        </div>
        <div className="input-icon-wrap dashboard-toolbar-search" style={{ width: 280 }}><Search size={15} className="icon" style={{ left: 14 }} /><input className="form-control" style={{ paddingLeft: 40, borderRadius: 20 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <table className="data-table"><thead><tr>
          <th style={{ width: 40, textAlign: 'center' }}><input type="checkbox" onChange={handleSelectAll} checked={filtered.length > 0 && selectedIds.length === filtered.length} /></th>
          <th>Student</th><th>Roll No</th><th>Email</th><th>Parent Phone</th><th>Actions</th>
        </tr></thead><tbody>
          {filtered.map(s => (
            <tr key={s.id} style={{ background: selectedIds.includes(s.id) ? 'var(--primary-light)' : '' }}>
              <td style={{ textAlign: 'center' }}><input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => handleSelect(s.id)} /></td>
              <td style={{ fontWeight: 600 }}>{s.name}</td>
              <td><span className="badge badge-gray">{s.roll}</span></td>
              <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{s.parent_phone || '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Link to={`/student/${s.id}`} className="btn btn-icon" style={{ padding: 6, color: 'var(--text-secondary)' }} title="View Profile"><User size={16} /></Link>
                  <button
                    className="btn btn-icon"
                    onClick={async () => {
                      const nextPassword = window.prompt(`Set new password for ${s.name} (min 6 chars):`);
                      if (!nextPassword) return;
                      if (nextPassword.length < 6) {
                        alert('Password must be at least 6 characters.');
                        return;
                      }
                      try {
                        await updateStudentPassword(s.id, nextPassword);
                        alert(`Password updated for ${s.name}.`);
                      } catch (err) {
                        alert(err.response?.data?.error || 'Failed to update student password');
                      }
                    }}
                    style={{ padding: 6, color: 'var(--text-secondary)' }}
                    title="Change Password"
                  ><Key size={16} /></button>
                  <button className="btn btn-icon" style={{ padding: 6, color: 'var(--text-secondary)' }} onClick={() => openEditStudent(s)} title="Edit"><Edit2 size={16} /></button>
                  <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: 6 }} onClick={() => handleDelete(s.id)} title="Delete"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No students found.</td></tr>}
        </tbody></table>
      </div></div>

      {/* Add/Edit Student Modal */}
      {showStudentModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 450, padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 24, fontSize: 22, fontWeight: 700 }}>{isStudentEdit ? 'Edit Student' : 'Add New Student'}</h3>
            <form onSubmit={handleSaveStudent}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label><input required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={studentFormData.name} onChange={e => setStudentFormData({...studentFormData, name: e.target.value})} placeholder="Arjun Kumar" /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Roll Number</label><input required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={studentFormData.roll} onChange={e => setStudentFormData({...studentFormData, roll: e.target.value})} placeholder="22CS001" disabled={isStudentEdit} /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</label><input required type="email" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={studentFormData.email} onChange={e => setStudentFormData({...studentFormData, email: e.target.value})} placeholder="arjun@student.edu" /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Parent Phone</label><input className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={studentFormData.parent_phone} onChange={e => setStudentFormData({...studentFormData, parent_phone: e.target.value})} placeholder="+91 98765 43210" /></div>
              {!isStudentEdit && <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label><input required type="password" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={studentFormData.password} onChange={e => setStudentFormData({...studentFormData, password: e.target.value})} placeholder="6+ characters" /></div>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12, borderRadius: 12 }} onClick={() => setShowStudentModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }}>{isStudentEdit ? 'Save Changes' : 'Create'}</button>
            </div></form>
          </div>
        </div>, document.body
      )}

      {/* Broadcast Modal */}
      {showMsgModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 520, padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Send Broadcast</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>Sending to {selectedIds.length} student(s)</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {msgTemplates.map(t => (<button key={t.label} type="button" className="btn btn-sm btn-secondary" style={{ borderRadius: 20 }} onClick={() => setMsgPayload({ ...msgPayload, subject: t.subject, message: t.message })}>{t.icon} {t.label}</button>))}
            </div>
            <form onSubmit={handleSendBroadcast}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Subject</label><input required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={msgPayload.subject} onChange={e => setMsgPayload({...msgPayload, subject: e.target.value})} /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600 }}>Message</label><textarea required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12, minHeight: 120, resize: 'vertical' }} value={msgPayload.message} onChange={e => setMsgPayload({...msgPayload, message: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={msgPayload.email} onChange={e => setMsgPayload({...msgPayload, email: e.target.checked})} /> <Mail size={14} /> Email</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={msgPayload.sms} onChange={e => setMsgPayload({...msgPayload, sms: e.target.checked})} /> <Smartphone size={14} /> SMS</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12, borderRadius: 12 }} onClick={() => setShowMsgModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }} disabled={isSending}>{isSending ? <><Loader size={16} className="spin" /> Sending...</> : <><Send size={16} /> Send</>}</button>
            </div></form>
          </div>
        </div>, document.body
      )}
    </AdminLayout>
  );
}

/* ─────────────────── SESSIONS ─────────────────── */
export function AdminSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ subject: '', teacher_id: '', expiry_hours: 1 });

  const fetchSessions = () => getAdminSessions().then(setSessions).catch(console.error);
  const fetchTeachers = () => getAdminTeachers().then(setTeachers).catch(console.error);
  useEffect(() => { fetchSessions(); fetchTeachers(); }, []);

  const handleSelectAll = (e) => { if (e.target.checked) setSelectedTokens(sessions.map(s => s.token)); else setSelectedTokens([]); };
  const handleSelect = (t) => { if (selectedTokens.includes(t)) setSelectedTokens(selectedTokens.filter(x => x !== t)); else setSelectedTokens([...selectedTokens, t]); };
  const handleBulkDelete = async () => { if (!selectedTokens.length || !window.confirm(`Delete ${selectedTokens.length} session(s)?`)) return; setIsDeleting(true); await Promise.all(selectedTokens.map(t => deleteAdminSession(t))).catch(console.error); setSelectedTokens([]); await fetchSessions(); setIsDeleting(false); };
  const handleDelete = async (token) => { if (window.confirm("Delete this session?")) { await deleteAdminSession(token).catch(console.error); fetchSessions(); } };
  const handleCreate = async (e) => { e.preventDefault(); try { await createAdminSession(formData); setShowAddModal(false); setFormData({ subject: '', teacher_id: '', expiry_hours: 1 }); fetchSessions(); } catch { alert('Failed'); } };

  return (
    <AdminLayout title="Sessions" subtitle="Session Registry & Management">
      <div className="dashboard-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="dashboard-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3>Session Registry</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(true)} style={{ borderRadius: 20 }}><Plus size={14} /> Create Session</button>
          <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', borderRadius: 20, opacity: selectedTokens.length ? 1 : .5 }} disabled={!selectedTokens.length || isDeleting} onClick={handleBulkDelete}>
            {isDeleting ? <><Loader size={14} className="spin" /> Deleting...</> : <><Trash2 size={14} /> Delete ({selectedTokens.length})</>}
          </button>
        </div>
      </div>
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <table className="data-table"><thead><tr>
          <th style={{ width: 40, textAlign: 'center' }}><input type="checkbox" onChange={handleSelectAll} checked={sessions.length > 0 && selectedTokens.length === sessions.length} /></th>
          <th>Subject</th><th>Teacher</th><th>Token</th><th>Status</th><th>Created</th><th>Actions</th>
        </tr></thead><tbody>
          {sessions.map(s => (
            <tr key={s.token} style={{ background: selectedTokens.includes(s.token) ? 'rgba(239,68,68,0.05)' : '' }}>
              <td style={{ textAlign: 'center' }}><input type="checkbox" checked={selectedTokens.includes(s.token)} onChange={() => handleSelect(s.token)} /></td>
              <td style={{ fontWeight: 600 }}>{s.subject}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{teachers.find(t => t.id === s.teacher_id)?.name || s.teacher_id?.slice(0,8)}</td>
              <td><code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontSize: 13 }}>{s.token.slice(0,8)}...</code></td>
              <td>{s.ended ? <span className="badge badge-gray">Ended</span> : s.started ? <span className="badge badge-success">Active</span> : <span className="badge badge-warning">Pending</span>}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.created_at).toLocaleString()}</td>
              <td><button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: 6 }} onClick={() => handleDelete(s.token)}><Trash2 size={16} /></button></td>
            </tr>
          ))}
          {sessions.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No sessions yet.</td></tr>}
        </tbody></table>
      </div></div>

      {showAddModal && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 450, padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 24, fontSize: 22, fontWeight: 700 }}>Create New Session</h3>
            <form onSubmit={handleCreate}><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Assign Teacher</label><select required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.teacher_id} onChange={e => setFormData({...formData, teacher_id: e.target.value})}><option value="">Select a Teacher...</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.email})</option>)}</select></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Subject</label><input required className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Computer Science" /></div>
              <div><label style={{ display: 'block', fontSize: 13, marginBottom: 6, fontWeight: 600, color: 'var(--text-secondary)' }}>Duration (Hours)</label><input required type="number" min="1" max="24" className="form-control" style={{ width: '100%', padding: '12px 16px', borderRadius: 12 }} value={formData.expiry_hours} onChange={e => setFormData({...formData, expiry_hours: parseInt(e.target.value)})} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: 12, borderRadius: 12 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Create Session</button>
            </div></form>
          </div>
        </div>, document.body
      )}
    </AdminLayout>
  );
}

/* ─────────────────── ATTENDANCE (detailed like teacher view) ─────────────────── */
export function AdminAttendancePage() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchRecords = () => getAdminAttendance().then(setRecords).catch(console.error);
  useEffect(() => { fetchRecords() }, []);

  const handleUpdate = async (id, status) => {
    try { await updateAdminAttendance(id, status); fetchRecords(); } catch { alert('Failed to update.'); }
  };

  const filtered = records.filter(r => {
    const matchesSearch = !search || (r.student_name || '').toLowerCase().includes(search.toLowerCase()) || (r.subject || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const fraud = records.filter(r => r.status === 'fraud').length;

  const handleExportExcel = () => {
    const safeDate = new Date().toISOString().slice(0, 10);
    const dataToExport = filtered.map((r, i) => ({
      'S.No.': i + 1,
      'Student Name': r.student_name || 'Unknown',
      'Roll No / ID': r.student_id,
      'Subject': r.subject,
      'Status': r.status.toUpperCase(),
      'Device ID': r.device_id || 'N/A',
      'Date & Time': new Date(r.timestamp).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Logs");
    XLSX.writeFile(wb, `Attendance_Logs_${safeDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const safeDate = new Date().toISOString().slice(0, 10);
    const doc = new jsPDF();
    doc.text("Attendance Logs", 14, 15);
    const tableData = filtered.map((r, i) => [
      i + 1, 
      r.student_name || 'Unknown', 
      r.subject, 
      r.status.toUpperCase(), 
      new Date(r.timestamp).toLocaleString()
    ]);
    doc.autoTable({
      head: [['#', 'Student', 'Subject', 'Status', 'Date & Time']],
      body: tableData,
      startY: 20,
    });
    doc.save(`Attendance_Logs_${safeDate}.pdf`);
  };

  return (
    <AdminLayout title="Attendance" subtitle="Detailed Attendance Records">
      {/* Stats row */}
      <div className="grid grid-4 gap-20" style={{ marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">Total Records</div><div className="stat-value">{records.length}</div></div>
        <div className="stat-card success"><div className="stat-label">Present</div><div className="stat-value" style={{ color: 'var(--success)' }}>{present}</div></div>
        <div className="stat-card danger"><div className="stat-label">Absent</div><div className="stat-value" style={{ color: 'var(--danger)' }}>{absent}</div></div>
        <div className="stat-card warning"><div className="stat-label">Flagged (Fraud)</div><div className="stat-value" style={{ color: 'var(--warning)' }}>{fraud}</div></div>
      </div>

      <div className="dashboard-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="dashboard-toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3>Attendance Logs</h3>
          {/* Filter pills */}
          {['all', 'present', 'absent', 'fraud'].map(f => (
            <button key={f} className={`btn btn-sm ${filterStatus === f ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: 20, textTransform: 'capitalize' }} onClick={() => setFilterStatus(f)}>
              {f === 'all' ? `All (${records.length})` : `${f} (${records.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>
        <div className="dashboard-toolbar-right" style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-sm btn-secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <span style={{ color: '#dc2626' }}>PDF</span> Export
          </button>
          <button className="btn btn-sm btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            <span style={{ color: '#16a34a' }}>Excel</span> Export
          </button>
          <div className="input-icon-wrap dashboard-toolbar-search" style={{ width: 220 }}>
            <Search size={15} className="icon" style={{ left: 14 }} />
            <input className="form-control" style={{ paddingLeft: 40, borderRadius: 20 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <table className="data-table"><thead><tr>
          <th>#</th><th>Student</th><th>Subject</th><th>Date / Time</th><th>Device</th><th style={{ width: 160 }}>Status</th>
        </tr></thead><tbody>
          {filtered.map((r, i) => (
            <tr key={r.id} style={{ background: r.status === 'fraud' ? 'rgba(239,68,68,0.04)' : '' }}>
              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 11, flexShrink: 0 }}>{(r.student_name || '??').split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.student_name || r.student_id?.slice(0, 8)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.student_id?.slice(0, 12)}</div>
                  </div>
                </div>
              </td>
              <td><span className="badge" style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,0.1)' }}>{r.subject}</span></td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(r.timestamp).toLocaleString()}</td>
              <td><code style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: 6, fontSize: 11 }}>{r.device_id?.slice(0, 12) || 'N/A'}</code></td>
              <td>
                <select
                  value={r.status}
                  onChange={(e) => handleUpdate(r.id, e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8, border: '2px solid',
                    borderColor: r.status === 'fraud' ? '#EF4444' : r.status === 'present' ? '#22C55E' : r.status === 'absent' ? '#F59E0B' : '#e2e8f0',
                    background: r.status === 'fraud' ? 'rgba(239,68,68,0.06)' : r.status === 'present' ? 'rgba(34,197,94,0.06)' : r.status === 'absent' ? 'rgba(245,158,11,0.06)' : 'white',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', outline: 'none',
                    color: r.status === 'fraud' ? '#dc2626' : r.status === 'present' ? '#16a34a' : r.status === 'absent' ? '#d97706' : '#333',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <option value="present">✓ Present</option>
                  <option value="absent">✗ Absent</option>
                  <option value="fraud">⚠ Fraud</option>
                </select>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</td></tr>}
        </tbody></table>
      </div></div>
    </AdminLayout>
  );
}

/* ─────────────────── COMMUNICATIONS ─────────────────── */
export function AdminCommsPage() {
  const [comms, setComms] = useState([]);
  const [selectedMsg, setSelectedMsg] = useState(null);

  useEffect(() => { getAdminComms().then(setComms).catch(console.error); }, []);

  return (
    <AdminLayout title="Communications" subtitle="Notification & Message Logs">
      {selectedMsg && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="card pop-in" style={{ width: '100%', maxWidth: 500, padding: 32, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: 12, fontSize: 20, fontWeight: 700 }}>Message Detail</h3>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              <strong>To:</strong> {selectedMsg.student_name} <br/>
              <strong>Subject:</strong> {selectedMsg.subject} <br/>
              <strong>Date:</strong> {new Date(selectedMsg.timestamp).toLocaleString()}
            </div>
            <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, fontSize: 14, whiteSpace: 'pre-wrap', color: '#333', border: '1px solid #e2e8f0', minHeight: 100 }}>{selectedMsg.message || "No body."}</div>
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-secondary" onClick={() => setSelectedMsg(null)}>Close</button></div>
          </div>
        </div>, document.body
      )}
      <h3 style={{ marginBottom: 20 }}>Notification Log</h3>
      <div className="card"><div className="card-body" style={{ padding: 0 }}>
        <table className="data-table"><thead><tr>
          <th>Type</th><th>Recipient</th><th>Subject</th><th>Status</th><th>Timestamp</th><th>Action</th>
        </tr></thead><tbody>
          {comms.map(c => (
            <tr key={c.id}>
              <td>
                {((c.type === 'email') && (c.subject === 'Admin Contact')) && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', color: '#475569', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}><MessageSquare size={14}/> Contact</span>}
                {c.type === 'sms' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}><Smartphone size={14}/> SMS</span>}
                {(c.type === 'email' && c.subject !== 'Admin Contact') && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}><Mail size={14}/> Email</span>}
                {c.type === 'contact' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', color: '#475569', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}><MessageSquare size={14}/> Contact</span>}
              </td>
              <td style={{ fontWeight: 600 }}>{c.student_name}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{c.subject}</td>
              <td>{c.status === 'sent' ? <span className="badge badge-success">Sent</span> : c.status === 'pending' ? <span className="badge badge-gray">Pending</span> : <span className="badge badge-danger">Failed</span>}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{new Date(c.timestamp).toLocaleString()}</td>
              <td><button className="btn btn-sm btn-secondary" onClick={() => setSelectedMsg(c)}>View</button></td>
            </tr>
          ))}
          {comms.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No logs yet.</td></tr>}
        </tbody></table>
      </div></div>
    </AdminLayout>
  );
}

/* ─────────────────── ADMINS ─────────────────── */
export function AdminAdminsPage() {
  return (
    <AdminLayout title="Admins" subtitle="Administrator Management">
      <div className="card"><div className="card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Admin management coming soon.
      </div></div>
    </AdminLayout>
  );
}

/* ─────────────────── DEFAULT EXPORT (Overview) ─────────────────── */
export default AdminOverviewPage;
