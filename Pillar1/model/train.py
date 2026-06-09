import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

DATASET_PATH = "Pillar1/data/pod_dataset.csv"  # update to your actual filename
MODEL_OUT = os.path.join(os.path.dirname(__file__), "model", "model.pkl")

GENDER_MAP = {"F": 0, "M": 1}
ADMISSION_TYPE_MAP = {
    "DIRECT EMER.": 0, "ELECTIVE": 1, "EW EMER.": 2,
    "SURGICAL SAME DAY ADMISSION": 3, "URGENT": 4,
}
SURGICAL_CATEGORY_MAP = {"Neurosurgery": 0, "Other": 1, "Unknown": 2}


def train():
    df = pd.read_csv(DATASET_PATH)

    df["gender_enc"] = df["gender"].map(GENDER_MAP)
    df["admission_enc"] = df["admission_type"].map(ADMISSION_TYPE_MAP)
    df["surgical_enc"] = df["surgical_category"].map(SURGICAL_CATEGORY_MAP)

    feature_cols = [
        "anchor_age", "gender_enc", "admission_enc",
        "prior_delirium", "dementia", "surgical_enc"
    ]
    X = df[feature_cols].fillna(0)
    y = df["POD_label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    print(f"AUC-ROC: {roc_auc_score(y_test, y_pred_proba):.3f}")
    print(classification_report(y_test, y_pred))

    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    joblib.dump(model, MODEL_OUT)
    print(f"Model saved to {MODEL_OUT}")


if __name__ == "__main__":
    train()