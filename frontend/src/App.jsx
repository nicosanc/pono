import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VoiceChat from './components/VoiceChat';
import ConversationHistory from './components/ConversationHistory';
import TranscriptView from './components/TranscriptView';
import Analytics from './components/Analytics';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Landing from './components/Landing';
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // Data fresh for 1 min
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    },
  },
});

function AppContent() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'analytics'
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null); // null = loading
  const [showAuth, setShowAuth] = useState(false); // Show landing page by default
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      // Decode token to get userId (JWT payload is base64 encoded)
      const payload = JSON.parse(atob(savedToken.split('.')[1]));
      setUserId(parseInt(payload.sub));
    }
  }, []);

  // Fetch user's onboarding status
  useEffect(() => {
    if (!token || !userId) return;

    const fetchUserStatus = async () => {
      try {
        const res = await fetch(`http://localhost:8000/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const userData = await res.json();
          setOnboardingCompleted(userData.onboarding_completed);
        }
      } catch (error) {
        console.error('Error fetching user status:', error);
        setOnboardingCompleted(false);
      }
    };

    fetchUserStatus();
  }, [token, userId]);

  const handleLogin = (newToken) => {
    setToken(newToken);
    const payload = JSON.parse(atob(newToken.split('.')[1]));
    setUserId(parseInt(payload.sub));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUserId(null);
    setOnboardingCompleted(null);
    queryClient.clear(); // Clear all cached data on logout
  };

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  const handleShowAuth = (mode) => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleBackToLanding = () => {
    setShowAuth(false);
  };

  // Show landing page if not logged in and hasn't clicked auth buttons
  if (!token || !userId) {
    if (!showAuth) {
      return <Landing onShowAuth={handleShowAuth} />;
    }
    return <Auth onLogin={handleLogin} initialMode={authMode} onBack={handleBackToLanding} />;
  }

  // Show loading while checking onboarding status
  if (onboardingCompleted === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)',
        color: '#D4A017',
        fontSize: '20px'
      }}>
        Loading...
      </div>
    );
  }

  // Show onboarding if not completed
  if (!onboardingCompleted) {
    return <Onboarding token={token} userId={userId} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div>
      <ConversationHistory 
        userId={userId}
        token={token}
        onSelectConversation={setSelectedConversation}
      />

      {/* Main content - pushed right of fixed sidebar */}
      <div style={{ 
        marginLeft: '20%',
        width: 'calc(100vw - 20%)',
        height: '100vh',
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '40px',
        background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)',
        position: 'fixed',
        top: 0,
        right: 0
      }}>
        {/* Top right buttons */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '10px'
        }}>
          <button
            onClick={() => setCurrentView(currentView === 'chat' ? 'analytics' : 'chat')}
            style={{
              background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)',
              color: '#5D4E37',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
            }}
          >
            {currentView === 'chat' ? 'Analytics' : 'Chat'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'linear-gradient(135deg, #FFB74D 0%, #FF9800 100%)',
              color: '#5D4E37',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
            }}
          >
            Logout
          </button>
        </div>

        {/* Conditional rendering based on current view */}
        {currentView === 'analytics' ? (
          <div style={{ width: '100%', height: '100%', paddingTop: '20px' }}>
            <Analytics token={token} />
          </div>
        ) : (
          <>
            {/* Title - centered */}
            <h1 style={{ 
              color: '#D4A017', 
              fontWeight: '700', 
              fontSize: '48px',
              marginBottom: '60px',
              marginTop: '80px',
              textAlign: 'center',
              textShadow: '0 2px 8px rgba(255, 193, 7, 0.2)'
            }}>
              Pono Voice Coach
            </h1>
            {selectedConversation ? (
              <TranscriptView 
                conversationId={selectedConversation}
                token={token}
                onBack={() => setSelectedConversation(null)}
              />
            ) : (
              <VoiceChat token={token} userId={userId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;