import base64
import wave
import io

def combine_and_convert_audio(base64_chunks: list[str]) -> bytes:
    """
    Convert list of base64 pcm16 chunks to wav format for Hume
    """

    # Convert base64 chunks to bytes
    audio_chunks = [base64.b64decode(chunk) for chunk in base64_chunks]

    # Combine chunks into bytes
    pcm_data = b''.join(audio_chunks)

    # Convert to wav file
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setframerate(24000)
        wav_file.setsampwidth(2)
        wav_file.writeframes(pcm_data)
    

    return buffer.getvalue()
