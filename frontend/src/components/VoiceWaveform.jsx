import { useEffect, useRef } from 'react';

function VoiceWaveform({ isActive, analyserNode }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isActive || !analyserNode) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Setup analyser
    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedVolume = average / 255.0; // 0 to 1

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale radius based on volume (pulse between 60px and 120px)
      const minRadius = 60;
      const maxRadius = 120;
      const currentRadius = minRadius + (normalizedVolume * (maxRadius - minRadius));

      // Create gradient from center outward
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius);
      gradient.addColorStop(0, '#E87C4D'); // Orange/coral center
      gradient.addColorStop(0.5, '#5A8E8C'); // Teal middle
      gradient.addColorStop(1, '#7A9B7F'); // Sage outer

      // Draw filled pulsing circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw outer glow ring
      ctx.strokeStyle = '#5A8E8C';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 20 + (normalizedVolume * 20); // Stronger glow when louder
      ctx.shadowColor = '#5A8E8C';
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, analyserNode]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      style={{
        display: isActive ? 'block' : 'none',
        marginBottom: '30px',
        background: 'transparent'
      }}
    />
  );
}

export default VoiceWaveform;

