import { useQuery } from '@tanstack/react-query';

function TranscriptView({ conversationId, token, onBack }) {
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const res = await fetch(`http://localhost:8000/conversations/${conversationId}/messages`, {
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
              borderRadius: '10px',
              backgroundColor: msg.role === 'user' ? '#E8F2ED' : '#F4E8D8',
              border: `1px solid ${msg.role === 'user' ? '#7A9B7F' : '#E87C4D'}`,
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '70%'
            }}
          >
            <strong style={{ color: msg.role === 'user' ? '#2B4C5F' : '#1B5F5A' }}>
              {msg.role === 'user' ? 'You' : 'Coach'}
            </strong>
            <p style={{ margin: '5px 0 0', color: '#3D2E27' }}>{msg.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TranscriptView;