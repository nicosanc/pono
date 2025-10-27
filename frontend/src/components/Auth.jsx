import { useState } from 'react';

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
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
      background: 'linear-gradient(180deg, #E8F2ED 0%, #F4E8D8 50%, #FCEADE 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '15px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#1B5F5A', marginBottom: '30px', textAlign: 'center' }}>
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
              border: '1px solid #7A9B7F',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
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
              border: '1px solid #7A9B7F',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />

          {error && (
            <p style={{ color: '#E87C4D', fontSize: '14px', marginBottom: '15px' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #E87C4D 0%, #D4725C 100%)',
              color: '#E8F2ED',
              border: 'none',
              padding: '14px',
              fontSize: '18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '15px'
            }}
          >
            {isLogin ? 'Login' : 'Register'}
          </button>

          <p style={{ textAlign: 'center', color: '#5A8E8C', fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={() => setIsLogin(!isLogin)}
              style={{ color: '#E87C4D', cursor: 'pointer', textDecoration: 'underline' }}
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

