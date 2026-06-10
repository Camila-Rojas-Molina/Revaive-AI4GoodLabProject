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
    """
    Load a patient record from Supabase by patient_id.

    Returns a dict with all patient fields, including last_cri which the
    voice pipeline uses to detect significant score drops between sessions.
    Returns None if the patient is not found.
    """
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
    """
    Insert a new patient record into Supabase.
    Returns the inserted row (with generated id and timestamps).
    """
    db = _db()
    result = db.table("patients").insert(patient).execute()
    return result.data[0]