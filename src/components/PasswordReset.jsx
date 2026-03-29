import React, { useState } from 'react';
import { sendPasswordResetEmail, auth } from '../firebase';
import { checkFirebaseConfig, testEmailService } from '../utils/firebase-config-check';

export default function PasswordReset({ onBack }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const checkConfig = async () => {
    console.log('🔍 Running Firebase Configuration Check...');
    checkFirebaseConfig();
    await testEmailService();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      // Validate email format first
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        setBusy(false);
        return;
      }

      console.log('=== Password Reset Debug ===');
      console.log('Email to reset:', email);
      console.log('Auth instance:', auth);
      console.log('Auth config:', auth.config);
      console.log('Auth settings:', auth.settings);
      console.log('Current user:', auth.currentUser);
      
      // Test if we can access Firebase services
      console.log('Testing Firebase connectivity...');
      
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent successfully!');
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      // Handle reCAPTCHA specific errors
      if (err.message.includes('_getRecaptchaConfig') || err.message.includes('recaptcha')) {
        setError('Authentication service is temporarily unavailable. Please try again in a few minutes.');
        return;
      }
      
      // Handle common Firebase auth errors
      const errorCode = err.code;
      let errorMessage = 'Something went wrong. Please try again.';
      
      switch (errorCode) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'auth/configuration-not-found':
          errorMessage = 'Authentication service is not properly configured.';
          break;
        case 'auth/auth-domain-config-required':
          errorMessage = 'Authentication domain configuration is missing.';
          break;
        default:
          // If it's a reCAPTCHA error, provide a more helpful message
          if (err.message && err.message.includes('recaptcha')) {
            errorMessage = 'Security verification failed. Please refresh the page and try again.';
          } else {
            errorMessage = err.message || errorMessage;
          }
      }
      
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  if (success) {
    return (
      <div className="card">
        <h2>Check Your Email</h2>
        <p>
          We've sent password reset instructions to <strong>{email}</strong>.
        </p>
        <p className="muted">
          Check your inbox (and spam folder) and follow the link to reset your password.
        </p>
        <div className="form-vertical">
          <button
            type="button"
            className="primary-button"
            onClick={onBack}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Reset Password</h2>
      <p className="muted">
        Enter your email address and we'll send you instructions to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className="form-vertical">
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
        </label>

        {error && <p className="error-text">{error}</p>}
        
        {/* Debug button for development */}
        {process.env.NODE_ENV === 'development' && (
          <button
            type="button"
            className="ghost-button"
            onClick={checkConfig}
            disabled={busy}
            style={{ fontSize: '12px', marginTop: '8px' }}
          >
            🔍 Debug Firebase Config
          </button>
        )}
        
        <div className="button-group">
          <button
            type="button"
            className="ghost-button"
            onClick={onBack}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="primary-button"
            disabled={busy || !email}
          >
            {busy ? 'Sending...' : 'Send Reset Email'}
          </button>
        </div>
      </form>
    </div>
  );
}
