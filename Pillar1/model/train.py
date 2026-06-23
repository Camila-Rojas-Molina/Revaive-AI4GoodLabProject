import os
import joblib
import pandas as pd
import numpy as np
from xgboost import XGBClassifier

# Define paths relative to this script file
BASE_DIR = os.path.dirname(__file__) if os.path.dirname(__file__) else "."
MODEL_OUT            = os.path.join(BASE_DIR, "model.pkl")
MODEL_NO_SERVICE_OUT = os.path.join(BASE_DIR, "model_no_service.pkl")
DATASET_PATH         = os.path.join(BASE_DIR, "mimic_processed_for_pod.csv")

# Configuration constants
FEATURE_COLS            = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia", "curr_service"]
FEATURE_COLS_NO_SERVICE = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia"]

def train():
    df = pd.read_csv(DATASET_PATH)
    print(f"Dataset shape: {df.shape}")
    
    # 1. Clean and isolate target arrays
    df_model = df.copy()
    cat_cols = ['gender', 'admission_type', 'curr_service']
    for col in cat_cols:
        df_model[col] = pd.factorize(df_model[col].astype(str))[0]
        
    y = df_model["POD_label"].astype(int)

    # ── Model 1: Main Model (6 features, handles known curr_services) ──────────
    X_main = df_model[FEATURE_COLS]
    main_xgb = XGBClassifier(
        n_estimators     = 500,
        max_depth        = 7,
        learning_rate    = 0.1,
        subsample        = 0.6,
        colsample_bytree = 1.0,
        scale_pos_weight = 4.207142309755537,
        eval_metric      = 'logloss',
        random_state     = 42,
        use_label_encoder=False
    )
    print("Training main XGBoost model...")
    main_xgb.fit(X_main, y)
    joblib.dump(main_xgb, MODEL_OUT)
    print(f"Saved Main Model → {MODEL_OUT}")

    # ── Model 2: Fallback Model (5 features, isolates unknown services) ───────
    X_fallback = df_model[FEATURE_COLS_NO_SERVICE]
    fallback_xgb = XGBClassifier(
        n_estimators     = 300,
        max_depth        = 5,
        learning_rate    = 0.01,
        subsample        = 0.6,
        colsample_bytree = 0.7,
        scale_pos_weight = 4.207142309755537,
        eval_metric      = 'logloss',
        random_state     = 42,
        use_label_encoder=False
    )
    print("Training fallback XGBoost model...")
    fallback_xgb.fit(X_fallback, y)
    joblib.dump(fallback_xgb, MODEL_NO_SERVICE_OUT)
    print(f"Saved Fallback Model → {MODEL_NO_SERVICE_OUT}")

if __name__ == "__main__":
    train()