import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { API_URL } from '../config';

// Add keyframe animation
const styleSheet = document.styleSheets[0];
if (styleSheet && !Array.from(styleSheet.cssRules).some(rule => rule.name === 'slideIn')) {
  styleSheet.insertRule(`
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `, styleSheet.cssRules.length);
}

function ConversationHistory({ userId, token, onSelectConversation }) {
  const queryClient = useQueryClient();
  const [latestConvId, setLatestConvId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/users/${userId}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
    enabled: !!userId && !!token, // Only fetch if authenticated
  });

  // Search conversations
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/conversations/search?query=${encodeURIComponent(debouncedQuery)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to search conversations');
      return res.json();
    },
    enabled: debouncedQuery.length > 2, // Only search if 3+ chars
  });

  // Track when new conversation appears
  useEffect(() => {
    if (conversations.length > 0) {
      const newestId = conversations[0].id;
      if (newestId !== latestConvId) {
        setLatestConvId(newestId);
      }
    }
  }, [conversations]);

  // Delete mutation with automatic refetch
  const deleteMutation = useMutation({
    mutationFn: async (conversationId) => {
      const res = await fetch(`${API_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete conversation');
    },
    onSuccess: () => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
  });

  const handleDelete = (conversationId) => {
    if (window.confirm('Delete this conversation?')) {
      deleteMutation.mutate(conversationId);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  // Determine which list to display
  const displayList = debouncedQuery.length > 2 ? searchResults : conversations;
  const isSearchMode = debouncedQuery.length > 2;

  return (
    <div style={{ 
      height: '100vh',
      borderRight: '2px solid #D4C5E8', 
      padding: '20px 15px 20px 20px',
      overflowY: 'auto',
      background: 'linear-gradient(180deg, #FFFEF9 0%, #E8E0F5 100%)',
      position: 'fixed',
      left: 0,
      top: 0,
      width: '20%',
      minWidth: '250px',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ marginBottom: '15px', fontSize: '18px', color: '#8B7CA8' }}>Conversations</h2>
      
      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 35px 10px 10px',
            borderRadius: '8px',
            border: '1px solid #D4C5E8',
            backgroundColor: '#FFFEF9',
            color: '#8B7CA8',
            fontSize: '14px',
            boxSizing: 'border-box'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#B8A9D4'
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading/Empty states */}
      {isSearching && <div style={{ color: '#8B7CA8', textAlign: 'center', padding: '20px' }}>Searching...</div>}
      {isSearchMode && !isSearching && displayList?.length === 0 && (
        <div style={{ color: '#8B7CA8', textAlign: 'center', padding: '20px' }}>No results found</div>
      )}

      {/* Conversation List */}
      {displayList?.map((conv, index) => (
        <div 
          key={conv.id}
          onClick={() => onSelectConversation(conv.id)}
          style={{ 
            padding: '12px', 
            marginBottom: '10px',
            marginRight: '10px',
            border: '1px solid #D4C5E8',
            cursor: 'pointer',
            borderRadius: '8px',
            backgroundColor: '#FFFEF9',
            transition: 'all 0.2s',
            animation: (index === 0 && conv.id === latestConvId) ? 'slideIn 0.5s ease-out' : 'none',
            opacity: 1,
            boxShadow: '0 2px 8px rgba(212, 197, 232, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E8E0F5';
            e.currentTarget.querySelector('strong').style.color = '#8B7CA8';
            e.currentTarget.querySelectorAll('div')[0].style.color = '#8B7CA8';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 197, 232, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFEF9';
            e.currentTarget.querySelector('strong').style.color = '#8B7CA8';
            e.currentTarget.querySelectorAll('div')[0].style.color = '#9D8CB5';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(212, 197, 232, 0.2)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <strong style={{ color: '#8B7CA8' }}>{conv.title}</strong>
              <div style={{ fontSize: '12px', color: '#9D8CB5' }}>
                {new Date(conv.created_at).toLocaleDateString()} • {conv.message_count} messages
                {isSearchMode && conv.distance !== undefined && (
                  <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>
                    (relevance: {(1 - conv.distance).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(conv.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0',
                marginLeft: '8px'
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ConversationHistory;