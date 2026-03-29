import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Mail, ArrowLeft, Loader } from 'lucide-react';
import api from '../api/api';

export default function ForgotPassword() {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: 'Please help me reset my password.' });
  const [contactStatus, setContactStatus] = useState('');

  const closeHelpPopup = () => {
    setShowHelpPopup(false);
    setContactStatus('');
    setContactForm({ name: '', email: '', message: 'Please help me reset my password.' });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus('loading');
    try {
      await api.post('/contact', contactForm);
      setContactStatus('success');
      setTimeout(() => closeHelpPopup(), 2000);
    } catch {
      setContactStatus('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Password changes are managed by your teacher/admin from their dashboard. Please send a direct request.');
    setError('');
    setShowHelpPopup(true);
  };

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
            Reset Password
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Password reset links are disabled. Contact your teacher/admin to change your password directly.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && <div className="error-msg fade-in">{error}</div>}
          {message && <div style={{ background: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: 8, fontSize: 14, textAlign: 'center' }} className="fade-in">{message}</div>}

          <div>
            <label className="form-label">Email or ID/Roll No</label>
            <div className="input-icon-wrap">
              <Mail className="icon" size={18} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Enter your email or ID" 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }}>
            Contact Teacher/Admin
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', padding: '12px', fontSize: 14 }}
            onClick={() => setShowHelpPopup(true)}
          >
            Contact Teacher/Admin to Change Password
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>

      {showHelpPopup && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card pop-in" style={{ width: '100%', maxWidth: 460, borderRadius: 16, padding: 24 }}>
            <h3 style={{ marginBottom: 8, fontSize: 20 }}>Contact Teacher/Admin</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 18 }}>
              You can request a direct password change from your teacher/admin.
            </p>

            {contactStatus === 'success' ? (
              <div style={{ padding: 16, borderRadius: 10, background: '#ecfdf5', color: '#047857', textAlign: 'center', fontWeight: 600 }}>
                Request sent successfully.
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Your Name</label>
                  <input
                    required
                    className="form-control"
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Your Email</label>
                  <input
                    required
                    className="form-control"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 13 }}>Message</label>
                  <textarea
                    required
                    className="form-control"
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                {contactStatus === 'error' && (
                  <div style={{ color: 'var(--danger)', fontSize: 12 }}>Failed to send request. Please try again.</div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeHelpPopup}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={contactStatus === 'loading'}>
                    {contactStatus === 'loading' ? <Loader className="spin" size={16} /> : 'Send Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
