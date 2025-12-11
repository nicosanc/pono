import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../config';

function TranscriptView({ conversationId, token, onBack }) {
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '800px', height: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '20px' }}>
      <button 
        onClick={onBack}
        style={{
          backgroundColor: '#5A8E8C',
          color: '#E8F2ED',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        ← Back to Conversations
      </button>
      
      <h2 style={{ color: '#1B5F5A', marginBottom: '10px' }}>{conversation.title}</h2>
      <p style={{ color: '#5A8E8C', fontSize: '14px', marginBottom: '30px' }}>
        {new Date(conversation.created_at).toLocaleDateString()} • {conversation.duration} seconds
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingBottom: '100px' }}>
        {conversation.messages.map(msg => (
          <div 
            key={msg.id}
            style={{
              padding: '15px',
              borderRadius: '12px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #A8D8EA 0%, #89C4D8 100%)' // teal for user
                : 'linear-gradient(135deg, #F5B7A3 0%, #EBA08D 100%)', // peach for coach
              border: 'none',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '70%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
              color: '#FFFFFF',
            }}
          >
            <strong style={{ color: '#FFFFFF' }}>
              {msg.role === 'user' ? 'You' : 'Coach'}
            </strong>
            <p style={{ margin: '5px 0 0', color: '#FFFFFF', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {msg.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TranscriptView;