import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Clock, Users, CheckCircle, XCircle, AlertCircle, ArrowLeft, Play, Square, LayoutGrid, MapPin } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getTeacherDashboard, endSession, sendNotification, startAssignedSession, stopAssignedSession } from '../api/api';
import { useSocket } from '../hooks/useSocket';

export default function LiveAttendance() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [todaysSessions, setTodaysSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [ending, setEnding] = useState(false);
  const [endMsg, setEndMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [showGeoSetup, setShowGeoSetup] = useState(false);
  const [pendingSessionToken, setPendingSessionToken] = useState(null);
  const [geoConfig, setGeoConfig] = useState({ enabled: true, lat: '', lng: '', radius: 50 });
  const [geoLoading, setGeoLoading] = useState(false);

  const teacherId = user?.id || 't1';
  const userName = user?.name || 'Prof. Rajan Singh';

  // Fetch Dashboard items to get all sessions and attendance records
  const fetchData = async () => {
    try {
      const res = await getTeacherDashboard();
      const teacherSessions = (res.todaysSessions || []).filter(s => s.teacher_id === teacherId);
      setTodaysSessions(teacherSessions);

      // Pre-select if we came from QR generation with a token
      if (location.state?.token && !selectedSession) {
        const found = teacherSessions.find(s => s.token === location.state.token);
        if (found) selectSession(found, res);
      } else if (selectedSession) {
        // If we are refreshing active session
        const updatedSession = teacherSessions.find(s => s.token === selectedSession.token);
        if (updatedSession) selectSession(updatedSession, res);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  const selectSession = (session, dashboardData) => {
    setSelectedSession(session);
    setSessionActive(session.started && !session.ended);
    setEndMsg('');

    // Calculate elapsed time if session active
    const startedAt = session.started_at || session.created_at;
    if (session.started && !session.ended && startedAt) {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      setElapsed(Math.max(0, Math.floor((now - start) / 1000)));
    } else {
      setElapsed(0);
    }

    if (dashboardData) {
      const attendanceMap = {};
      const attendanceList = dashboardData.allAttendance || dashboardData.recentAttendance || [];
      attendanceList.forEach(a => {
        const recordToken = a?.location?.token;
        const matchesThisSession = recordToken && session?.token
          ? recordToken === session.token
          : a.subject === session.subject;

        if (!matchesThisSession) return;

        const sid = a.studentId || a.student_id;
        if (sid) attendanceMap[sid] = a.status;
      });
      const list = (dashboardData.students || []).map(s => ({
        ...s, status: attendanceMap[s.id] || 'pending'
      }));
      setStudents(list);
    }
  };

  const handleSelectSessionFromList = async (session) => {
    setLoading(true);
    try {
      const res = await getTeacherDashboard();
      const teacherSessions = (res.todaysSessions || []).filter(s => s.teacher_id === teacherId);
      setTodaysSessions(teacherSessions);
      selectSession(session, res);
    } finally {
      setLoading(false);
    }
  };

  // Teacher starts a pending session by opening GeoSetupModal
  const handleStartSession = (token) => {
    setPendingSessionToken(token);
    setGeoConfig({ enabled: true, lat: '', lng: '', radius: 50 });
    setShowGeoSetup(true);
    if (navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        pos => { setGeoConfig(p => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude })); setGeoLoading(false); },
        err => { alert('Failed to get location automatically. Provide manually or disable geofencing.'); setGeoLoading(false); },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const confirmStartSession = async () => {
    if (!pendingSessionToken) return;
    if (geoConfig.enabled && (!geoConfig.lat || !geoConfig.lng)) {
      alert('Please wait for GPS location or enter coordinates manually.');
      return;
    }
    try {
      setActionLoading(pendingSessionToken);
      setShowGeoSetup(false);
      await startAssignedSession({
        token: pendingSessionToken,
        latitude: geoConfig.enabled ? Number(geoConfig.lat) : undefined,
        longitude: geoConfig.enabled ? Number(geoConfig.lng) : undefined,
        radius: geoConfig.enabled ? Number(geoConfig.radius) : undefined,
      });
      // Refresh data
      const res = await getTeacherDashboard();
      const teacherSessions = (res.todaysSessions || []).filter(s => s.teacher_id === teacherId);
      setTodaysSessions(teacherSessions);
      const updated = teacherSessions.find(s => s.token === pendingSessionToken);
      if (updated) selectSession(updated, res);
    } catch (err) {
      alert('Failed to start session: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
      setPendingSessionToken(null);
    }
  };

  // Timer Logic
  useEffect(() => {
    if (!sessionActive || !selectedSession) return;
    const i = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(i);
  }, [sessionActive, selectedSession]);

  // Real-time updates
  useSocket(`teacher-${teacherId}`, {
    'attendance-update': (record) => {
      if (!selectedSession) return;
      const recordToken = record?.location?.token;
      const matchesThisSession = recordToken && selectedSession?.token
        ? recordToken === selectedSession.token
        : record.subject === selectedSession.subject;
      if (!matchesThisSession) return;

      setStudents(prev => prev.map(s =>
        s.id === record.studentId ? { ...s, status: record.status || 'present' } : s
      ));
    },
    'fraud-alert': (log) => {
      console.log('Fraud alert received:', log);
    }
  });

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const present = students.filter(s => s.status === 'present').length;
  const absent = students.filter(s => s.status === 'absent').length;
  const pending = students.filter(s => s.status === 'pending').length;

  const toggle = (id, newStatus) => setStudents(ss => ss.map(s => s.id === id ? { ...s, status: newStatus } : s));

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.roll.toLowerCase().includes(search.toLowerCase())
  );

  const handleEndSession = async () => {
    if (!window.confirm('End session? This will mark remaining students as ABSENT and notify parents.')) return;
    setEnding(true);
    try {
      setSessionActive(false);
      const activeToken = selectedSession.token;
      if (activeToken) {
        const manualState = students.map(s => ({ id: s.id, status: s.status, name: s.name }));
        const res = await endSession(activeToken, manualState);
        setEndMsg(`Session ended. ${res.absenteesCount} student(s) marked absent. ${res.notifications} parent notifications sent.`);
        setStudents(ss => ss.map(s => s.status === 'pending' ? { ...s, status: 'absent' } : s));
        setSelectedSession(prev => ({ ...prev, ended: true, started: false }));

        // Refresh session list
        fetchData();
      } else {
        const absentIds = students.filter(s => s.status === 'pending').map(s => s.id);
        if (absentIds.length > 0) {
          await sendNotification(absentIds, `Your ward was absent for today's class.`, ['email'], 'Absence Alert');
        }
        setStudents(ss => ss.map(s => s.status === 'pending' ? { ...s, status: 'absent' } : s));
        setEndMsg(`Session ended. ${absentIds.length} student(s) marked absent.`);
      }
    } catch (err) {
      setEndMsg('Error ending session: ' + (err.response?.data?.error || err.message));
    } finally {
      setEnding(false);
    }
  };

  // Render Session List UI
  if (!selectedSession) {
    return (
      <div className="app-layout">
        <Sidebar role="teacher" userName={userName} />
        <div className="main-content">
          <Topbar title="Live Sessions" subtitle="Select a class to manage attendance" userName={userName} />

          {/* Geo Setup Modal */}
          {showGeoSetup && createPortal(
            <div className="modal-backdrop" onClick={() => setShowGeoSetup(false)}>
              <div className="modal pop-in" style={{ width: '100%', maxWidth: 450 }} onClick={e => e.stopPropagation()}>
                <button className="btn-close" style={{ position: 'absolute', top: 24, right: 24, background: '#f1f5f9', color: '#64748b', borderRadius: '50%', border: 'none', padding: 6, opacity: 1, cursor: 'pointer' }} onClick={() => setShowGeoSetup(false)}>
                  <XCircle size={18} style={{ display: 'block' }} />
                </button>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <MapPin size={24} />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Session Geofencing</h3>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>Enable GPS validation to prevent proxy attendance.</p>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={geoConfig.enabled} onChange={e => setGeoConfig({...geoConfig, enabled: e.target.checked})} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                    Enforce Distance Limit
                  </label>
                </div>

                {geoConfig.enabled && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>Latitude {geoLoading && '(Loading...)'}</label>
                        <input className="form-control" type="number" step="any" value={geoConfig.lat} onChange={e => setGeoConfig({...geoConfig, lat: parseFloat(e.target.value)||''})} placeholder="e.g. 17.3850" style={{ width: '100%', borderRadius: 8, padding: '8px 12px' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>Longitude</label>
                        <input className="form-control" type="number" step="any" value={geoConfig.lng} onChange={e => setGeoConfig({...geoConfig, lng: parseFloat(e.target.value)||''})} placeholder="e.g. 78.4867" style={{ width: '100%', borderRadius: 8, padding: '8px 12px' }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>Allowed Radius (meters)</label>
                      <input className="form-control" type="number" value={geoConfig.radius} onChange={e => setGeoConfig({...geoConfig, radius: parseInt(e.target.value)||50})} style={{ width: '100%', borderRadius: 8, padding: '8px 12px' }} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => setShowGeoSetup(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={confirmStartSession} disabled={geoLoading}>
                    <Play size={16} /> Start Class
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          <div className="page-content fade-in">
            <div className="card">
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LayoutGrid size={18} /> Today's Classes
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading classes...</div>
                ) : todaysSessions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No sessions assigned for today. Contact the admin to create sessions.
                  </div>
                ) : (
                  todaysSessions.map((s, i) => {
                    const sessionTime = s.created_at ? new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    const isPending = !s.started && !s.ended;
                    const isActive = s.started && !s.ended;
                    const isEnded = s.ended;
                    const isActing = actionLoading === s.token;
                    return (
                      <div key={i} className="live-session-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: i < todaysSessions.length - 1 ? '1px solid var(--border)' : 'none', background: isActive ? 'rgba(34, 197, 94, 0.05)' : isPending ? 'rgba(245, 158, 11, 0.04)' : '' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: isEnded ? 'var(--bg-secondary)' : isActive ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: isEnded ? 'var(--text-muted)' : isActive ? 'var(--success)' : 'var(--warning)' }}>{sessionTime}</span>
                        </div>
                        <div className="live-session-meta" style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{s.subject}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {isPending ? 'Assigned — Not started yet' : isActive ? '🟢 Session in progress' : 'Session completed'}
                          </div>
                        </div>
                        <span className={`badge live-session-status ${isEnded ? 'badge-secondary' : isActive ? 'badge-success' : 'badge-warning'}`} style={{ marginRight: 12 }}>
                          {isEnded ? 'Ended' : isActive ? 'Live' : 'Pending'}
                        </span>
                        {isPending && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleStartSession(s.token)}
                            disabled={isActing}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                          >
                            {isActing ? '...' : <><Play size={14} /> Start Session</>}
                          </button>
                        )}
                        {isActive && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleSelectSessionFromList(s)}>
                            Manage Attendees
                          </button>
                        )}
                        {isEnded && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleSelectSessionFromList(s)}>
                            View Records
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If a pending session is selected, show a prompt to start it
  if (selectedSession && !selectedSession.started && !selectedSession.ended) {
    return (
      <div className="app-layout">
        <Sidebar role="teacher" userName={userName} />
        <div className="main-content">
          <Topbar title="Session Not Started" subtitle={`${selectedSession.subject}`} userName={userName} />
          <div className="page-content fade-in">
            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setSelectedSession(null); fetchData(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 20 }}>
              <ArrowLeft size={16} /> Back to Sessions
            </button>
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏸️</div>
              <h3 style={{ marginBottom: 8 }}>This session hasn't been started yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Start the session to begin taking attendance and generating QR codes.</p>
              <button
                className="btn btn-success btn-lg"
                onClick={() => handleStartSession(selectedSession.token)}
                disabled={actionLoading === selectedSession.token}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16, padding: '14px 32px' }}
              >
                {actionLoading === selectedSession.token ? 'Starting...' : <><Play size={18} /> Start Session</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Detailed Session UI (started or ended sessions)
  return (
    <div className="app-layout">
      <Sidebar role="teacher" userName={userName} />
      <div className="main-content">
        <Topbar title="Live Attendance" subtitle={selectedSession ? `${selectedSession.subject} · ${selectedSession.ended ? 'Ended' : 'Live Session'}` : 'Live Session'} userName={userName} />
        <div className="page-content fade-in">

          <div className="live-attendance-toolbar" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-icon btn-secondary btn-sm" onClick={() => { setSelectedSession(null); fetchData(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <ArrowLeft size={16} /> Back to Sessions
            </button>
            {!selectedSession.ended && (
              <button className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }} onClick={() => navigate('/qr-display', { state: { subject: selectedSession.subject } })}>
                Show QR Space
              </button>
            )}
          </div>

          {endMsg && (
            <div className="fade-in" style={{ background: 'var(--success-light)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={18} color="var(--success)" />
              <span style={{ fontWeight: 600, color: '#16a34a' }}>{endMsg}</span>
            </div>
          )}

          {/* Timer & Counters */}
          <div className="grid grid-4 mb-24">
            <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 12, filter: selectedSession.ended ? 'grayscale(1)' : 'none' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={22} color="var(--danger)" />
              </div>
              <div>
                <div className="stat-value" style={{ fontSize: 22 }}>{selectedSession.ended ? '--:--' : fmt(elapsed)}</div>
                <div className="stat-label">{selectedSession.ended ? 'Class Finished' : 'Session Time'}</div>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon success"><CheckCircle size={20} /></div>
              <div className="stat-value">{present}</div>
              <div className="stat-label">Present</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon danger"><XCircle size={20} /></div>
              <div className="stat-value">{absent}</div>
              <div className="stat-label">Absent</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon warning"><AlertCircle size={20} /></div>
              <div className="stat-value">{pending}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="card mb-24">
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>Attendance Progress</span>
                <span style={{ color: 'var(--text-muted)' }}>{present + absent}/{students.length} marked</span>
              </div>
              <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${students.length ? ((present + absent) / students.length) * 100 : 0}%`, background: 'linear-gradient(90deg,var(--primary),var(--success))', borderRadius: 999, transition: 'width .4s' }} />
              </div>
            </div>
          </div>

          {/* Student List */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><Users size={16} style={{ display: 'inline', marginRight: 6 }} />Students ({students.length})</span>
              <div className="input-icon-wrap" style={{ width: 220 }}>
                <Search size={14} className="icon" />
                <input className="form-control" style={{ height: 36, fontSize: 13 }} placeholder="Search name or roll…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              {loading ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading students…</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Student</th><th>Roll No</th><th>Status</th>{!selectedSession.ended && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>{s.name.split(' ').map(n => n[0]).join('')}</div>
                            <span style={{ fontWeight: 500 }}>{s.name}</span>
                          </div>
                        </td>
                        <td><code style={{ fontSize: 12 }}>{s.roll}</code></td>
                        <td>
                          <span className={`badge badge-dot ${s.status === 'present' ? 'badge-success' : s.status === 'absent' ? 'badge-danger' : 'badge-warning'}`}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </span>
                        </td>
                        {!selectedSession.ended && (
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-success btn-sm" onClick={() => toggle(s.id, 'present')}>✓</button>
                              <button className="btn btn-danger btn-sm" onClick={() => toggle(s.id, 'absent')}>✗</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {!selectedSession.ended && (
            <div className="live-attendance-footer-actions" style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button className="btn btn-danger btn-lg" onClick={handleEndSession} disabled={ending}>
                {ending ? 'Ending Session…' : '⏹ End Session & Mark Absentees'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
