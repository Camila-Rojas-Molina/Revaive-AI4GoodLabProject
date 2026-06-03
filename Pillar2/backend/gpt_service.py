import openai
import os
import sys
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

cst_path = os.path.join(os.path.dirname(__file__), "../")
sys.path.append(cst_path)
from cst.cst_manager import build_system_prompt

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def get_response(patient_message: str, conversation_history: list, patient_profile: dict = None, cognitive_score: int = 50) -> str:
    
    if patient_profile is None:
        patient_profile = {
            "name": "the patient",
            "career": "their previous occupation",
            "family": "their family"
        }
    
    system_prompt = build_system_prompt(patient_profile, cognitive_score)
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": patient_message})
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages
    )
    return response.choices[0].message.content
