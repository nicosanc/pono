import openai
import os
from dotenv import load_dotenv
from app.services.coach_prompts import SOCIAL_COACH_PROMPT

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

def get_coach_response(user_message: str, conversation_history: list = None) -> str:
    system_prompt = SOCIAL_COACH_PROMPT

    messages = [{'role': 'system', 'content': system_prompt}]
    if conversation_history:
        # .extend() adds the items of the conversation_history list to the messages list, all items from an iterable
        messages.extend(conversation_history)
    messages.append({'role': 'user', 'content': user_message})

    response = openai.Chat.Completions.create(
        model="gpt-4o",
        messages=messages
    )
    return response.choices[0].message.content