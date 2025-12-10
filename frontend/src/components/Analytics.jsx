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
        background: 'linear-gradient(135deg, #FFFEF9 0%, #E8E0F5 50%, #D4C5E8 100%)',
        color: '#8B7CA8'
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
        background: 'linear-gradient(135deg, #FFFEF9 0%, #E8E0F5 50%, #D4C5E8 100%)',
        color: '#C99BB0'
      }}>
        <h2>Error loading analytics: {error.message}</h2>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: 'calc(100vh - 100px)',
      background: 'linear-gradient(135deg, #FFFEF9 0%, #E8E0F5 50%, #D4C5E8 100%)',
      padding: '20px',
      color: '#8B7CA8',
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
          background: 'rgba(255, 254, 249, 0.8)',
          borderRadius: '20px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 197, 232, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(184, 169, 212, 0.2)'
        }}>
          <div style={{ fontSize: '18px', opacity: 0.7, marginBottom: '15px', fontWeight: '600' }}>
            Total Sessions
          </div>
          <div style={{ fontSize: '72px', fontWeight: '700', color: '#8B7CA8', marginBottom: '10px' }}>
            {data.total_sessions}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6 }}>Last 30 days</div>
        </div>

        {/* Top Right - Avg Duration */}
        <div style={{
          background: 'rgba(255, 254, 249, 0.8)',
          borderRadius: '20px',
          padding: '40px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 197, 232, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(184, 169, 212, 0.2)'
        }}>
          <div style={{ fontSize: '18px', opacity: 0.7, marginBottom: '15px', fontWeight: '600' }}>
            Average Duration
          </div>
          <div style={{ fontSize: '72px', fontWeight: '700', color: '#8B7CA8', marginBottom: '10px' }}>
            {data.avg_duration}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.6 }}>minutes per session</div>
        </div>

        {/* Bottom Left - Emotional Trends Chart */}
        <div style={{
          background: 'rgba(255, 254, 249, 0.8)',
          borderRadius: '20px',
          padding: '30px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 197, 232, 0.4)',
          boxShadow: '0 8px 24px rgba(184, 169, 212, 0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '700', color: '#8B7CA8' }}>Emotional Trends</h2>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={data.emotional_trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184, 169, 212, 0.2)" />
              <XAxis 
                dataKey="date" 
                stroke="#9D8CB5"
                tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis stroke="#9D8CB5" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(255, 254, 249, 0.95)', 
                  border: 'none', 
                  borderRadius: '10px',
                  color: '#8B7CA8'
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value) => [`${value.toFixed(1)}`, 'Score']}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#A8D8EA" 
                strokeWidth={3}
                dot={{ fill: '#A8D8EA', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Right - Recent Conversations */}
        <div style={{
          background: 'rgba(255, 254, 249, 0.8)',
          borderRadius: '20px',
          padding: '30px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(212, 197, 232, 0.4)',
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(184, 169, 212, 0.2)'
        }}>
          <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: '700', color: '#8B7CA8' }}>Recent Sessions</h2>
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
      background: 'linear-gradient(135deg, rgba(168, 216, 234, 0.25) 0%, rgba(140, 191, 214, 0.25) 100%)',
      borderRadius: '15px',
      padding: '25px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(168, 216, 234, 0.35)'
    }}>
      <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '10px', color: '#8B7CA8' }}>{title}</div>
      <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '5px', color: '#8B7CA8' }}>{value}</div>
      <div style={{ fontSize: '12px', opacity: 0.6, color: '#9D8CB5' }}>{subtitle}</div>
    </div>
  );
}

function ConversationCard({ conversation }) {
  const getScoreColor = (score) => {
    if (score >= 70) return '#8B7CA8';
    if (score >= 50) return '#A8D8EA';
    return '#C99BB0';
  };

  return (
    <div style={{
      background: 'rgba(255, 254, 249, 0.9)',
      borderRadius: '12px',
      padding: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '1px solid rgba(212, 197, 232, 0.3)',
      transition: 'all 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(232, 224, 245, 0.5)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(184, 169, 212, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 254, 249, 0.9)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: '#8B7CA8' }}>
          {conversation.title}
        </div>
        <div style={{ fontSize: '11px', opacity: 0.6, color: '#9D8CB5' }}>
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

