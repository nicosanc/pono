import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../config';

function Analytics({ token }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)',
        color: '#D4A017'
      }}>
        <h2>Loading analytics...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)',
        color: '#FF9800'
      }}>
        <h2>Error loading analytics: {error.message}</h2>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 100px)',
      background: 'linear-gradient(135deg, #FFFEF0 0%, #FFF9E6 50%, #FFE082 100%)',
      padding: '20px',
      color: '#D4A017',
      overflow: 'hidden'
    }}>
      {/* Quadrant Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '20px',
        height: '100%',
        width: '100%'
      }}>
        {/* Top Left - Total Sessions */}
        <div style={{
          background: 'rgba(255, 254, 240, 0.8)',
          borderRadius: '20px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 213, 79, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(255, 213, 79, 0.2)'
        }}>
          <div style={{ fontSize: '18px', opacity: 0.7, marginBottom: '15px', fontWeight: '600' }}>
            Total Sessions
          </div>
          <div style={{ fontSize: '72px', fontWeight: '700', color: '#FFC107', marginBottom: '10px' }}>
            {data.total_sessions}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6 }}>Last 30 days</div>
        </div>

        {/* Top Right - Avg Duration */}
        <div style={{
          background: 'rgba(255, 254, 240, 0.8)',
          borderRadius: '20px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 213, 79, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(255, 213, 79, 0.2)'
        }}>
          <div style={{ fontSize: '18px', opacity: 0.7, marginBottom: '15px', fontWeight: '600' }}>
            Average Duration
          </div>
          <div style={{ fontSize: '72px', fontWeight: '700', color: '#FFC107', marginBottom: '10px' }}>
            {data.avg_duration}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6 }}>minutes per session</div>
        </div>

        {/* Bottom Left - Emotional Trends Chart */}
        <div style={{
          background: 'rgba(255, 254, 240, 0.8)',
          borderRadius: '20px',
          padding: '30px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 213, 79, 0.4)',
          boxShadow: '0 8px 24px rgba(255, 213, 79, 0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '700' }}>Emotional Trends</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.emotional_trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 160, 23, 0.2)" />
              <XAxis 
                dataKey="date" 
                stroke="#D4A017"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#D4A017" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(255, 254, 240, 0.95)', 
                  border: 'none', 
                  borderRadius: '10px',
                  color: '#D4A017'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [`${value.toFixed(1)}`, 'Score']}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#FFC107" 
                strokeWidth={3}
                dot={{ fill: '#FFC107', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Right - Recent Conversations */}
        <div style={{
          background: 'rgba(255, 254, 240, 0.8)',
          borderRadius: '20px',
          padding: '30px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 213, 79, 0.4)',
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(255, 213, 79, 0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '700' }}>Recent Sessions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.recent_conversations.map((conv) => (
              <ConversationCard key={conv.id} conversation={conv} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(232, 124, 77, 0.2) 0%, rgba(212, 114, 92, 0.2) 100%)',
      borderRadius: '15px',
      padding: '25px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(232, 124, 77, 0.3)'
    }}>
      <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '10px' }}>{title}</div>
      <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '5px' }}>{value}</div>
      <div style={{ fontSize: '12px', opacity: 0.6 }}>{subtitle}</div>
    </div>
  );
}

function ConversationCard({ conversation }) {
  const getScoreColor = (score) => {
    if (score >= 70) return '#FFC107';
    if (score >= 50) return '#FFD54F';
    return '#FF9800';
  };

  return (
    <div style={{
      background: 'rgba(255, 254, 240, 0.9)',
      borderRadius: '12px',
      padding: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid rgba(255, 213, 79, 0.3)',
      transition: 'all 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255, 224, 130, 0.5)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 213, 79, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 254, 240, 0.9)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#D4A017' }}>
          {conversation.title}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.6, color: '#C9A961' }}>
          {new Date(conversation.date).toLocaleDateString()} • {Math.round(conversation.duration / 60)} min
        </div>
      </div>
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: getScoreColor(conversation.score),
        minWidth: '50px',
        textAlign: 'right'
      }}>
        {conversation.score.toFixed(0)}
      </div>
    </div>
  );
}

export default Analytics;

