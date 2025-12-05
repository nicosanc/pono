import { useState } from 'react';

function Landing({ onShowAuth }) {
  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Navigation Bar */}
      <nav style={{
        width: '100%',
        padding: '20px 60px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#D4A017',
          margin: 0
        }}>
          Pono
        </h1>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={() => onShowAuth('login')}
            style={{
              background: 'transparent',
              color: '#D4A017',
              border: '2px solid #FFD54F',
              padding: '10px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 213, 79, 0.2)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            Login
          </button>
          <button
            onClick={() => onShowAuth('register')}
            style={{
              background: 'linear-gradient(135deg, #FFEB3B 0%, #FFD54F 100%)',
              color: '#5D4E37',
              border: 'none',
              padding: '10px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(255, 213, 79, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(255, 213, 79, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(255, 213, 79, 0.3)';
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        padding: '80px 40px',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}>
        <h1 style={{
          fontSize: '64px',
          fontWeight: '800',
          color: '#D4A017',
          marginBottom: '30px',
          lineHeight: '1.2',
          textShadow: '0 2px 8px rgba(255, 193, 7, 0.2)'
        }}>
          Your AI Voice Coach for<br />Emotional Wellbeing
        </h1>
        
        <p style={{
          fontSize: '24px',
          color: '#9B8654',
          marginBottom: '50px',
          lineHeight: '1.6',
          maxWidth: '800px',
          margin: '0 auto 50px'
        }}>
          Transform your self-doubt into self-confidence through personalized, 
          voice-powered coaching sessions that understand your emotions.
        </p>

        <button
          onClick={() => onShowAuth('register')}
          style={{
            background: 'linear-gradient(135deg, #FFEB3B 0%, #FFD54F 100%)',
            color: '#5D4E37',
            border: 'none',
            padding: '18px 50px',
            fontSize: '20px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: '700',
            boxShadow: '0 6px 20px rgba(255, 213, 79, 0.4)',
            transition: 'all 0.3s ease',
            marginBottom: '80px'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 8px 24px rgba(255, 213, 79, 0.5)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 6px 20px rgba(255, 213, 79, 0.4)';
          }}
        >
          Start Your Journey →
        </button>

        {/* Demo Video Placeholder */}
        <div style={{
          background: 'rgba(255, 254, 240, 0.6)',
          borderRadius: '20px',
          padding: '60px',
          marginBottom: '80px',
          boxShadow: '0 8px 24px rgba(255, 213, 79, 0.2)',
          border: '2px dashed #FFD54F'
        }}>
          <p style={{
            fontSize: '18px',
            color: '#C9A961',
            margin: 0
          }}>
            🎥 Demo video coming soon
          </p>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          marginTop: '80px'
        }}>
          <div style={{
            background: 'rgba(255, 254, 240, 0.95)',
            padding: '40px',
            borderRadius: '15px',
            boxShadow: '0 4px 16px rgba(255, 213, 79, 0.2)',
            border: '1px solid rgba(255, 213, 79, 0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
            <h3 style={{ color: '#D4A017', fontSize: '24px', marginBottom: '15px' }}>
              Voice-First Coaching
            </h3>
            <p style={{ color: '#9B8654', fontSize: '16px', lineHeight: '1.6' }}>
              Natural conversations with your AI coach. No typing, just authentic dialogue.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 254, 240, 0.95)',
            padding: '40px',
            borderRadius: '15px',
            boxShadow: '0 4px 16px rgba(255, 213, 79, 0.2)',
            border: '1px solid rgba(255, 213, 79, 0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>💭</div>
            <h3 style={{ color: '#D4A017', fontSize: '24px', marginBottom: '15px' }}>
              Emotion Analysis
            </h3>
            <p style={{ color: '#9B8654', fontSize: '16px', lineHeight: '1.6' }}>
              Track your emotional patterns with AI-powered prosody detection.
            </p>
          </div>

          <div style={{
            background: 'rgba(255, 254, 240, 0.95)',
            padding: '40px',
            borderRadius: '15px',
            boxShadow: '0 4px 16px rgba(255, 213, 79, 0.2)',
            border: '1px solid rgba(255, 213, 79, 0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📈</div>
            <h3 style={{ color: '#D4A017', fontSize: '24px', marginBottom: '15px' }}>
              Progress Tracking
            </h3>
            <p style={{ color: '#9B8654', fontSize: '16px', lineHeight: '1.6' }}>
              Visualize your growth with personalized analytics and insights.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        width: '100%',
        padding: '40px',
        textAlign: 'center',
        color: '#C9A961',
        fontSize: '14px',
        marginTop: 'auto'
      }}>
        <p>© 2025 Pono. Your journey to emotional wellbeing starts here.</p>
      </footer>
    </div>
  );
}

export default Landing;

