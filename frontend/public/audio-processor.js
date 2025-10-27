class AudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
      const input = inputs[0];
      if (!input || !input[0]) return true;
      
      const inputData = input[0]; // Float32Array
      
      // Convert Float32 to Int16 PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Send to main thread
      this.port.postMessage(pcm16.buffer);
      return true;
    }
  }
  
  registerProcessor('audio-processor', AudioProcessor);