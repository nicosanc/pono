""" # Send audio to hume
            if audio_chunks:
                #conver pcm16 chunks to wav file
                full_audio_bytes = combine_and_convert_audio(audio_chunks)

                # Send to Hume
                emotion_data = await analyze_emotion_with_hume(full_audio_bytes)
                if isinstance(emotion_data, StreamErrorMessage):
                    logger.error(f"Hume API Error: {emotion_data.error}")
                else:
                    emotion_payload = emotion_data.model_dump()
                    # Store it in DB
                    conversation.emotion_data = emotion_payload
                    db.commit() """
