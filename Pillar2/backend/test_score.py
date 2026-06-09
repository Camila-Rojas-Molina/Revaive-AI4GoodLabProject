from datetime import datetime, timedelta
from cognitive_scorer import Turn, score_session, session_to_dict
import json

base = datetime(2026, 6, 10, 9, 0, 0)

transcript = [
    Turn('bot', 'Good morning! Can you tell me what day it is today?', base, base + timedelta(seconds=4)),
    Turn('patient', 'It is Tuesday morning. I remember because my daughter visits on Tuesdays.', base + timedelta(seconds=5), base + timedelta(seconds=11)),
    Turn('bot', 'Wonderful. Can you describe a favourite memory from your childhood?', base + timedelta(seconds=12), base + timedelta(seconds=18)),
    Turn('patient', 'I grew up in a small town. Every summer we gathered at the lake swimming and laughing until sunset.', base + timedelta(seconds=20), base + timedelta(seconds=35)),
]

result = score_session(transcript, patient_id='patient_001', session_id='test_session_001', baseline_cri=68.0)
print(json.dumps(session_to_dict(result), indent=2))
