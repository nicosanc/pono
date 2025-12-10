import { useState, useRef, useEffect } from 'react';
import VoiceWaveform from './VoiceWaveform';
import { WS_URL, API_URL } from '../config';

function Onboarding({ token, userId, onComplete }) {
  const [isActive, setIsActive] = useState(false);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const analyserRef = useRef(null);
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
      
      // Add gain node to boost signal
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 3.0;
      source.connect(gainNode);
      
      // Create analyser for AI voice visualization only (not connected to microphone)
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser; // use ref to avoid stale closure in ws handler
      setAnalyserNode(analyser);
      
      // Create worklet for audio processing
      workletNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      gainNode.connect(workletNodeRef.current);
      
      // Connect to backend WebSocket with onboarding flag
      wsRef.current = new WebSocket(`${WS_URL}/ws/voice?token=${token}&onboarding=true`);
      
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
        
        // Track when user stops speaking (server VAD handles commit + response automatically)
        if (msg.type === 'input_audio_buffer.speech_stopped') {
          latencyRef.current.userStoppedTime = performance.now();
          latencyRef.current.audioStartTime = null;
          return;
        }
        
        // Handle audio playback and measure latency
        if (msg.type === 'response.output_audio.delta' && msg.delta) {
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
          
          // Connect model output to analyser for visualization
          const analyser = analyserRef.current;
          if (analyser) {
            source.connect(analyser);
            analyser.connect(audioContextRef.current.destination);
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
      const res = await fetch(`${API_URL}/users/${userId}/conversations`, {
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
        `${API_URL}/conversations/${conversationId}/complete-onboarding`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await res.json();
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #FFFEF9 0%, #E8E0F5 50%, #D4C5E8 100%)',
        margin: 0,
        padding: 0
      }}
    >
      <h1
        style={{
          color: '#8B7CA8',
          fontWeight: '700',
          fontSize: '48px',
          marginBottom: '20px',
          textShadow: '0 2px 8px rgba(184, 169, 212, 0.2)'
        }}
      >
        Welcome to Pono
      </h1>

      <p
        style={{
          color: '#9D8CB5',
          fontSize: '18px',
          marginBottom: '60px',
          textAlign: 'center',
          maxWidth: '600px'
        }}
      >
        Let's get to know you. Press Start Consultation and say "Hi" to begin.
      </p>

      <VoiceWaveform isActive={isActive} analyserNode={analyserNode} />

      {!isActive && !showCompleteButton && (
        <button
          onClick={startOnboarding}
          style={{
            background: 'linear-gradient(135deg, #A8D8EA 0%, #89C4D8 100%)',
            color: '#FFFEF9',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '30px',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '30px',
            boxShadow: '0 4px 12px rgba(168, 216, 234, 0.4)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(168, 216, 234, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 216, 234, 0.4)';
          }}
        >
          Start Consultation
        </button>
      )}

      {isActive && (
        <button
          onClick={stopOnboarding}
          style={{
            background: 'linear-gradient(135deg, #D4A5C0 0%, #C99BB0 100%)',
            color: '#FFFEF9',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '30px',
            fontSize: '18px',
            cursor: 'pointer',
            fontWeight: '600',
            marginTop: '30px',
            boxShadow: '0 4px 12px rgba(212, 165, 192, 0.4)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(212, 165, 192, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 165, 192, 0.4)';
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
              ? 'linear-gradient(135deg, #A8D8EA 0%, #89C4D8 100%)'
              : '#E8E0F5',
            color: conversationId ? '#FFFEF9' : '#C2B5D8',
            border: 'none',
            padding: '15px 40px',
            borderRadius: '30px',
            fontSize: '18px',
            cursor: conversationId ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            marginTop: '30px',
            boxShadow: conversationId ? '0 4px 12px rgba(168, 216, 234, 0.4)' : 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (conversationId) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(168, 216, 234, 0.6)';
            }
          }}
          onMouseLeave={(e) => {
            if (conversationId) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 216, 234, 0.4)';
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