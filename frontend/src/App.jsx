import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VoiceChat from './components/VoiceChat';
import ConversationHistory from './components/ConversationHistory';
import TranscriptView from './components/TranscriptView';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
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
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null); // null = loading

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

  // Show auth screen if not logged in
  if (!token || !userId) {
    return <Auth onLogin={handleLogin} />;
  }

  // Show loading while checking onboarding status
  if (onboardingCompleted === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(180deg, #E8F2ED 0%, #F4E8D8 50%, #FCEADE 100%)',
        color: '#1B5F5A',
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
        background: 'linear-gradient(180deg, #E8F2ED 0%, #F4E8D8 50%, #FCEADE 100%)',
        position: 'fixed',
        top: 0,
        right: 0
      }}>
        {/* Logout button - top right */}
        <button
          onClick={handleLogout}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #C45C3A 0%, #A04830 100%)',
            color: '#E8F2ED',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Logout
        </button>

        {/* Title - centered */}
        <h1 style={{ 
          color: '#1B5F5A', 
          fontWeight: '700', 
          fontSize: '48px',
          marginBottom: '60px',
          marginTop: '80px',
          textAlign: 'center'
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