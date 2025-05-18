import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';
import { API_BASE_URL } from '../config/api';

const Login = () => {
  const { signIn, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiInfo, setApiInfo] = useState('');

  useEffect(() => {
    console.log('API Base URL:', API_BASE_URL);
    setApiInfo(`API URL: ${API_BASE_URL}`);
    
    // Check auth status on mount
    checkAuthStatus && checkAuthStatus();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Login attempt with:', formData.email);
    
    try {
      await signIn(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login to IntelliView</h1>
        <p className="auth-description">
          Sign in to access your interview practice platform
        </p>

        {error && <div className="auth-error">{error}</div>}
        {apiInfo && <div style={{fontSize: "12px", color: "#666", marginBottom: "10px"}}>{apiInfo}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
          <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            required
              placeholder="Enter your email"
          />
        </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
          <input
            type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
            required
              placeholder="Enter your password"
          />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
