import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Shield, AlertTriangle, CheckCircle, X, Send, Save, Download } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { ProgressRing } from './StudentDashboard';
import { getStudent, getStudentAttendanceHistory, sendNotification, updateStudent } from '../api/api';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function StudentDetail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();
  
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notification Modal State
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifTemplate, setNotifTemplate] = useState('custom');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSms, setSendSms] = useState(true);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  const templates = [
    { id: 'custom', label: 'Custom Message', text: '' },
    { id: 'low_attendance', label: 'Low Attendance Warning', text: 'This is to inform you that {name} has fallen below the required 75% attendance threshold. Please ensure regular attendance to avoid disciplinary action.' },
    { id: 'exam_reminder', label: 'Upcoming Exam Reminder', text: 'Reminder: {name} has an upcoming examination next week. Please ensure they are adequately prepared.' },
    { id: 'excellent', label: 'Excellent Performance', text: 'We are pleased to inform you that {name} has been showing excellent performance and perfect attendance in recent sessions.' }
  ];

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', roll: '', email: '', parent_phone: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Reusable loader
  const loadProfile = async () => {
    try {
      const [studentRes, historyRes] = await Promise.all([
        getStudent(id),
        getStudentAttendanceHistory(id)
      ]);
      setStudent(studentRes.student);
      setEditForm({
        name: studentRes.student.name || '',
        roll: studentRes.student.roll || '',
        email: studentRes.student.email || '',
        parent_phone: studentRes.student.parent_phone || ''
      });
      const hist = historyRes.history || [];
      setHistory(hist);

        // Compute subject stats
        const subMap = {};
        hist.forEach(rec => {
          if (!subMap[rec.subject]) subMap[rec.subject] = { present: 0, total: 0 };
          subMap[rec.subject].total += 1;
          if (rec.status === 'present') subMap[rec.subject].present += 1;
        });

        const subArr = Object.keys(subMap).map(name => {
          const { present, total } = subMap[name];
          return { name, present, total, pct: Math.round((present / total) * 100) };
        });
        setSubjects(subArr);

      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
    if (id) loadProfile();
  }, [id]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading student profile...</div>;
  if (!student) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>Student not found.</div>;

  const handleExportPDF = () => {
    if (!student) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const safeDate = new Date().toISOString().slice(0, 10);
    let yPos = 15;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Student Profile Report', 14, 18);
    yPos = 30;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Student Information', 14, yPos);
    yPos += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${student.name}`, 14, yPos);
    yPos += 5;
    doc.text(`Roll No: ${student.roll}`, 14, yPos);
    yPos += 5;
    doc.text(`Email: ${student.email || 'N/A'}`, 14, yPos);
    yPos += 5;
    doc.text(`Parent Phone: ${student.parent_phone || 'N/A'}`, 14, yPos);
    yPos += 5;
    doc.text(`ID: ${student.id}`, 14, yPos);
    yPos += 10;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Attendance Summary', 14, yPos);
    yPos += 7;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const overall = subjects.length > 0 ? Math.round(subjects.reduce((s,x)=>s+x.pct,0)/subjects.length) : 0;
    doc.text(`Overall Attendance: ${overall}%`, 14, yPos);
    yPos += 5;
    doc.text(`Risk Level: ${overall >= 75 ? 'Low' : overall >= 60 ? 'Medium' : 'High'}`, 14, yPos);
    yPos += 10;

    if (subjects.length > 0) {
      const tableData = subjects.map(s => [s.name, s.present, s.total, `${s.pct}%`]);
      doc.autoTable({startY: yPos, head: [['Subject', 'Present', 'Total', 'Percentage']], body: tableData, theme: 'grid', headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' }, margin: { left: 14, right: 14 }});
    }

    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${safeDate}`, 14, pageHeight - 10);
    doc.save(`${student.name}_Profile_${safeDate}.pdf`);
  };

  const overall = subjects.length > 0 ? Math.round(subjects.reduce((s,x)=>s+x.pct,0)/subjects.length) : 0;
  const riskLevel = overall >= 75 ? 'Low' : overall >= 60 ? 'Medium' : 'High';
  const riskBadge = overall >= 75 ? 'badge-success' : overall >= 60 ? 'badge-warning' : 'badge-danger';

  const handleTemplateChange = (e) => {
    const id = e.target.value;
    setNotifTemplate(id);
    const tpl = templates.find(t => t.id === id);
    if (tpl) setNotifMessage(tpl.text);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifMessage.trim()) return;
    if (!sendEmail && !sendSms) {
      alert('Must select at least one channel (Email or SMS)');
      return;
    }

    setSendingNotif(true);
    try {
      const channels = [];
      if (sendEmail) channels.push('email');
      if (sendSms) channels.push('sms');

      await sendNotification([student.id], notifMessage, channels, 'Teacher Notification');
      setNotifSuccess(true);
      setTimeout(() => {
        setShowNotifModal(false);
        setNotifSuccess(false);
        setNotifMessage('');
        setNotifTemplate('custom');
      }, 2000);
    } catch (err) {
      alert('Failed to send notification');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateStudent(student.id, editForm);
      await loadProfile();
      setShowEditModal(false);
    } catch (err) {
      alert('Failed to update student profile. Check roll or email uniqueness.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar role={user?.role || 'teacher'} userName={user?.name || 'Prof. Rajan Singh'} />
      <div className="main-content">
        <Topbar title="Student Detail" subtitle="View attendance profile" userName={user?.name || 'Prof. Rajan Singh'} />
        <div className="page-content fade-in">

          <button className="btn btn-secondary btn-sm mb-24" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>

          <div className="grid grid-2 gap-20 mb-24">
            {/* Profile Card */}
            <div className="card">
              <div className="card-body student-detail-profile" style={{ display:'flex', gap:24, alignItems:'flex-start' }}>
                <div className="avatar" style={{ width:72, height:72, fontSize:26, flexShrink:0, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {student.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>{student.name}</h2>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
                    <span className="badge badge-primary">Roll: {student.roll}</span>
                    <span className="badge badge-gray">{student.id}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)' }}>
                      <Mail size={14} /><a href={`mailto:${student.email}`} style={{ color:'var(--primary)' }}>{student.email || 'No email provided'}</a>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-secondary)' }}>
                      <Phone size={14} /><span>{student.parent_phone ? `${student.parent_phone} (Parent)` : 'No phone linked'}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                      <Shield size={14} color={overall>=75?'var(--success)':'var(--danger)'} />
                      <span>Risk: </span>
                      <span className={`badge ${riskBadge}`}>{riskLevel} Risk</span>
                    </div>
                  </div>
                  <div className="student-detail-actions" style={{ display:'flex', gap:10, marginTop:16 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowNotifModal(true)}>Send Notification</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(true)}>Edit Profile</button>
                    <button className="btn btn-ghost btn-sm" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Export PDF</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => document.getElementById('hist-section').scrollIntoView({ behavior: 'smooth' })}>View History</button>
                  </div>
                </div>
                <ProgressRing pct={overall} size={90} />
              </div>
            </div>

            {/* Subject Breakdown */}
            <div className="card">
              <div className="card-header"><span className="card-title">Subject Attendance</span></div>
              <div className="card-body">
                {subjects.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No recorded attendance data to display.</div>
                ) : subjects.map(s => (
                  <div key={s.name} style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:5, alignItems:'center' }}>
                      <span style={{ fontWeight:500 }}>{s.name}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.present}/{s.total}</span>
                        <span style={{ fontWeight:700, color: s.pct>=75?'var(--success)':s.pct>=60?'var(--warning)':'var(--danger)', minWidth:34, textAlign:'right' }}>{s.pct}%</span>
                        {s.pct < 75 && <AlertTriangle size={12} color="var(--warning)" />}
                      </div>
                    </div>
                    <div style={{ height:7, background:'var(--bg-secondary)', borderRadius:999 }}>
                      <div style={{ height:'100%', width:`${s.pct}%`, background: s.pct>=75?'var(--success)':s.pct>=60?'var(--warning)':'var(--danger)', borderRadius:999, transition:'width .6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attendance History */}
          <div id="hist-section" className="card">
            <div className="card-header">
              <span className="card-title">Attendance History</span>
              <span className="badge badge-gray">Last 6 records</span>
            </div>
            <div className="table-wrap" style={{ border:'none' }}>
              <table>
                <thead><tr><th>Date</th><th>Day</th><th>Subject</th><th>Status</th></tr></thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No attendance history found.</td>
                    </tr>
                  ) : history.map((h, i) => {
                    const dt = new Date(h.timestamp);
                    const dateStr = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                    const dayStr = dt.toLocaleDateString('en-GB', { weekday: 'long' });
                    return (
                    <tr key={i}>
                      <td style={{ fontWeight:500 }}>{dateStr}</td>
                      <td style={{ color:'var(--text-muted)' }}>{dayStr}</td>
                      <td>{h.subject || 'All Subjects'}</td>
                      <td>
                        {h.status === 'holiday' ? (
                          <span className="badge badge-gray">Holiday</span>
                        ) : h.status === 'present' ? (
                          <span className="badge badge-success badge-dot">Present</span>
                        ) : (
                          <span className="badge badge-danger badge-dot">Absent</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Notification Modal */}
      {showNotifModal && (
        <div className="modal-backdrop" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="modal pop-in" style={{ maxWidth: 520, borderRadius: 24, padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button className="btn-close" style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', color: '#64748b', borderRadius: '50%', padding: 6 }} onClick={() => setShowNotifModal(false)}>
              <X size={18} />
            </button>

            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Send size={22} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Contact Parent</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Send an official email alert regarding {student.name}.</p>
            </div>

            {notifSuccess ? (
              <div className="fade-in" style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success-light)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={40} color="var(--success)" />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Email Sent!</div>
                <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 15 }}>The notification has been dispatched to {student.email}.</p>
              </div>
            ) : (
              <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Select Template</label>
                  <select 
                    className="form-control" 
                    style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', fontSize: 14, background: '#f8fafc', outline: 'none' }}
                    value={notifTemplate}
                    onChange={handleTemplateChange}
                  >
                    {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Message Body</label>
                  <textarea 
                    id="notif-textarea"
                    style={{ width: '100%', minHeight: 140, borderRadius: 12, border: '1px solid var(--border)', padding: '14px', fontSize: 14, lineHeight: 1.6, background: '#f8fafc', outline: 'none', resize: 'vertical' }}
                    placeholder="Type your custom message here..."
                    value={notifMessage}
                    onChange={e => setNotifMessage(e.target.value)}
                    required
                  />
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Insert variable:</span>
                    <button type="button" onClick={() => {
                      const txt = document.getElementById('notif-textarea');
                      if (txt) {
                        const start = txt.selectionStart;
                        const end = txt.selectionEnd;
                        setNotifMessage(prev => prev.substring(0, start) + '{name}' + prev.substring(end));
                        setTimeout(() => { txt.focus(); txt.setSelectionRange(start + 6, start + 6); }, 0);
                      } else {
                        setNotifMessage(prev => prev + ' {name}');
                      }
                    }} style={{ background: '#e2e8f0', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', transition: 'background 0.2s' }} onMouseOver={e=>e.target.style.background='#cbd5e1'} onMouseOut={e=>e.target.style.background='#e2e8f0'}>
                      {'{name}'}
                    </button>
                  </div>
                </div>

                <div className="student-detail-channel-row" style={{ display: 'flex', gap: 24, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                    Send via Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                    Send via SMS
                  </label>
                </div>

                <div className="student-detail-modal-actions" style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" style={{ flex: 1, height: 48, borderRadius: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowNotifModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, cursor: sendingNotif ? 'wait' : 'pointer', opacity: sendingNotif ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={sendingNotif}>
                    {sendingNotif ? 'Sending...' : <><Send size={16} /> Send Email</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-backdrop" style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="modal pop-in" style={{ maxWidth: 460, borderRadius: 24, padding: 32, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button className="btn-close" style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', color: '#64748b', borderRadius: '50%', padding: 6 }} onClick={() => setShowEditModal(false)}>
              <X size={18} />
            </button>
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Save size={22} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Edit Student Details</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Update {student.name}'s official records.</p>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div className="student-edit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input type="text" className="form-control" value={editForm.roll} onChange={e => setEditForm({ ...editForm, roll: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Parent Phone</label>
                  <input type="text" className="form-control" placeholder="+1..." value={editForm.parent_phone} onChange={e => setEditForm({ ...editForm, parent_phone: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>

              <div className="student-detail-modal-actions" style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" style={{ flex: 1, height: 48, borderRadius: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, cursor: savingEdit ? 'wait' : 'pointer', opacity: savingEdit ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
