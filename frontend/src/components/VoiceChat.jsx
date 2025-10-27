import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import VoiceWaveform from './VoiceWaveform';

function VoiceChat({ token, userId }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [analyserNode, setAnalyserNode] = useState(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  // Latency tracking
  const latencyRef = useRef({
    userStoppedTime: null,
    audioStartTime: null,
    measurements: []
  });
  

  const startConversation = async () => {
    // Reset latency measurements
    latencyRef.current = {
      userStoppedTime: null,
      audioStartTime: null,
      measurements: []
    };
    
    // 1. Connect WebSocket with token
    wsRef.current = new WebSocket(`ws://localhost:8000/ws/voice?token=${token}`);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      startAudioCapture();
    };
    
    wsRef.current.onmessage = (event) => {
      handleServerMessage(event.data);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      // Delay refetch to allow backend to save transcript
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      }, 1500); // 1.5s delay for backend to save messages
    };
  };

  const startAudioCapture = async () => {
   
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
    audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    
    // Load worklet
    await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
    
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
    
    // Create analyser for visualization
    analyserRef.current = audioContextRef.current.createAnalyser();
    source.connect(analyserRef.current); // Mic → analyser for waveform
    source.connect(workletNode); // Mic → worklet for processing
    setAnalyserNode(analyserRef.current);
    
    // Receive processed audio from worklet
    workletNode.port.onmessage = (e) => {
        const pcm16Buffer = e.data;
        const uint8Array = new Uint8Array(pcm16Buffer);
        const base64 = btoa(String.fromCharCode(...uint8Array));
        
        wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
        }));
    };
  };

  const handleServerMessage = (data) => {
    const event = JSON.parse(data);
  
  // Track when user stops speaking
  if (event.type === 'input_audio_buffer.speech_stopped') {
    latencyRef.current.userStoppedTime = performance.now();
    latencyRef.current.audioStartTime = null; // Reset for next response
  }
  
  // Handle transcript events
  if (event.type === 'conversation.item.created') {
    const item = event.item;
    if (item?.role && item?.content) {
      item.content.forEach(content => {
        if (content.transcript) {
          setTranscript(prev => [...prev, {
            role: item.role,
            content: content.transcript
          }]);
        }
      });
    }
  }
  
  // Handle audio playback and measure latency
  if (event.type === 'response.audio.delta') {
    const audioData = event.delta; // base64 PCM16
    
    // Measure latency on first audio chunk
    if (latencyRef.current.userStoppedTime && !latencyRef.current.audioStartTime) {
      latencyRef.current.audioStartTime = performance.now();
      const latency = latencyRef.current.audioStartTime - latencyRef.current.userStoppedTime;
      latencyRef.current.measurements.push(latency);
      
      const avgLatency = latencyRef.current.measurements.reduce((a, b) => a + b, 0) / latencyRef.current.measurements.length;
      
      console.log(`⏱️  LATENCY: ${latency.toFixed(0)}ms | Session Avg: ${avgLatency.toFixed(0)}ms | Samples: ${latencyRef.current.measurements.length}`);
    }
    
    playAudio(audioData);
  }
};

const scheduledTimeRef = useRef(0);

const playAudio = (base64Audio) => {
  const binaryString = atob(base64Audio);
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
  
  // Connect directly to speakers for playback
  // (analyserRef is only for microphone visualization, not playback)
  source.connect(audioContextRef.current.destination);
  
  // Schedule precisely to avoid gaps
  const currentTime = audioContextRef.current.currentTime;
  if (scheduledTimeRef.current < currentTime) {
    scheduledTimeRef.current = currentTime + 0.05;
  }
  
  source.start(scheduledTimeRef.current);
  scheduledTimeRef.current += audioBuffer.duration;
};

  const stopConversation = () => {
    if (wsRef.current) {
      wsRef.current.close();
      setIsConnected(false);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setAnalyserNode(null); // Clear analyser state
    // Delay refetch to allow backend to save transcript
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    }, 1500); // 1.5s delay for backend to save messages
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <VoiceWaveform isActive={isConnected} analyserNode={analyserNode} />
      
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button 
          onClick={startConversation} 
          disabled={isConnected}
          style={{
            background: isConnected 
              ? 'linear-gradient(135deg, #7A9B7F 0%, #5A8E8C 100%)' 
              : 'linear-gradient(135deg, #E87C4D 0%, #D4725C 100%)',
            color: '#E8F2ED',
            border: 'none',
            padding: '16px 48px',
            fontSize: '18px',
            borderRadius: '30px',
            cursor: isConnected ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(232, 124, 77, 0.4)'
          }}
          onMouseEnter={(e) => !isConnected && (e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 114, 92, 0.5)')}
          onMouseLeave={(e) => !isConnected && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(232, 124, 77, 0.4)')}
        >
          {isConnected ? 'Connected' : 'Start Conversation'}
        </button>
        
        <button
          onClick={stopConversation}
          disabled={!isConnected}
          style={{
            background: !isConnected 
              ? '#ccc' 
              : 'linear-gradient(135deg, #C45C3A 0%, #A04830 100%)',
            color: '#E8F2ED',
            border: 'none',
            padding: '16px 48px',
            fontSize: '18px',
            borderRadius: '30px',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            fontWeight: '600',
            boxShadow: isConnected ? '0 4px 16px rgba(196, 92, 58, 0.4)' : 'none'
          }}
        >
          Stop
        </button>
      </div>
      <div>{transcript.map((msg, i) => <p key={i}>{msg.role}: {msg.content}</p>)}</div>
    </div>
  );
}

export default VoiceChat;