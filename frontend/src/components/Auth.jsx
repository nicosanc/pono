import { useState } from 'react';
import { API_URL } from '../config';

function Auth({ onLogin, initialMode = 'login', onBack }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Authentication failed');
        return;
      }

      // Store token and call parent callback
      localStorage.setItem('token', data.access_token);
      onLogin(data.access_token);
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #FFFEF9 0%, #E8E0F5 50%, #D4C5E8 100%)'
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'transparent',
            color: '#B8A9D4',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ← Back to Home
        </button>
      )}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 8px 24px rgba(184, 169, 212, 0.2)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(212, 197, 232, 0.3)'
      }}>
        <h1 style={{ color: '#8B7CA8', marginBottom: '30px', textAlign: 'center' }}>
          {isLogin ? 'Login' : 'Register'}
        </h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '15px',
              border: '1px solid #D4C5E8',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: '#FFFEF9'
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '20px',
              border: '1px solid #D4C5E8',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: '#FFFEF9'
            }}
          />

          {error && (
            <p style={{ color: '#D89CA8', fontSize: '14px', marginBottom: '15px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #A8D8EA 0%, #89C4D8 100%)',
              color: '#FFFEF9',
              border: 'none',
              padding: '14px',
              fontSize: '18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '15px',
              boxShadow: '0 4px 12px rgba(168, 216, 234, 0.3)'
            }}
          >
            {isLogin ? 'Login' : 'Register'}
          </button>

          <p style={{ textAlign: 'center', color: '#C2B5D8', fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              style={{ color: '#B8A9D4', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLogin ? 'Register' : 'Login'}
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Auth;

