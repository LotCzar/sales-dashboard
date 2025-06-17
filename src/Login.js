import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db } from './firebase.js';
import { doc, getDoc } from 'firebase/firestore';
import './App.css';

function Login({ onLogin, onShowRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const auth = getAuth();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user profile from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('User profile not found. Please contact support.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const companyId = userData.companyId;
      const companyName = userData.companyName || '';

      if (!companyId) {
        setError('No company associated with this account. Please contact support.');
        setLoading(false);
        return;
      }

      // Store user data in localStorage
      localStorage.setItem('companyId', companyId);
      localStorage.setItem('companyName', companyName);

      setLoading(false);
      onLogin();
    } catch (err) {
      let errorMessage = "An error occurred during login. Please try again.";
      if (err.code === "auth/user-not-found") {
        errorMessage = "No user found with this email.";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later or reset your password.";
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetStatus(null);
    setResetLoading(true);

    if (!resetEmail) {
      setResetStatus({ type: 'error', message: 'Please enter your email address.' });
      setResetLoading(false);
      return;
    }

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, resetEmail);
      setResetStatus({ 
        type: 'success', 
        message: 'Password reset email sent. Please check your inbox.' 
      });
      setResetEmail('');
      setTimeout(() => {
        setShowResetModal(false);
        setResetStatus(null);
      }, 3000);
    } catch (err) {
      let errorMessage = 'Failed to send reset email.';
      
      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          errorMessage = 'An error occurred. Please try again.';
      }
      
      setResetStatus({ type: 'error', message: errorMessage });
    }
    
    setResetLoading(false);
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <div className="login-header">
          <h2>Sell I.T.</h2>
          <div className="login-subtitle">Sign in to your account</div>
        </div>
        {error && <div className="error-message"><span className="error-icon">⚠️</span>{error}</div>}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-icon-group">
            <span className="input-icon"><i className="fas fa-envelope"></i></span>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-icon-group">
            <span className="input-icon"><i className="fas fa-lock"></i></span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(s => !s)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <i className="fas fa-eye-slash"></i> : <i className="fas fa-eye"></i>}
            </button>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1.5rem' }}>
          {loading ? <span className="loading-spinner" style={{ width: 20, height: 20 }}></span> : 'Sign In'}
        </button>
        <div className="login-footer">
          <button type="button" className="forgot-password" tabIndex={0} onClick={() => {
            setShowResetModal(true);
            setResetEmail(email);
          }}>Forgot password?</button>
        </div>
        <div className="login-links">
          <span>Don&apos;t have an account?</span>
          <button type="button" className="sign-up-link" onClick={onShowRegister}>Create Account</button>
        </div>
      </form>

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Password</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowResetModal(false);
                  setResetStatus(null);
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePasswordReset}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email</label>
                <input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="form-control"
                  autoComplete="email"
                />
              </div>
              {resetStatus && (
                <div className={`status-message ${resetStatus.type}`}>
                  {resetStatus.message}
                </div>
              )}
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetStatus(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <span className="loading-spinner">
                      <span className="spinner"></span>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
