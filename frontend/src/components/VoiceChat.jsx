import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import VoiceWaveform from './VoiceWaveform';
import { WS_URL } from '../config';

function VoiceChat({ token, userId }) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [analyserNode, setAnalyserNode] = useState(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  
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
    wsRef.current = new WebSocket(`${WS_URL}/ws/voice?token=${token}`);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      startAudioCapture();
    };
    
    wsRef.current.onmessage = (event) => {
      handleServerMessage(event.data);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      // Clean up audio stream if WebSocket closes unexpectedly
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Delay refetch to allow backend to save transcript
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      }, 1500); // 1.5s delay for backend to save messages
    };
  };

  const startAudioCapture = async () => {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Load AudioWorklet
      await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Add gain node (boosts signal AND fixes AudioWorklet bug with MediaStreamSource)
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 3.0;
      source.connect(gainNode);
      
      // Create AudioWorklet
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      
      // Receive processed audio from worklet
      workletNode.port.onmessage = (e) => {
        const pcm16Buffer = e.data;
        const uint8Array = new Uint8Array(pcm16Buffer);
        const base64 = btoa(String.fromCharCode(...uint8Array));
        
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        }
      };
      
      // Create analyser for AI voice visualization only
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      setAnalyserNode(analyserRef.current);
      
      // Connect microphone to worklet (not to analyser)
      gainNode.connect(workletNode);
    } catch (error) {
      console.error('Error starting audio capture:', error);
      // Clean up stream if it was created
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Close WebSocket if audio setup fails
      if (wsRef.current) {
        wsRef.current.close();
      }
      setIsConnected(false);
    }
  };

  const handleServerMessage = (data) => {
    const event = JSON.parse(data);
  
  // Track when user stops speaking (server VAD handles commit + response automatically)
  if (event.type === 'input_audio_buffer.speech_stopped') {
    latencyRef.current.userStoppedTime = performance.now();
    latencyRef.current.audioStartTime = null; // Reset for next response
    return;
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
  if (event.type === 'response.output_audio.delta') {
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
  
  // Connect to analyser for waveform visualization, then to speakers
  if (analyserRef.current) {
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);
  } else {
    source.connect(audioContextRef.current.destination);
  }
  
  // Schedule precisely to avoid gaps
  const currentTime = audioContextRef.current.currentTime;
  if (scheduledTimeRef.current < currentTime) {
    scheduledTimeRef.current = currentTime + 0.05;
  }
  
  source.start(scheduledTimeRef.current);
  scheduledTimeRef.current += audioBuffer.duration;
};

  const stopConversation = async () => {
    // Set saving state to block new conversations
    setIsSaving(true);
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close AudioContext and clear all audio nodes
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Clear refs
    analyserRef.current = null;
    setAnalyserNode(null);
    scheduledTimeRef.current = 0;
    
    // Reset state
    setIsConnected(false);
    setTranscript([]);
    
    // Wait for backend to finish processing (transcript, embeddings, Hume analysis)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Force refetch conversations
    await queryClient.refetchQueries({ queryKey: ['conversations', userId] });
    
    // Clear saving state - user can now start new conversation
    setIsSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <VoiceWaveform isActive={isConnected} analyserNode={analyserNode} />
      
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
        <button 
          onClick={startConversation} 
          disabled={isConnected || isSaving}
          style={{
            background: (isConnected || isSaving)
              ? '#89C4D8'
              : '#5FA3BD',
            color: '#FFFEF9',
            border: 'none',
            padding: '16px 48px',
            fontSize: '18px',
            borderRadius: '30px',
            cursor: (isConnected || isSaving) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            fontWeight: '600',
            boxShadow: '0 4px 16px rgba(168, 216, 234, 0.4)'
          }}
          onMouseEnter={(e) => !(isConnected || isSaving) && (e.currentTarget.style.boxShadow = '0 6px 20px rgba(168, 216, 234, 0.6)')}
          onMouseLeave={(e) => !(isConnected || isSaving) && (e.currentTarget.style.boxShadow = '0 4px 16px rgba(168, 216, 234, 0.4)')}
        >
          {isSaving ? 'Saving...' : isConnected ? 'Connected' : 'Start Conversation'}
        </button>
        
        <button
          onClick={stopConversation}
          disabled={!isConnected}
          style={{
            background: !isConnected 
              ? '#E8E0F5' 
              : '#C99BB0',
            color: !isConnected ? '#C2B5D8' : '#FFFEF9',
            border: 'none',
            padding: '16px 48px',
            fontSize: '18px',
            borderRadius: '30px',
            cursor: !isConnected ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            fontWeight: '600',
            boxShadow: isConnected ? '0 4px 16px rgba(212, 165, 192, 0.4)' : 'none'
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