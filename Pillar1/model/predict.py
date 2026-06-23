import os
import joblib
import pandas as pd

BASE_DIR = os.path.dirname(__file__) if os.path.dirname(__file__) else "."
MAIN_MODEL_PATH     = os.path.join(BASE_DIR, "model.pkl")
FALLBACK_MODEL_PATH = os.path.join(BASE_DIR, "model_no_service.pkl")

# Lazy-load models to preserve memory during module compilation
model_main = None
model_fallback = None

GENDER_MAP = {"F": 0, "M": 1}
ADMISSION_TYPE_MAP = {
    "DIRECT EMER.": 0, "ELECTIVE": 1, "EW EMER.": 2,
    "SURGICAL SAME DAY ADMISSION": 3, "URGENT": 4,
}

# Match the service codes present in the current training dataset.
# Any other service strings should route to the fallback model.
SERVICE_MAP = {
    "CMED – Cardiac Medical":    0,
    "CSURG – Cardiac Surgery":   1,
    "GYN – Gynecological":       2,
    "MED – General Medicine":    3,
    "NMED – Neurologic Medical": 4,
    "NSURG – Neurologic Surgery":5,
    "SURG – General Surgery":    6,
    "TRAUM – Trauma":            7,
    "TSURG – Thoracic Surgery":  8,
    "VSURG – Vascular Surgery":  9,
}

# CRITICAL FIX: Explicitly list feature column orders to match training sets exactly
FEATURES_MAIN     = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia", "curr_service"]
FEATURES_FALLBACK = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia"]

def predict(features: dict) -> dict:
    global model_main, model_fallback
    
    # Check if the intake service string exists in our training dictionary
    intake_service = features.get("curr_service")
    is_service_known = intake_service in SERVICE_MAP
    
    # Map general categorical features common to both paths
    base_data = {
        "anchor_age":     int(features["anchor_age"]),
        "gender":         GENDER_MAP[features["gender"]],
        "admission_type": ADMISSION_TYPE_MAP[features["admission_type"]],
        "prior_delirium": int(features["prior_delirium"]),
        "dementia":       int(features["dementia"]),
    }
    
    # Dynamic Router Logic
    if is_service_known:
        if model_main is None:
            model_main = joblib.load(MAIN_MODEL_PATH)
            
        base_data["curr_service"] = SERVICE_MAP[intake_service]
        
        # FIXED: Create dataframe and explicitly force the column order
        df_input = pd.DataFrame([base_data])[FEATURES_MAIN]
        
        # Pull threshold evaluation parameters for Model 1
        proba = model_main.predict_proba(df_input)[0][1]
        threshold = 0.45
    else:
        if model_fallback is None:
            model_fallback = joblib.load(FALLBACK_MODEL_PATH)
            
        # FIXED: Create dataframe and explicitly force the fallback column order
        df_input = pd.DataFrame([base_data])[FEATURES_FALLBACK]
        
        # Pull threshold evaluation parameters for Model 2 (Fallback)
        proba = model_fallback.predict_proba(df_input)[0][1]
        threshold = 0.50

    # Determine risk label based on respective model threshold properties
    label = "high" if proba >= threshold else "low"
    confidence = round(float(proba if label == "high" else (1.0 - proba)), 3)
    
    return {
        "label": label, 
        "confidence": confidence, 
        "model_used": "main_6_feature" if is_service_known else "fallback_5_feature"
    }