import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Users, AlertTriangle, TrendingUp, Play, Square, Bell, ChevronRight, Shield, CheckCircle, MapPin, Loader2, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getTeacherDashboard, startAssignedSession, endSession } from '../api/api';
import { useSocket } from '../hooks/useSocket';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [data, setData] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Geofencing Modal State
  const [startConfig, setStartConfig] = useState(null); // { token, lat, lng, radius, loadingGeo }

  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await getTeacherDashboard();
      setData(res);
      setFraudAlerts(res.fraudAlerts?.slice(0, 3) || []);
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  useSocket(`teacher-${user?.id || 't1'}`, {
    'attendance-update': () => fetchDashboard(),
    'fraud-alert': (log) => {
      setFraudAlerts(prev => [{ ...log, time: 'just now' }, ...prev].slice(0, 3));
      setData(d => d ? { ...d, stats: { ...d.stats, fraudAlerts: (d.stats.fraudAlerts || 0) + 1 } } : d);
    },
  });

  const stats = data?.stats || { totalStudents: 0, presentToday: 0, attendancePercent: 0, fraudAlerts: 0 };
  const userName = user?.name || 'Prof. Rajan Singh';
  const teacherId = user?.id || 't1';

  const teacherSessions = (data?.todaysSessions || []).filter(s => s.teacher_id === teacherId);

  const handleOpenStartConfig = (token) => {
    setStartConfig({ token, lat: '', lng: '', radius: 20, loadingGeo: true, geoError: '' });
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setStartConfig(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude, loadingGeo: false })),
        (err) => setStartConfig(prev => ({ ...prev, loadingGeo: false, geoError: 'Failed to access location. Students will be checked against default campus location.' }))
      );
    } else {
      setStartConfig(prev => ({ ...prev, loadingGeo: false, geoError: 'Geolocation not supported by this browser.' }));
    }
  };

  const handleConfirmStart = async () => {
    if (!startConfig) return;
    try {
      setActionLoading(startConfig.token);
      await startAssignedSession({ 
        token: startConfig.token, 
        latitude: startConfig.lat, 
        longitude: startConfig.lng, 
        radius: startConfig.radius 
      });
      setStartConfig(null);
      await fetchDashboard();
    } catch (err) {
      alert('Failed to start session: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopSession = async (token) => {
    if (!window.confirm('Stop this session? Students will no longer be able to scan QR codes for this session.')) return;
    try {
      setActionLoading(token);
      await endSession(token, null);
      await fetchDashboard();
    } catch (err) {
      alert('Failed to stop session: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar role="teacher" userName={userName} />
      <div className="main-content"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div style={{ color: 'var(--text-muted)' }}>Loading dashboard…</div></div></div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar role="teacher" userName={userName} onLogout={logout} />
      <div className="main-content">
        <Topbar title="Teacher Dashboard" subtitle={time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} userName={userName} />
        <div className="page-content fade-in">

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Good {time.getHours() < 12 ? 'Morning' : 'Afternoon'}, {userName.split(' ')[0]}! 👨‍🏫</h2>
            <p className="text-muted text-sm mt-4">{user?.department || 'Computer Science'}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-4 mb-24">
            <div className="stat-card">
              <div className="stat-icon"><Users size={20} /></div>
              <div className="stat-value">{stats.totalStudents}</div>
              <div className="stat-label">Total Students</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon success"><CheckCircle size={20} /></div>
              <div className="stat-value">{stats.attendancePercent}%</div>
              <div className="stat-label">Avg Attendance</div>
              <div className="stat-change up">↑ {stats.presentToday} today</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon warning"><AlertTriangle size={20} /></div>
              <div className="stat-value">{stats.fraudAlerts}</div>
              <div className="stat-label">Fraud Alerts Today</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon danger"><TrendingUp size={20} /></div>
              <div className="stat-value">{data?.atRisk?.length || 0}</div>
              <div className="stat-label">At-Risk Students</div>
              <div className="stat-change down">Below 75%</div>
            </div>
          </div>

          <div className="grid grid-2 gap-20">
            {/* Today's Assigned Sessions */}
            <div className="card" style={{ gridColumn: 'span 1' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <QrCode size={18} /> My Sessions Today
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {teacherSessions.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No sessions assigned for today. Contact the admin to create sessions.
                  </div>
                )}
                {teacherSessions.map((s, i) => {
                  const sessionTime = new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const isPending = !s.started && !s.ended;
                  const isActive = s.started && !s.ended;
                  const isEnded = s.ended;
                  const isActing = actionLoading === s.token;

                  return (
                    <div key={i} className="teacher-session-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: i < teacherSessions.length - 1 ? '1px solid var(--border)' : 'none', background: isActive ? 'rgba(34, 197, 94, 0.06)' : isPending ? 'rgba(245, 158, 11, 0.04)' : '' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: isEnded ? 'var(--bg-secondary)' : isActive ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: isEnded ? 'var(--text-muted)' : isActive ? 'var(--success)' : 'var(--warning)' }}>{sessionTime}</span>
                      </div>
                      <div className="teacher-session-meta" style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.subject}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {isPending ? 'Assigned — Not started' : isActive ? '🟢 In progress' : 'Completed'}
                        </div>
                      </div>
                      <span className={`badge teacher-session-status ${isEnded ? 'badge-gray' : isActive ? 'badge-success' : 'badge-warning'}`} style={{ marginRight: 8 }}>
                        {isEnded ? 'Ended' : isActive ? 'Live' : 'Pending'}
                      </span>
                      <div className="teacher-session-actions" style={{ display: 'flex', gap: 6 }}>
                        {isPending && (
                          <button 
                            className="btn btn-success btn-sm" 
                            onClick={() => handleOpenStartConfig(s.token)} 
                            disabled={isActing}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                          >
                            {isActing ? '...' : <><Play size={13} /> Start</>}
                          </button>
                        )}
                        {isActive && (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/qr-display', { state: { subject: s.subject } })} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <QrCode size={13} /> QR
                            </button>
                            <button className="btn btn-sm" style={{ background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,0.15)' }} onClick={() => navigate('/live-attendance', { state: { token: s.token } })}>
                              <Users size={13} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => handleStopSession(s.token)} 
                              disabled={isActing}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                            >
                              {isActing ? '...' : <><Square size={13} /> Stop</>}
                            </button>
                          </>
                        )}
                        {isEnded && (
                          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/live-attendance', { state: { token: s.token } })} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header"><span className="card-title">Quick Actions</span></div>
              <div className="card-body" style={{ padding: 0 }}>
                {[
                  { icon: Shield, label: 'View Fraud Alerts', sub: `${stats.fraudAlerts} alerts`, path: '/fraud', color: 'var(--danger)' },
                  { icon: Bell, label: 'Send Notifications', sub: 'Email / SMS parents', path: '/notifications', color: 'var(--warning)' },
                  { icon: TrendingUp, label: 'Analytics Report', sub: 'Attendance trends', path: '/analytics', color: 'var(--success)' },
                  { icon: Users, label: 'Student Directory', sub: 'View & manage roster', path: '/students', color: 'var(--primary)' },
                ].map(({ icon: Icon, label, sub, path, color }) => (
                  <div key={path || label} className="nav-item" style={{ cursor: 'pointer', padding: '14px 20px', borderBottom: '1px solid var(--border)', borderRadius: 0 }} onClick={() => navigate(path)}>
                    <div style={{ width: 36, height: 36, background: `${color}18`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Fraud Alerts */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🚨 Recent Fraud Alerts</span>
                <button className="btn btn-sm btn-ghost" onClick={() => navigate('/fraud')}>View All</button>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {fraudAlerts.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No fraud alerts today ✅</div>
                )}
                {fraudAlerts.map((a, i) => (
                  <div key={a.id || i} className="teacher-fraud-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < fraudAlerts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 12 }}>
                      {a.studentName ? a.studentName.split(' ').map(n => n[0]).join('') : '??'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.studentName || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: 'var(--danger)' }}>{a.reason}</div>
                    </div>
                    <div className="teacher-fraud-meta" style={{ textAlign: 'right' }}>
                      <span className="badge badge-danger">{a.riskScore}% risk</span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{a.time || 'recently'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {startConfig && (
        <div className="modal-backdrop fade-in" style={{ background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal pop-in" style={{ maxWidth: 440, borderRadius: 20, padding: 32 }}>
            <button className="btn-close" style={{ position: 'absolute', top: 20, right: 20, background: '#f1f5f9', color: '#64748b', borderRadius: '50%', padding: 6 }} onClick={() => setStartConfig(null)}>
              <X size={18} />
            </button>
            <div style={{ marginBottom: 24, paddingRight: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <MapPin size={22} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Configure Session</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Lock down attendance to your current physical location.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Teacher Location</div>
                {startConfig.loadingGeo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> Locating your device...
                  </div>
                ) : startConfig.geoError ? (
                  <div style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 6, lineHeight: 1.4 }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {startConfig.geoError}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} color="var(--success)" /> Captured ({startConfig.lat?.toFixed(4)}, {startConfig.lng?.toFixed(4)})
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Allowed Scan Radius (Meters)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="range" min="5" max="200" step="5" style={{ flex: 1, accentColor: 'var(--primary)' }} value={startConfig.radius} onChange={e => setStartConfig({...startConfig, radius: Number(e.target.value)})} />
                  <div style={{ width: 60, textAlign: 'center', background: '#f1f5f9', padding: '6px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>
                    {startConfig.radius}m
                  </div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Students scanning the QR code must be within this distance from your location.</p>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1, height: 44 }} onClick={() => setStartConfig(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={handleConfirmStart} disabled={startConfig.loadingGeo}>
                  <Play size={16} /> Start Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
