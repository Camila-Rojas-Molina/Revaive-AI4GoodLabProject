import json
import os

def load_patient(patient_id: str) -> dict:
    path = os.path.join(os.path.dirname(__file__), "../data/patients.json")
    with open(path, "r") as f:
        data = json.load(f)
    
    for patient in data["patients"]:
        if patient["id"] == patient_id:
            return patient
    
    return None

def save_patient(patient: dict):
    path = os.path.join(os.path.dirname(__file__), "../data/patients.json")
    with open(path, "r") as f:
        data = json.load(f)
    
    data["patients"].append(patient)
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2)