import { useState, useEffect } from 'react';
import { Shield, MapPin, Smartphone, AlertTriangle, CheckCircle, XCircle, Lock } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { getFraudLogs, updateFraudStatus } from '../api/api';
import { useSocket } from '../hooks/useSocket';

const riskColor = s => s >= 75 ? 'var(--danger)' : s >= 50 ? 'var(--warning)' : 'var(--success)';
const riskBg = s => s >= 75 ? 'var(--danger-light)' : s >= 50 ? 'var(--warning-light)' : 'var(--success-light)';

function getCoords(location) {
  if (!location || typeof location !== 'object') return null;
  const lat = location.lat ?? location.latitude;
  const lng = location.lng ?? location.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function osmEmbedUrl(lat, lng) {
  const pad = 0.002; // ~200m box; enough context without being huge
  const left = lng - pad;
  const right = lng + pad;
  const top = lat + pad;
  const bottom = lat - pad;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${left},${bottom},${right},${top}`)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`;
}

export default function FraudDetection() {
  const { user } = useAuth();
  const [fraud, setFraud] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await getFraudLogs();
      setFraud(res.fraudLogs || []);
    } catch {
      console.error('Failed to load fraud logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  // Real-time: new fraud alerts
  const room = user?.role === 'admin' ? 'admins' : `teacher-${user?.id || 't1'}`;
  useSocket(room, {
    'fraud-alert': (log) => {
      setFraud(prev => [{ ...log, status: 'pending' }, ...prev]);
    }
  });

  const act = async (id, status) => {
    try {
      await updateFraudStatus(id, status);
      setFraud(ff => ff.map(f => f.id === id ? { ...f, status } : f));
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  const filtered = fraud.filter(f => filter === 'all' || f.status === filter);
  const pending = fraud.filter(f => f.status === 'pending').length;
  const approved = fraud.filter(f => f.status === 'approved').length;
  const rejected = fraud.filter(f => f.status === 'rejected').length;

  return (
    <div className="app-layout">
      <Sidebar role={user?.role || 'teacher'} userName={user?.name || 'Prof. Rajan Singh'} />
      <div className="main-content">
        <Topbar title="Fraud Detection" subtitle="Review suspicious attendance attempts" userName={user?.name || 'Prof. Rajan Singh'} />
        <div className="page-content fade-in">

          <div className="grid grid-3 mb-24">
            <div className="stat-card warning">
              <div className="stat-icon warning"><AlertTriangle size={20} /></div>
              <div className="stat-value">{pending}</div>
              <div className="stat-label">Pending Review</div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon success"><CheckCircle size={20} /></div>
              <div className="stat-value">{approved}</div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-icon danger"><XCircle size={20} /></div>
              <div className="stat-value">{rejected}</div>
              <div className="stat-label">Rejected</div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="fraud-filter-bar" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchLogs}>↻ Refresh</button>
          </div>

          {loading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading fraud logs…</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(f => (
              <div key={f.id} className="card fade-in" style={{ border: f.status === 'pending' ? '1.5px solid var(--warning)' : '' }}>
                <div className="card-body" style={{ padding: 20 }}>
                  {(() => {
                    const coords = getCoords(f.location);
                    return (
                  <div className="fraud-card-main" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div className="fraud-card-left" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div className="avatar" style={{ width: 44, height: 44, flexShrink: 0 }}>
                        {(f.studentName || 'UN').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{f.studentName || 'Unknown Student'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                          {new Date(f.timestamp).toLocaleString('en-IN')}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                            <AlertTriangle size={13} color="var(--danger)" />
                            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>{f.reason}</span>
                          </div>
                          {f.device && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                              <Smartphone size={13} />{f.device}
                            </div>
                          )}
                          {f.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                              <MapPin size={13} />
                              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : (typeof f.location === 'string' ? f.location : 'Location available')}
                            </div>
                          )}
                        </div>

                        {coords && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=18/${coords.lat}/${coords.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
                              >
                                Open in OpenStreetMap
                              </a>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                              </span>
                            </div>
                            <iframe
                              title={`Fraud location ${f.id}`}
                              src={osmEmbedUrl(coords.lat, coords.lng)}
                              style={{ width: '100%', height: 180, border: '1px solid var(--border)', borderRadius: 12 }}
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="fraud-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
                      <div style={{ background: riskBg(f.riskScore), borderRadius: 'var(--radius-sm)', padding: '6px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: riskColor(f.riskScore) }}>{f.riskScore}%</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>RISK SCORE</div>
                      </div>

                      {f.status === 'pending' ? (
                        <div className="fraud-card-actions" style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-success btn-sm" onClick={() => act(f.id, 'approved')}><CheckCircle size={13} /> Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => act(f.id, 'rejected')}><XCircle size={13} /> Reject</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => act(f.id, 'locked')}><Lock size={13} /></button>
                        </div>
                      ) : (
                        <span className={`badge ${f.status === 'approved' ? 'badge-success' : f.status === 'locked' ? 'badge-warning' : 'badge-danger'}`}>
                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                    );
                  })()}
                </div>
              </div>
            ))}
            {!loading && filtered.length === 0 && (
              <div className="empty-state"><Shield size={48} /><h3>No fraud alerts</h3><p>All attendance looks clean for this filter.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
