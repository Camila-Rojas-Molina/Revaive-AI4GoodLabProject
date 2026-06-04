import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
from sklearn.preprocessing import LabelEncoder
import xgboost as xgb
import pickle
import os

# TODO: set DATASET_PATH once dataset is confirmed
# Expected: CSV with columns matching RISK_FEATURES + 'pod_label' (0 or 1)
DATASET_PATH = "Pillar1/data/dataset.csv"
MODEL_OUT = os.path.join(os.path.dirname(__file__), "model.pkl")

CATEGORICAL_COLS = ["sex", "surgery_type"]


def train():
    df = pd.read_csv(DATASET_PATH)

    for col in CATEGORICAL_COLS:
        le = LabelEncoder()
        df[col] = le.fit_transform(df[col].fillna("unknown"))

    feature_cols = ["age", "sex", "surgery_type", "anesthesia_duration_min", "comorbidity_count", "baseline_orientation_score"]
    X = df[feature_cols].fillna(0)
    y = df["pod_label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    model = xgb.XGBClassifier(n_estimators=100, max_depth=4, use_label_encoder=False, eval_metric="logloss", random_state=42)
    model.fit(X_train, y_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    print(f"AUC-ROC: {roc_auc_score(y_test, y_pred_proba):.3f}")
    print(classification_report(y_test, y_pred))

    with open(MODEL_OUT, "wb") as f:
        pickle.dump(model, f)
    print(f"Model saved to {MODEL_OUT}")


if __name__ == "__main__":
    train()
