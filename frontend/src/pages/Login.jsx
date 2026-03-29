import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { createPortal } from 'react-dom';
import { Loader } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ id: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showContact, setShowContact] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState('');
  
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus('loading');
    try {
      await api.post('/contact', contactForm);
      setContactStatus('success');
      setTimeout(() => { setShowContact(false); setContactStatus(''); setContactForm({name:'', email:'', message:''}) }, 2500);
    } catch {
      setContactStatus('error');
    }
  };

  const handleLogin = async () => {
    if (!form.id || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');
    try {
      const user = await login(form.id, form.password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = e => { if (e.key === 'Enter') handleLogin(); };

  const features = [
    { icon: 'qr_code_scanner', title: 'Dynamic QR Scan', desc: 'Secure, time-bound QR codes that prevent location spoofing and ensure presence.' },
    { icon: 'verified_user', title: 'AI Fraud Prevention', desc: 'Advanced biometric and pattern analysis to eliminate proxy attendance.' },
    { icon: 'insights', title: 'Real-time Analytics', desc: 'Instant insight generation for faculty with automated reporting tools.' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f7f9fb', WebkitFontSmoothing: 'antialiased' }}>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>

        {/* ── LEFT: Branding & Features (60%) ── */}
        <section className="login-left-panel" style={{
          display: 'none', width: '60%', background: 'linear-gradient(135deg, #004ac6, #004ac6 60%, #2563eb)',
          padding: '64px', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative blurs */}
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: 600, height: 600, background: 'rgba(255,255,255,0.10)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: 400, height: 400, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' }} />

          {/* Top content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'white', fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 48, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 30 }}>qr_code_2</span>
              QRollCall
            </div>

            <h1 style={{ color: 'white', fontSize: 56, fontWeight: 800, lineHeight: 1.1, maxWidth: 600, marginBottom: 64, letterSpacing: '-0.03em' }}>
              Smart Attendance for <br /><span style={{ color: 'rgba(255,255,255,0.70)' }}>Modern Campuses</span>
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
              {features.map(f => (
                <div key={f.title} className="glass-feature-card" style={{
                  background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '24px',
                  display: 'flex', alignItems: 'flex-start', gap: 20, color: 'white',
                  transition: 'all 0.3s ease', cursor: 'default',
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.10)', padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.10)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{f.icon}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{f.title}</div>
                    <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom image */}
          <div style={{ position: 'relative', zIndex: 1, marginTop: 64, maxWidth: 600 }}>
            <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.10)' }}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlBhf4bcDC1Xa3epLAqWUTtFBa9Z01cWqYTn7k3q_pWAo-8m3GHZrqDOIOoKOlR7CtToVcb4hwjWYlg5rppnNyjvc1T_JqFi-b3cAGBK_exVw0lWCzlgDra0f0Q82s1g92VRXr_NjbsfRDKqXVH2KTGEqQu3n-pV7x0riYCY6fDgGG3nnMkUL9BVxNOI1ajG7P2cDhev-CH9R-P5MEH26uDx6nMiSJmQz1ftTH20iPEAM_0reMgG_j5AbKg5wZOo-X_Q9SANXsXqTA"
                alt="Campus Library"
                style={{ width: '100%', height: 256, objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </section>

        {/* ── RIGHT: Unified Login Form (40%) ── */}
        <section className="mobile-modern-wrap" style={{ width: '100%', flex: 1, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
          <div className="mobile-modern-shell login-form-shell" style={{ width: '100%', maxWidth: 380 }}>
            <div className="mobile-modern-chip" style={{ display: 'none' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>security</span>
              Smart Secure Access
            </div>

            <div className="mobile-modern-card" style={{ background: 'transparent' }}>

            {/* Mobile logo */}
            <div className="mobile-logo" style={{ display: 'none', color: '#004ac6', fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 48, alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28 }}>qr_code_2</span>
              QRollCall
            </div>

            {/* Header */}
            <div style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: 36, fontWeight: 700, color: '#191c1e', letterSpacing: '-0.02em', marginBottom: 12 }}>Welcome back</h2>
              <p style={{ color: '#434655', fontSize: 16, margin: 0 }}>Enter your credentials to access your dashboard.</p>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: '#ffdad6', color: '#93000a', padding: '12px 16px', borderRadius: 12, fontSize: 13, marginBottom: 20, fontWeight: 500, border: '1px solid rgba(186,26,26,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Email / ID field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#434655', paddingLeft: 4 }}>
                  Email or Roll Number
                </label>
                <input
                  id="email"
                  type="text"
                  style={{
                    width: '100%', padding: '16px 20px', borderRadius: 12,
                    border: '2px solid #f2f4f6', background: '#f2f4f6',
                    color: '#191c1e', fontSize: 15, fontFamily: "'Inter', sans-serif",
                    outline: 'none', transition: 'all .2s', boxSizing: 'border-box',
                  }}
                  placeholder="student@campus.edu or 22CS001"
                  value={form.id}
                  onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  onFocus={e => { e.target.style.borderColor = 'rgba(0,74,198,0.30)'; e.target.style.background = 'white'; }}
                  onBlur={e => { e.target.style.borderColor = '#f2f4f6'; e.target.style.background = '#f2f4f6'; }}
                />
              </div>

              {/* Password field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 4, paddingRight: 4 }}>
                  <label htmlFor="password" style={{ fontSize: 14, fontWeight: 600, color: '#434655' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowResetHelp(true)}
                    style={{ fontSize: 12, fontWeight: 700, color: '#004ac6', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    style={{
                      width: '100%', padding: '16px 52px 16px 20px', borderRadius: 12,
                      border: '2px solid #f2f4f6', background: '#f2f4f6',
                      color: '#191c1e', fontSize: 15, fontFamily: "'Inter', sans-serif",
                      outline: 'none', transition: 'all .2s', boxSizing: 'border-box',
                    }}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={handleKeyDown}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,74,198,0.30)'; e.target.style.background = 'white'; }}
                    onBlur={e => { e.target.style.borderColor = '#f2f4f6'; e.target.style.background = '#f2f4f6'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#434655', display: 'flex', alignItems: 'center', padding: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPass ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" id="remember" style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid #c3c6d7', accentColor: '#004ac6', cursor: 'pointer' }} />
                <label htmlFor="remember" style={{ fontSize: 14, fontWeight: 500, color: '#434655', cursor: 'pointer', userSelect: 'none' }}>Keep me logged in</label>
              </div>

              {/* Sign In */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="login-btn"
                  style={{
                    width: '100%', padding: '16px 24px', background: '#004ac6', color: 'white',
                    borderRadius: 9999, fontWeight: 700, fontSize: 18, border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 12px 24px rgba(0,74,198,0.20)',
                    transition: 'all .2s', fontFamily: "'Inter', sans-serif",
                    opacity: loading ? 0.8 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {loading
                    ? <><span style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin .8s linear infinite' }} /> Signing in…</>
                    : 'Sign In'
                  }
                </button>

                {/* Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(67,70,85,0.60)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Safe & Secure Authentication</span>
                </div>
              </div>
            </div>

            {/* Info card */}
            <div style={{ marginTop: 48, textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '16px 24px', borderRadius: 16, background: '#f2f4f6', border: '1px solid rgba(195,198,215,0.30)' }}>
                <p style={{ fontSize: 13, color: '#434655', margin: 0, lineHeight: 1.9 }}>
                  New to QRollCall? <br />
                  <button onClick={() => setShowContact(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#004ac6', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: 0 }}>
                    Contact Administration <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                  </button>
                </p>
              </div>
            </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: 'white', width: '100%', padding: '24px 0', borderTop: '1px solid #eceef0' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#004ac6' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>qr_code_2</span>
            QRollCall
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#737686' }}>
            © 2024 QRollCall. The Smart Campus Experience.
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {['Privacy', 'Terms', 'Support'].map(l => (
              <a key={l} href="#" className="footer-link" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#737686', textDecoration: 'none', transition: 'color .2s' }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>

      {showContact && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card pop-in" style={{ width: 400, borderRadius: 16, padding: 24 }}>
            <h3 style={{ marginBottom: 8, fontSize: 20 }}>Contact Administration</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Send an inquiry or request system access.</p>
            
            {contactStatus === 'success' ? (
              <div style={{ padding: 20, textAlign: 'center', background: '#ecfdf5', color: '#047857', borderRadius: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, marginBottom: 8 }}>check_circle</span>
                <p style={{ margin: 0, fontWeight: 600 }}>Message sent!</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Your Name</label>
                  <input required className="form-control" type="text" value={contactForm.name} onChange={e => setContactForm(f => ({...f, name: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Email Address</label>
                  <input required className="form-control" type="email" value={contactForm.email} onChange={e => setContactForm(f => ({...f, email: e.target.value}))} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Message</label>
                  <textarea required className="form-control" rows={4} value={contactForm.message} onChange={e => setContactForm(f => ({...f, message: e.target.value}))} />
                </div>
                {contactStatus === 'error' && <p style={{ color: 'red', fontSize: 12 }}>Failed to send message. Please try again.</p>}
                
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowContact(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={contactStatus === 'loading'}>
                    {contactStatus === 'loading' ? <Loader size={16} className="spin" /> : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {showResetHelp && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card pop-in" style={{ width: 400, borderRadius: 16, padding: 24 }}>
            <h3 style={{ marginBottom: 8, fontSize: 20 }}>Password Reset</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Password reset links are disabled. Contact your teacher/admin to reset your password directly.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowResetHelp(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowResetHelp(false);
                  setShowContact(true);
                  setContactForm(prev => ({
                    ...prev,
                    message: prev.message || 'Please reset my account password.'
                  }));
                }}
              >
                Contact Admin
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .login-left-panel { display: flex !important; }
          .mobile-logo { display: none !important; }
        }
        @media (max-width: 767px) {
          .mobile-logo { display: flex !important; }

          .mobile-modern-wrap {
            position: relative;
            padding: 18px 14px !important;
            background:
              radial-gradient(circle at 90% -5%, rgba(37,99,235,0.24), transparent 35%),
              radial-gradient(circle at -10% 105%, rgba(67,56,202,0.20), transparent 35%),
              linear-gradient(180deg, #eef3ff 0%, #f7faff 44%, #ffffff 100%) !important;
            overflow: hidden;
          }

          .mobile-modern-shell {
            width: 100% !important;
            max-width: 100% !important;
            position: relative;
            z-index: 1;
          }

          .mobile-modern-chip {
            display: inline-flex !important;
            align-items: center;
            gap: 6px;
            margin-bottom: 10px;
            padding: 7px 12px;
            border-radius: 999px;
            color: #1e3a8a;
            border: 1px solid rgba(37,99,235,.2);
            background: rgba(255,255,255,0.9);
            box-shadow: 0 8px 20px rgba(37,99,235,.12);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .03em;
            text-transform: uppercase;
          }

          .mobile-modern-card {
            background: rgba(255,255,255,0.86) !important;
            border: 1px solid rgba(37,99,235,0.14);
            border-radius: 24px;
            padding: 22px 16px 14px;
            box-shadow:
              0 16px 34px rgba(15, 23, 42, 0.12),
              inset 0 1px 0 rgba(255,255,255,0.55);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .mobile-modern-card h2 {
            font-size: 30px !important;
            line-height: 1.08 !important;
            letter-spacing: -0.025em !important;
            margin-bottom: 10px !important;
          }

          .mobile-modern-card .form-control,
          .mobile-modern-card input {
            min-height: 52px;
            border-radius: 14px !important;
            font-size: 15px !important;
            border-width: 1.5px !important;
          }

          .mobile-modern-card .login-btn {
            border-radius: 16px !important;
            min-height: 54px;
            font-size: 17px !important;
            box-shadow: 0 12px 24px rgba(0,74,198,0.26) !important;
          }

          .mobile-modern-card .btn {
            border-radius: 14px !important;
          }

          footer {
            padding: 16px 0 !important;
            background: transparent !important;
          }

          footer > div {
            padding: 0 12px !important;
            justify-content: center !important;
            gap: 10px !important;
          }
        }
        .glass-feature-card:hover {
          background: rgba(255,255,255,0.12) !important;
          border-color: rgba(255,255,255,0.20) !important;
          transform: translateY(-2px);
        }
        .login-btn:hover:not(:disabled) {
          background: #2563eb !important;
          transform: scale(1.01);
          box-shadow: 0 16px 32px rgba(0,74,198,0.30) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .footer-link:hover {
          color: #004ac6 !important;
        }

        @media (min-width: 768px) and (max-height: 900px) {
          .login-left-panel {
            padding: 34px 40px !important;
          }

          .login-left-panel h1 {
            font-size: 42px !important;
            margin-bottom: 28px !important;
            max-width: 520px !important;
          }

          .glass-feature-card {
            padding: 14px !important;
            gap: 12px !important;
          }

          .glass-feature-card div[style*="font-size: 18px"] {
            font-size: 15px !important;
          }

          .glass-feature-card p {
            font-size: 12px !important;
            line-height: 1.45 !important;
          }

          .login-left-panel img {
            height: 170px !important;
          }

          .mobile-modern-wrap {
            padding: 20px 22px !important;
          }

          .login-form-shell {
            max-width: 360px !important;
          }

          .login-form-shell h2 {
            font-size: 30px !important;
            margin-bottom: 8px !important;
          }

          .login-form-shell .form-control,
          .login-form-shell input {
            padding-top: 12px !important;
            padding-bottom: 12px !important;
          }

          .login-form-shell .login-btn {
            padding: 13px 18px !important;
            font-size: 16px !important;
          }

          footer {
            padding: 14px 0 !important;
          }
        }

        @media (min-width: 768px) and (max-height: 780px) {
          .login-left-panel {
            padding: 22px 30px !important;
          }

          .login-left-panel h1 {
            font-size: 34px !important;
            margin-bottom: 18px !important;
          }

          .login-left-panel img {
            height: 130px !important;
          }

          .glass-feature-card {
            padding: 10px !important;
          }

          .login-form-shell h2 {
            font-size: 26px !important;
          }

          .login-form-shell {
            max-width: 340px !important;
          }

          footer {
            padding: 10px 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
