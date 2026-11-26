import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { loginWithCredentials, AuthError } from '../../auth/authService';

export default function LoginPage() {
  const navigate            = useNavigate();
  const { onLoginSuccess }  = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (password.length < 1) { setError('Please enter your password.'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      await loginWithCredentials(email.trim(), password);
      onLoginSuccess(email.trim());
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.kind === 'credentials') {
          setError('Email or password is incorrect. Please try again.');
        } else {
          setError('Unable to connect right now. Please try again.');
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      /* Soft sky-blue atmospheric gradient — matches reference image */
      background: 'linear-gradient(145deg, #C5DFF2 0%, #DAEcF8 30%, #EDF6FC 60%, #D6EAF5 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 62, height: 62, borderRadius: 16,
            background: '#FFFFFF',
            boxShadow: '0 4px 18px rgba(26,106,168,0.16)',
            marginBottom: 14, overflow: 'hidden',
            border: '1px solid #BDD9EE',
          }}>
            <img
              src="/darpan-logo.png"
              alt="DARPAN"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const p = el.parentElement as HTMLElement;
                p.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1A6FA8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
              }}
            />
          </div>
          <h1 style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800,
            fontSize: '1.75rem', color: '#0D2840',
            letterSpacing: '-0.025em', margin: 0, lineHeight: 1.1,
          }}>
            DARPAN
          </h1>
          <p style={{ color: '#4A6E8C', fontSize: '0.84rem', marginTop: 5, fontWeight: 400 }}>
            Energy Intelligence Platform
          </p>
        </div>

        {/* ── Login card ── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #C8DDED',
          borderRadius: 20,
          padding: '30px 28px',
          boxShadow: '0 4px 24px rgba(26,58,92,0.09), 0 1px 4px rgba(26,58,92,0.05)',
        }}>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700,
            fontSize: '1.1rem', color: '#0D2840', margin: '0 0 4px',
          }}>
            Welcome back
          </h2>
          <p style={{ color: '#5A7A96', fontSize: '0.83rem', margin: '0 0 22px' }}>
            Sign in to access your energy workspace
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: 'block', fontSize: '0.79rem', fontWeight: 500, color: '#2D4F6A', marginBottom: 5 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@oorjasync.in"
                autoComplete="email"
                autoFocus
                style={{
                  width: '100%', background: '#F5FAFE', border: '1px solid #C8DDED',
                  borderRadius: 10, padding: '10px 14px', fontSize: '0.875rem',
                  color: '#0D2840', outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  fontFamily: 'inherit',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,111,168,0.13)'; e.currentTarget.style.background = '#fff'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#C8DDED'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F5FAFE'; }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.79rem', fontWeight: 500, color: '#2D4F6A', marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{
                    width: '100%', background: '#F5FAFE', border: '1px solid #C8DDED',
                    borderRadius: 10, padding: '10px 40px 10px 14px', fontSize: '0.875rem',
                    color: '#0D2840', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#1A6FA8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,111,168,0.13)'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#C8DDED'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#F5FAFE'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6E91AE', display: 'flex', alignItems: 'center', padding: 2 }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Inline error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#B91C1C', marginBottom: 16, lineHeight: 1.5 }}
              >
                {error}
              </motion.div>
            )}

            {/* Sign In button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? '#92BCD6' : '#1A6FA8',
                color: '#fff', border: 'none', borderRadius: 10, padding: '11px',
                fontSize: '0.9rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 2px 8px rgba(26,111,168,0.28)',
                transition: 'all 0.16s', fontFamily: 'inherit',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#155D8E'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1A6FA8'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            {/* Forgot password */}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                type="button"
                onClick={() => alert('Password recovery is handled by your administrator.\nContact admin@oorjasync.in for assistance.')}
                style={{ background: 'none', border: 'none', color: '#4A7FA3', fontSize: '0.79rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        {/* Demo credentials hint */}
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.72)', border: '1px solid #C8DDED', borderRadius: 12, padding: '12px 16px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1A6FA8', marginBottom: 5 }}>
            🔑 Demo Credentials
          </div>
          <div style={{ fontSize: '0.78rem', color: '#2D5A7A', lineHeight: 1.65 }}>
            <span style={{ fontWeight: 600 }}>Email:</span> admin@oorjasync.in<br />
            <span style={{ fontWeight: 600 }}>Password:</span> Demo@2026<br />
            <span style={{ color: '#5A8FAA', fontSize: '0.7rem' }}>Or any valid email + 4+ character password</span>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.68rem', color: '#6E91AE' }}>
          DARPAN · Renewable Energy Intelligence
        </p>
      </motion.div>
    </div>
  );
}
