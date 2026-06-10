import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env"))

def _db():
    return create_client(
        os.environ["NEXT_PUBLIC_SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

def load_patient(patient_id: str) -> dict:
    db = _db()
    result = (
        db.table("patients")
        .select("*")
        .eq("id", patient_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        print(f"Warning: patient '{patient_id}' not found in database.")
        return None
    return result.data[0]

def save_patient(patient: dict) -> dict:
    db = _db()
    result = db.table("patients").insert(patient).execute()
    return result.data[0]
