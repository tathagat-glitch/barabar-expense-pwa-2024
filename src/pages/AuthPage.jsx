import React, { useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  db,
  doc,
  setDoc,
  serverTimestamp
} from '../firebase';
import PasswordReset from '../components/PasswordReset';
import { runAllTests } from '../utils/auth-test';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'));
    setError('');
  };

  const showPasswordReset = () => {
    setMode('reset');
    setError('');
  };

  const backToLogin = () => {
    setMode('login');
    setError('');
  };

  const runAuthTests = async () => {
    console.log('🧪 Running Authentication Diagnostics...');
    await runAllTests();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Client-side validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    
    if (mode === 'signup' && !username.trim()) {
      setError('Please enter a username.');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        console.log('🔍 Starting signup process');
        console.log('Email:', email);
        console.log('Username:', username);
        
        const usernameTrim = username.trim();
        if (!usernameTrim) {
          setError('Please enter a username');
          setBusy(false);
          return;
        }
        // Normalize to a key we can enforce uniqueness on.
        // Keep it simple: lowercase + no spaces.
        const usernameKey = usernameTrim.toLowerCase();
        console.log('Username key:', usernameKey);
        
        if (!/^[a-z0-9._]{2,20}$/.test(usernameKey)) {
          setError(
            'Username must be 2–20 chars and use only letters, numbers, "." or "_"'
          );
          setBusy(false);
          return;
        }

        console.log('📝 Creating user with Firebase Auth...');
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        console.log('✅ Firebase Auth user created:', cred.user.uid);

        console.log('📝 Reserving username in Firestore...');
        // Reserve username (unique) first. If taken, Firestore rules will deny.
        try {
          await setDoc(doc(db, 'usernames', usernameKey), {
            uid: cred.user.uid,
            createdAt: serverTimestamp()
          });
          console.log('✅ Username reserved successfully');
        } catch (err) {
          console.error('❌ Username reservation failed:', err);
          // If username is taken or rules deny, clean up the just-created auth user.
          try {
            await cred.user.delete();
            console.log('🗑️ Cleaned up auth user due to username conflict');
          } catch {
            // ignore cleanup errors
          }
          throw err;
        }

        console.log('📝 Creating user document...');
        await setDoc(doc(db, 'users', cred.user.uid), {
          email,
          username: usernameTrim,
          usernameKey,
          createdAt: serverTimestamp()
        });
        console.log('✅ User document created successfully');
      }
    } catch (err) {
      console.error('Auth error:', err);
      
      // Handle specific Firebase auth errors
      const errorCode = err.code;
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (mode === 'login') {
        // Login-specific errors
        switch (errorCode) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Invalid email or password. Please check your credentials.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = 'Login failed. Please check your email and password.';
        }
      } else {
        // Signup-specific errors
        console.error('❌ Signup failed:', {
          code: err.code,
          message: err.message,
          customData: err.customData
        });
        
        const msg = String(err?.message || '');
        if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
          errorMessage = 'Username already taken. Please choose another.';
        } else if (errorCode === 'auth/email-already-in-use') {
          errorMessage = 'An account with this email already exists. Try logging in instead.';
        } else if (errorCode === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please use at least 6 characters.';
        } else if (errorCode === 'auth/invalid-email') {
          errorMessage = 'Please enter a valid email address.';
        } else if (errorCode === 'auth/operation-not-allowed') {
          errorMessage = 'Email/password accounts are not enabled. Please contact support.';
        } else if (errorCode === 'auth/network-request-failed') {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (errorCode === 'auth/too-many-requests') {
          errorMessage = 'Too many signup attempts. Please try again later.';
        } else {
          errorMessage = err.message || 'Account creation failed. Please try again.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  // If in password reset mode, show the password reset component
  if (mode === 'reset') {
    return (
      <div className="auth-container">
        <PasswordReset onBack={backToLogin} />
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h1 className="page-title">
        {mode === 'login' ? 'Welcome back' : 'Create an account'}
      </h1>
      <div className="mode-indicator">
        <small className="muted">Current mode: <strong>{mode === 'login' ? 'Login' : 'Sign Up'}</strong></small>
      </div>
      <form className="card" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === 'signup' && (
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              required
              autoComplete="username"
              placeholder="How others will find you"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={2}
            />
          </label>
        )}
        <label className="field">
          <span>Password</span>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="password-toggle-button"
              onClick={togglePasswordVisibility}
              disabled={busy}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </label>
        {error && <p className="error-text">{error}</p>}
        
        {/* Debug button for development */}
        {process.env.NODE_ENV === 'development' && (
          <button
            type="button"
            className="ghost-button"
            onClick={runAuthTests}
            disabled={busy}
            style={{ fontSize: '12px', marginTop: '8px' }}
          >
            🧪 Debug Auth System
          </button>
        )}
        
        <div className="auth-buttons">
          {mode === 'login' ? (
            <>
              {/* First row: Log In and Forgot Password side by side */}
              <div className="first-row">
                <button className="primary-button" disabled={busy}>
                  {busy ? 'Please wait...' : 'Log in'}
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={showPasswordReset}
                  disabled={busy}
                >
                  Reset
                </button>
              </div>
              {/* Second row: Sign Up */}
              <div className="second-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={switchMode}
                  disabled={busy}
                >
                  Sign up
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Signup mode - just Sign Up button */}
              <div className="first-row">
                <button className="primary-button" disabled={busy}>
                  {busy ? 'Please wait...' : 'Sign up'}
                </button>
              </div>
              {/* Second row: Log In */}
              <div className="second-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={switchMode}
                  disabled={busy}
                >
                  Already have an account? Log in
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

