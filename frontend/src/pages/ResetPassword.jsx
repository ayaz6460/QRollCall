import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Loader } from 'lucide-react';
import api from '../api/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState({ accessToken: '', refreshToken: '' });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (type === 'recovery' && accessToken && refreshToken) {
      setRecovery({ accessToken, refreshToken });
      window.history.replaceState({}, document.title, '/reset-password');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const requestBody = {
        newPassword,
        ...(recovery.accessToken && recovery.refreshToken
          ? { accessToken: recovery.accessToken, refreshToken: recovery.refreshToken }
          : { token })
      };

      const data = await api.post('/reset-password', requestBody).then(r => r.data);

      setMessage(data.message);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasRecoveryTokens = Boolean(recovery.accessToken && recovery.refreshToken);

  if (!token && !hasRecoveryTokens) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2 style={{ color: 'var(--danger)', marginBottom: 16 }}>Invalid Link</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>The password reset link is invalid or expired.</p>
          <Link to="/forgot-password" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Try Again</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card slide-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="logo" style={{ justifyContent: 'center', marginBottom: 16 }}>
            <div className="logo-icon" style={{ background: 'var(--primary)', color: 'white', width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>qr_code_scanner</span>
            </div>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            New Password
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Enter your new password below.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div className="error-msg fade-in">{error}</div>}
          {message && <div style={{ background: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: 8, fontSize: 14, textAlign: 'center' }} className="fade-in">{message} Redirecting...</div>}

          <div>
            <label className="form-label">New Password</label>
            <div className="input-icon-wrap">
              <Lock className="icon" size={18} />
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Confirm Password</label>
            <div className="input-icon-wrap">
              <Lock className="icon" size={18} />
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }} disabled={loading || !!message}>
            {loading ? <Loader className="spin" size={18}/> : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
