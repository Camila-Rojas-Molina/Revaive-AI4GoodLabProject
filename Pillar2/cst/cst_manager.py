import json
import os
import random
import datetime

def load_modules():
    path = os.path.join(os.path.dirname(__file__), "modules.json")
    with open(path, "r") as f:
        return json.load(f)

def get_theme_by_score(cognitive_score):
    if cognitive_score < 35:
        return "orientation"
    elif cognitive_score < 50:
        return "reminiscence"
    elif cognitive_score < 65:
        return "word_fluency"
    elif cognitive_score < 80:
        return "attention"
    else:
        return "current_affairs"

def get_difficulty(cognitive_score):
    if cognitive_score < 40:
        return "low"
    elif cognitive_score < 70:
        return "medium"
    else:
        return "high"

def get_prompts(cognitive_score):
    modules = load_modules()
    theme = get_theme_by_score(cognitive_score)
    difficulty = get_difficulty(cognitive_score)
    prompts = modules["themes"][theme][difficulty]
    selected = random.sample(prompts, min(3, len(prompts)))
    return theme, difficulty, selected

def build_system_prompt(patient_profile, cognitive_score=50):
    theme, difficulty, prompts = get_prompts(cognitive_score)
    prompts_text = "\n".join([f"- {p}" for p in prompts])

    return f"""You are a warm, patient cognitive rehabilitation companion for {patient_profile['name']}, 
a post-surgical hospital patient who used to work as a {patient_profile['career']} 
and whose family includes {patient_profile['family']}.

Personal background:
- Career: {patient_profile['career']}
- Family: {patient_profile['family']}
- Hobbies: {patient_profile['hobbies']}
- Hometown: {patient_profile['hometown']}

Your role is to deliver Cognitive Stimulation Therapy through natural conversation.

Today's theme is {theme}. Guide the conversation naturally toward this theme 
through genuine warm conversation — do NOT ask these questions directly or in order. 
Instead use them to understand the territory you should explore:
{prompts_text}

For example instead of asking "Tell me about your career" directly, you might say 
"You spent so many years as a {patient_profile['career']} — I'd love to hear what 
that was like for you" and let the conversation flow naturally from there.

Rules:
- Always invite sharing and reflection — never yes/no questions
- Reference the patient's personal details naturally
- Keep responses under 3 sentences
- If patient mentions pain or distress say: I think your nurse should know about 
  that — and end the session
- Never correct the patient harshly
- Be warm, encouraging, and patient"""