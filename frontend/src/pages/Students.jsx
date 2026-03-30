import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UserPlus, Users, X, Mail, Phone, Hash, CheckCircle, ChevronRight, AlertTriangle, Trash2, Key } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getStudents, createStudent, deleteStudent, updateStudentPassword } from '../api/api';

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', roll: '', email: '', parent_phone: '', password: '' });
  const [addingStatus, setAddingStatus] = useState('');

  const userName = user?.name || 'Prof. Rajan Singh';

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getStudents();
      setStudents(res.students || []);
    } catch (e) {
      console.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setAddingStatus('adding');
    try {
      await createStudent({
        id: 's' + Math.floor(Math.random() * 100000), // temp ID generation
        ...newStudent
      });
      setAddingStatus('success');
      setTimeout(() => { 
        setShowAddStudent(false); 
        setNewStudent({ name: '', roll: '', email: '', parent_phone: '', password: '' }); 
        setAddingStatus(''); 
        fetchData(); 
      }, 1500);
    } catch (err) {
      console.error(err);
      setAddingStatus('error');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this student? All attendance records and logs will be lost.')) {
      try {
        await deleteStudent(id);
        fetchData();
      } catch (err) {
        console.error('Delete failed', err);
        alert('Failed to delete student');
      }
    }
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-layout">
      <Sidebar role="teacher" userName={userName} />
      <div className="main-content">
        <Topbar title="Student Directory" subtitle="Manage your class roster" userName={userName} />
        
        <div className="page-content fade-in">
          
          <div className="card students-hero" style={{ padding: '24px 32px', marginBottom: 24, backgroundImage: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Student Roster</h2>
              <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: 14 }}>Manage all students registered for this class.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '16px 24px', borderRadius: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{students.length}</div>
              <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Total Enrolled</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header students-toolbar" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px' }}>
              <span className="card-title" style={{ fontSize: 16 }}><Users size={18} style={{ display: 'inline', marginRight: 8, color: 'var(--primary)' }} />All Students</span>
              <div className="students-toolbar-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="input-icon-wrap students-toolbar-search" style={{ width: 260 }}>
                  <Search size={15} className="icon" style={{ left: 14 }} />
                  <input className="form-control" style={{ height: 40, fontSize: 13, paddingLeft: 40, borderRadius: 20, background: '#f8fafc', border: '1px solid transparent' }} placeholder="Search name or roll..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="btn btn-primary" style={{ height: 40, padding: '0 20px', borderRadius: 20, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center' }} onClick={() => setShowAddStudent(true)}>
                  <UserPlus size={16} /> Enroll Student
                </button>
              </div>
            </div>

            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 16px', width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  Loading student directory...
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>No students found matching your criteria.</div>
              ) : (
                <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px', padding: '0 24px 24px' }}>
                  <thead style={{ background: 'transparent' }}>
                    <tr>
                      <th style={{ background: 'transparent', border: 'none', paddingLeft: 16 }}>Student Info</th>
                      <th style={{ background: 'transparent', border: 'none' }}>Roll No</th>
                      <th style={{ background: 'transparent', border: 'none' }}>Contact Info</th>
                      <th style={{ background: 'transparent', border: 'none', textAlign: 'right', paddingRight: 16 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 12, cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => navigate(`/student/${s.id}`)} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}>
                        <td style={{ border: 'none', borderRadius: '12px 0 0 12px', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div className="avatar" style={{ width: 42, height: 42, fontSize: 16, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>{s.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{s.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Joined {new Date(s.created_at || Date.now()).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ border: 'none' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#475569' }}>
                            <Hash size={14} style={{ opacity: 0.5 }} /> {s.roll}
                          </span>
                        </td>
                        <td style={{ border: 'none' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Mail size={13} style={{ opacity: 0.6 }} /> {s.email || 'N/A'}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Phone size={13} style={{ opacity: 0.6 }} /> {s.parent_phone || 'No phone added'}
                            </div>
                          </div>
                        </td>
                        <td style={{ border: 'none', borderRadius: '0 12px 12px 0', paddingRight: '16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              className="btn btn-ghost"
                              style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', color: 'var(--text-secondary)' }}
                              onClick={async (e) => {
                                e.stopPropagation();
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
                                  alert(err.response?.data?.error || 'Failed to update password');
                                }
                              }}
                              title="Change Password"
                            >
                              <Key size={18} style={{ margin: '0 auto' }} />
                            </button>
                            <button className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', color: 'var(--danger)', opacity: 0.8 }} onClick={(e) => handleDelete(e, s.id)} title="Delete Student">
                              <Trash2 size={18} style={{ margin: '0 auto' }} />
                            </button>
                            <button className="btn btn-ghost" style={{ width: 36, height: 36, padding: 0, borderRadius: '50%', color: 'var(--primary)' }} onClick={(e) => { e.stopPropagation(); navigate(`/student/${s.id}`); }} title="View Profile">
                              <ChevronRight size={20} style={{ margin: '0 auto' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddStudent && createPortal(
        <div className="modal-backdrop" onClick={() => setShowAddStudent(false)}>
          <div className="modal pop-in" style={{ width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <button className="btn-close" style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', color: '#64748b', borderRadius: '50%', padding: 6, opacity: 1 }} onClick={() => setShowAddStudent(false)}>
              <X size={18} style={{ display: 'block' }} />
            </button>

            <div style={{ marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <UserPlus size={24} />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Enroll New Student</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Enter the details below to add a student to the roster.</p>
            </div>

            <div className="modal-content" style={{ padding: 0 }}>
              {addingStatus === 'success' ? (
                <div className="fade-in" style={{ padding: '20px 0', textAlign: 'center' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--success-light)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={40} color="var(--success)" />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Enrollment Successful</div>
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 15 }}>The student has been added to the system database.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="grid grid-2" style={{ gap: 16 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Full Legal Name</label>
                      <input type="text" style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', fontSize: 15, outline: 'none', transition: 'border 0.2s', background: '#f8fafc' }} placeholder="e.g. John Doe" required
                        value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Roll Number</label>
                      <input type="text" style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', fontSize: 15, outline: 'none', transition: 'border 0.2s', background: '#f8fafc' }} placeholder="e.g. 24CS001" required
                        value={newStudent.roll} onChange={e => setNewStudent({...newStudent, roll: e.target.value})}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Parent Phone (Optional)</label>
                      <input type="tel" style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', fontSize: 15, outline: 'none', transition: 'border 0.2s', background: '#f8fafc' }} placeholder="+91 9876543210"
                        value={newStudent.parent_phone} onChange={e => setNewStudent({...newStudent, parent_phone: e.target.value})}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Student Email Address</label>
                      <input type="email" style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', fontSize: 15, outline: 'none', transition: 'border 0.2s', background: '#f8fafc' }} placeholder="student@edu.com" required
                        value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                    <div style={{ gridColumn: 'span 1' }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Account Password</label>
                      <input type="password" style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', fontSize: 15, outline: 'none', transition: 'border 0.2s', background: '#f8fafc' }} placeholder="Create a password" required minLength="6"
                        value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})}
                        onFocus={e => e.target.style.borderColor = 'var(--primary)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                    </div>
                  </div>

                  {addingStatus === 'error' && (
                    <div style={{ padding: 12, background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} /> Failed to add student. Please verify the roll number or email are unique.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button type="button" style={{ flex: 1, height: 48, borderRadius: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setShowAddStudent(false)} onMouseOver={e=>e.target.style.background='#f1f5f9'} onMouseOut={e=>e.target.style.background='transparent'}>
                      Cancel
                    </button>
                    <button type="submit" style={{ flex: 1, height: 48, borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff', fontWeight: 600, cursor: addingStatus === 'adding' ? 'wait' : 'pointer', opacity: addingStatus === 'adding' ? 0.7 : 1, transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} disabled={addingStatus === 'adding'} onMouseOver={e=>e.target.style.background='#4f46e5'} onMouseOut={e=>e.target.style.background='var(--primary)'}>
                      {addingStatus === 'adding' ? 'Processing...' : 'Complete Enrollment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
