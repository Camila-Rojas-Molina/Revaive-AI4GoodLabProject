import openai
import os
from dotenv import load_dotenv

load_dotenv()
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_response(patient_message: str, conversation_history: list) -> str:
    system_prompt = """You are a warm, patient cognitive rehabilitation companion 
    for a post-surgical hospital patient. Your role is to deliver Cognitive 
    Stimulation Therapy through natural conversation. Ask open-ended questions 
    that invite the patient to share memories and opinions. Keep responses 
    under 3 sentences. Be warm and encouraging."""
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": patient_message})
    
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages
    )
    return response.choices[0].message.content