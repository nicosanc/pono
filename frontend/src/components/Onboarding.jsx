import { useState, useRef, useEffect } from 'react';
import VoiceWaveform from './VoiceWaveform';

function Onboarding({ token, userId, onComplete }) {
  const [isActive, setIsActive] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const scheduledTimeRef = useRef(0);
  
  // Latency tracking
  const latencyRef = useRef({
    userStoppedTime: null,
    audioStartTime: null,
    measurements: []
  });

  const startOnboarding = async () => {
    try {
      // Reset audio scheduling
      scheduledTimeRef.current = 0;
      
      // Reset latency measurements
      latencyRef.current = {
        userStoppedTime: null,
        audioStartTime: null,
        measurements: []
      };
      
      // Initialize AudioContext
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Load AudioWorklet
      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
      
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create analyser for visualization
      const analyser = audioContextRef.current.createAnalyser();
      source.connect(analyser);
      setAnalyserNode(analyser);
      
      // Create worklet for audio processing
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      source.connect(workletNodeRef.current);
      
      // Connect to backend WebSocket with onboarding flag
      wsRef.current = new WebSocket(`ws://localhost:8000/ws/voice?token=${token}&onboarding=true`);
      
      wsRef.current.onopen = () => {
        setIsActive(true);
      };

      // Forward PCM16 audio from worklet to backend
      workletNodeRef.current.port.onmessage = (event) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const pcm16 = event.data;
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16)));
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        }
      };

      // Receive audio from backend
      wsRef.current.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        // Track when user stops speaking
        if (msg.type === 'input_audio_buffer.speech_stopped') {
          latencyRef.current.userStoppedTime = performance.now();
          latencyRef.current.audioStartTime = null;
        }
        
        // Handle audio playback and measure latency
        if (msg.type === 'response.audio.delta' && msg.delta) {
          // Measure latency on first audio chunk
          if (latencyRef.current.userStoppedTime && !latencyRef.current.audioStartTime) {
            latencyRef.current.audioStartTime = performance.now();
            const latency = latencyRef.current.audioStartTime - latencyRef.current.userStoppedTime;
            latencyRef.current.measurements.push(latency);
            
            const avgLatency = latencyRef.current.measurements.reduce((a, b) => a + b, 0) / latencyRef.current.measurements.length;
            
            console.log(`⏱️  ONBOARDING LATENCY: ${latency.toFixed(0)}ms | Session Avg: ${avgLatency.toFixed(0)}ms | Samples: ${latencyRef.current.measurements.length}`);
          }
          
          const binaryString = atob(msg.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const pcm16 = new Int16Array(bytes.buffer);
          const float32 = new Float32Array(pcm16.length);
          for (let i = 0; i < pcm16.length; i++) {
            float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
          }
          
          const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
          audioBuffer.getChannelData(0).set(float32);
          
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          
          // Connect to analyser for visualization, then to destination
          if (analyserNode) {
            source.connect(analyserNode);
          } else {
            source.connect(audioContextRef.current.destination);
          }
          
          // Schedule audio to play sequentially, not overlapping
          const currentTime = audioContextRef.current.currentTime;
          if (scheduledTimeRef.current < currentTime) {
            scheduledTimeRef.current = currentTime + 0.05;
          }
          
          source.start(scheduledTimeRef.current);
          scheduledTimeRef.current += audioBuffer.duration;
        }
      };

      wsRef.current.onclose = () => {
        setIsActive(false);
        setShowCompleteButton(true);
      };

    } catch (error) {
      console.error('Error starting onboarding:', error);
    }
  };

  const stopOnboarding = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsActive(false);
    
    // Wait a bit for backend to save, then show button
    setTimeout(() => {
      setShowCompleteButton(true);
      // Fetch the most recent conversation ID
      fetchLatestConversationId();
    }, 2000);
  };

  const fetchLatestConversationId = async () => {
    try {
      const res = await fetch(`http://localhost:8000/users/${userId}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const conversations = await res.json();
      if (conversations.length > 0) {
        setConversationId(conversations[0].id);
      }
    } catch (error) {
      console.error('Error fetching conversation ID:', error);
    }
  };

  const completeOnboarding = async () => {
    if (!conversationId) {
      console.error('No conversation ID available');
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/conversations/${conversationId}/complete-onboarding`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (!res.ok) throw new Error('Failed to complete onboarding');

      const data = await res.json();
      
      // Notify parent to refresh and show main UI
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(180deg, #E8F2ED 0%, #F4E8D8 50%, #FCEADE 100%)'
    }}>
      <h1 style={{ 
        color: '#1B5F5A', 
        fontWeight: '700', 
        fontSize: '48px',
        marginBottom: '20px'
      }}>
        Welcome to Pono
      </h1>
      
      <p style={{
        color: '#5A8E8C',
        fontSize: '18px',
        marginBottom: '60px',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        Let's get to know you. Tell me about yourself, your goals, and what you'd like to work on.
      </p>

      <VoiceWaveform isActive={isActive} analyserNode={analyserNode} />

      {!isActive && !showCompleteButton && (
        <button
          onClick={startOnboarding}
          style={{
            background: 'linear-gradient(135deg, #5A8E8C 0%, #7A9B7F 100%)',
            color: '#E8F2ED',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '30px',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '30px',
            boxShadow: '0 4px 12px rgba(90, 142, 140, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(90, 142, 140, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(90, 142, 140, 0.3)';
          }}
        >
          Start Consultation
        </button>
      )}

      {isActive && (
        <button
          onClick={stopOnboarding}
          style={{
            background: 'linear-gradient(135deg, #C45C3A 0%, #A04830 100%)',
            color: '#E8F2ED',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '30px',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '30px',
            boxShadow: '0 4px 12px rgba(196, 92, 58, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(196, 92, 58, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(196, 92, 58, 0.3)';
          }}
        >
          Stop
        </button>
      )}

      {showCompleteButton && (
        <button
          onClick={completeOnboarding}
          disabled={!conversationId}
          style={{
            background: conversationId 
              ? 'linear-gradient(135deg, #E87C4D 0%, #D4725C 100%)'
              : '#ccc',
            color: '#E8F2ED',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '30px',
            fontSize: '18px',
            cursor: conversationId ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            marginTop: '30px',
            boxShadow: conversationId ? '0 4px 12px rgba(232, 124, 77, 0.3)' : 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (conversationId) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(232, 124, 77, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (conversationId) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(232, 124, 77, 0.3)';
            }
          }}
        >
          {conversationId ? 'Complete Consultation' : 'Processing...'}
        </button>
      )}
    </div>
  );
}

export default Onboarding;

