import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from './firebase.js';
import { collection, addDoc, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import './App.css';

function Register({ onRegister, onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const checkPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (passwordStrength < 3) {
      setError('Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.');
      setLoading(false);
      return;
    }

    try {
      // Check if company already exists
      const companiesRef = collection(db, 'companies');
      const q = query(companiesRef, where('name', '==', companyName));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setError('A company with this name already exists.');
        setLoading(false);
        return;
      }

      // Create user in Firebase Auth
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create company document with proper structure
      const companyDocRef = await addDoc(companiesRef, {
        name: companyName,
        createdAt: new Date(),
        createdBy: user.uid,
        allowedUsers: [user.uid],
        settings: {
          regions: [],
          defaultRegion: null
        }
      });

      const companyId = companyDocRef.id;

      // Create user profile in 'users' collection
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        companyId,
        companyName,
        role: 'manager',
        createdAt: new Date(),
        lastLogin: new Date(),
        settings: {
          defaultView: 'reports',
          notifications: true
        }
      });

      // Store companyId and companyName in localStorage
      localStorage.setItem('companyId', companyId);
      localStorage.setItem('companyName', companyName);
      setLoading(false);
      onRegister();
    } catch (err) {
      let errorMessage = 'Registration failed.';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      }
      setError(errorMessage);
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: return '#ff4444';
      case 1: return '#ff4444';
      case 2: return '#ffbb33';
      case 3: return '#ffeb3b';
      case 4: return '#00C851';
      case 5: return '#007E33';
      default: return '#ff4444';
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleRegister}>
        <div className="login-header">
          <h2>Sell I.T.</h2>
          <div className="login-subtitle">Create your company account</div>
        </div>
        {error && <div className="error-message"><span className="error-icon">⚠️</span>{error}</div>}
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <div className="input-icon-group">
            <span className="input-icon"><i className="fas fa-user"></i></span>
            <input
              id="name"
              type="text"
              className="form-control"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Enter your full name"
              autoFocus
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-icon-group">
            <span className="input-icon"><i className="fas fa-envelope"></i></span>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
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
              value={password}
              onChange={handlePasswordChange}
              required
              placeholder="Enter your password"
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
          {password && (
            <div className="password-strength">
              <div 
                className="strength-bar" 
                style={{ 
                  width: `${(passwordStrength / 5) * 100}%`,
                  backgroundColor: getPasswordStrengthColor()
                }}
              />
              <span className="strength-text">
                {passwordStrength < 3 ? 'Weak' : passwordStrength < 4 ? 'Medium' : 'Strong'}
              </span>
            </div>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="companyName">Company Name</label>
          <div className="input-icon-group">
            <span className="input-icon"><i className="fas fa-building"></i></span>
            <input
              id="companyName"
              type="text"
              className="form-control"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              required
              placeholder="Enter your company name"
            />
          </div>
        </div>
        <button 
          className="btn btn-primary" 
          type="submit" 
          disabled={loading || passwordStrength < 3}
          style={{ width: '100%', marginTop: '1.5rem' }}
        >
          {loading ? (
            <span className="loading-spinner" style={{ width: 20, height: 20 }}></span>
          ) : (
            'Create Account'
          )}
        </button>
        <div className="login-footer">
          <div className="login-links">
            <button 
              type="button" 
              className="back-to-login"
              onClick={onBackToLogin}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Register; 