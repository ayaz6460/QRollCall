import { useState, useEffect } from 'react';
import { Send, Mail, MessageSquare, Users, CheckCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getStudents, sendNotification, getNotifications } from '../api/api';

const TEMPLATES = [
  { id: 't1', label: 'Absence Alert', text: 'Dear Parent, your ward {name} was absent today from class. Please ensure regular attendance.' },
  { id: 't2', label: 'Low Attendance Warning', text: "Dear Parent, {name}'s attendance has dropped below 75% in one or more subjects. Immediate improvement is required." },
  { id: 't3', label: 'Exam Eligibility Risk', text: 'Dear Parent, {name} is at risk of being declared ineligible for exams due to low attendance. Please contact the institution.' },
  { id: 't4', label: 'Custom', text: '' },
];

export default function Notifications() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState(TEMPLATES[0].text);
  const [channels, setChannels] = useState({ email: true, sms: false });
  const [template, setTemplate] = useState('t1');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    Promise.all([getStudents(), getNotifications()]).then(([s, n]) => {
      setStudents(s.students || []);
      setRecent((n.notifications || []).slice(0, 8));
    }).catch(console.error);
  }, []);

  const toggleStudent = id => setSelected(ss => ss.includes(id) ? ss.filter(s => s !== id) : [...ss, id]);
  const selectAll = () => setSelected(selected.length === students.length ? [] : students.map(s => s.id));

  const handleTemplate = (id) => {
    setTemplate(id);
    const t = TEMPLATES.find(t => t.id === id);
    if (t.text) setMessage(t.text);
    else setMessage('');
  };

  const handleSend = async () => {
    if (!selected.length || !message) return;
    setSending(true);
    setResult(null);
    try {
      const channelList = Object.entries(channels).filter(([, v]) => v).map(([k]) => k);
      const res = await sendNotification(
        selected,
        message,
        channelList,
        TEMPLATES.find(t => t.id === template)?.label || 'Notification'
      );
      setResult({ success: true, msg: `Sent to ${res.sent} student(s) successfully!` });
      // Refresh recent
      const n = await getNotifications();
      setRecent((n.notifications || []).slice(0, 8));
      setSelected([]);
    } catch (err) {
      setResult({ success: false, msg: err.response?.data?.error || 'Failed to send.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar role="teacher" userName={user?.name || 'Prof. Rajan Singh'} />
      <div className="main-content">
        <Topbar title="Notifications" subtitle="Send messages to students & parents" userName={user?.name || 'Prof. Rajan Singh'} />
        <div className="page-content fade-in">

          {result && (
            <div className="fade-in" style={{ background: result.success ? 'var(--success-light)' : 'var(--danger-light)', border: `1px solid ${result.success ? 'var(--success)' : 'var(--danger)'}`, borderRadius: 'var(--radius-md)', padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              {result.success ? <CheckCircle size={18} color="var(--success)" /> : <span>⚠️</span>}
              <span style={{ fontWeight: 600, color: result.success ? '#16a34a' : 'var(--danger)' }}>{result.msg}</span>
            </div>
          )}

          <div className="grid grid-2 gap-20">
            {/* Compose Panel */}
            <div className="card">
              <div className="card-header"><span className="card-title">Compose Message</span></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Template</label>
                  <select className="form-control" value={template} onChange={e => handleTemplate(e.target.value)}>
                    {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Message <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(use {'{name}'} for student name)</span></label>
                  <textarea className="form-control" rows={5} value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Type your message here…" />
                </div>
                <div className="form-group">
                  <label className="form-label">Channels</label>
                  <div className="notification-channels" style={{ display: 'flex', gap: 12 }}>
                    {[{ key: 'email', icon: Mail, label: 'Email' }, { key: 'sms', icon: MessageSquare, label: 'SMS' }].map(({ key, icon: Icon, label }) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 16px', border: `1.5px solid ${channels[key] ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: channels[key] ? 'var(--primary-light)' : '', transition: 'var(--transition)', flex: 1, justifyContent: 'center' }}>
                        <input type="checkbox" checked={channels[key]} onChange={() => setChannels(c => ({ ...c, [key]: !c[key] }))} style={{ display: 'none' }} />
                        <Icon size={15} color={channels[key] ? 'var(--primary)' : 'var(--text-muted)'} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: channels[key] ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary w-full btn-lg" onClick={handleSend}
                  disabled={!selected.length || !message || (!channels.email && !channels.sms) || sending}>
                  {sending ? '⏳ Sending…' : <><Send size={16} /> Send to {selected.length} Student{selected.length !== 1 ? 's' : ''}</>}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Student Selector */}
              <div className="card">
                <div className="card-header">
                  <span className="card-title"><Users size={15} style={{ display: 'inline', marginRight: 6 }} />Select Students</span>
                  <button className="btn btn-sm btn-ghost" onClick={selectAll}>{selected.length === students.length ? 'Deselect All' : 'Select All'}</button>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {students.map((s, i) => {
                    const isSelected = selected.includes(s.id);
                    return (
                      <div key={s.id} className="notification-student-row" onClick={() => toggleStudent(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < students.length - 1 ? '1px solid var(--border)' : 'none', background: isSelected ? 'var(--primary-light)' : '', cursor: 'pointer', transition: 'var(--transition)' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--primary)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isSelected && <CheckCircle size={11} color="white" />}
                        </div>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{s.name.split(' ').map(n => n[0]).join('')}</div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.roll} · {s.email}</div>
                        </div>
                      </div>
                    );
                  })}
                  {students.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading students…</div>}
                </div>
              </div>

              {/* Recent Notifications */}
              <div className="card">
                <div className="card-header"><span className="card-title">Recent Sent</span></div>
                <div className="card-body" style={{ padding: 0 }}>
                  {recent.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications sent yet.</div>}
                  {recent.map((n, i) => (
                    <div key={n.id || i} className="notification-recent-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: n.type === 'email' ? 'var(--primary-light)' : 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {n.type === 'email' ? <Mail size={14} color="var(--primary)" /> : <MessageSquare size={14} color="var(--warning)" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{n.studentName || n.studentId}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.type} · {new Date(n.timestamp).toLocaleString('en-IN')}</div>
                      </div>
                      <span className={`badge ${n.status === 'sent' ? 'badge-success' : n.status?.startsWith('sent') ? 'badge-success' : 'badge-danger'}`}>{n.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
