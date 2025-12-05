import { useState } from 'react';

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
      const res = await fetch(`http://localhost:8000${endpoint}`, {
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
      background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)'
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'transparent',
            color: '#D4A017',
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
        background: 'rgba(255, 254, 240, 0.95)',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 8px 24px rgba(255, 213, 79, 0.3)',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid rgba(255, 213, 79, 0.3)'
      }}>
        <h1 style={{ color: '#D4A017', marginBottom: '30px', textAlign: 'center' }}>
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
              border: '1px solid #FFD54F',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: '#FFFEF0'
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
              border: '1px solid #FFD54F',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
              backgroundColor: '#FFFEF0'
            }}
          />

          {error && (
            <p style={{ color: '#FF9800', fontSize: '14px', marginBottom: '15px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #FFEB3B 0%, #FFD54F 100%)',
              color: '#5D4E37',
              border: 'none',
              padding: '14px',
              fontSize: '18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '15px',
              boxShadow: '0 4px 12px rgba(255, 213, 79, 0.3)'
            }}
          >
            {isLogin ? 'Login' : 'Register'}
          </button>

          <p style={{ textAlign: 'center', color: '#C9A961', fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              style={{ color: '#FFC107', cursor: 'pointer', textDecoration: 'underline' }}
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

