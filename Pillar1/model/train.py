import os
import joblib
import warnings
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    classification_report, accuracy_score,
    recall_score, roc_auc_score, average_precision_score,
)
from sklearn.preprocessing import LabelEncoder

warnings.filterwarnings("ignore")

DATASET_PATH = "/Users/amy/Github/Testing/CogBridge database/pod_dataset_2.csv"
MODEL_OUT = os.path.join(os.path.dirname(__file__), "model.pkl")

FEATURE_COLS = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia", "surgical_category"]
CAT_COLS = ["gender", "admission_type", "surgical_category"]


def train():
    df = pd.read_csv(DATASET_PATH)
    print(f"Dataset shape: {df.shape}")
    print(f"\nClass distribution:\n{df['POD_label'].value_counts()}")

    df_model = df.copy()
    for col in CAT_COLS:
        df_model[col] = LabelEncoder().fit_transform(df_model[col].astype(str))

    X = df_model[FEATURE_COLS]
    y = df_model["POD_label"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )
    print(f"\nTrain size: {len(X_train)} | Test size: {len(X_test)}")

    best_rf = RandomForestClassifier(
        n_estimators=100,
        min_samples_split=5,
        min_samples_leaf=4,
        max_samples=0.8,
        max_features="sqrt",
        max_depth=7,
        criterion="entropy",
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    best_rf.fit(X_train, y_train)

    y_pred = best_rf.predict(X_test)
    y_proba = best_rf.predict_proba(X_test)[:, 1]

    print("\nTuned Random Forest — Evaluation")
    print(classification_report(y_test, y_pred, target_names=["No POD (0)", "POD (1)"]))
    print(f"Train accuracy : {accuracy_score(y_train, best_rf.predict(X_train)):.4f}")
    print(f"Test  accuracy : {accuracy_score(y_test, y_pred):.4f}")
    print(f"Recall         : {recall_score(y_test, y_pred):.4f}")
    print(f"ROC-AUC        : {roc_auc_score(y_test, y_proba):.4f}")
    print(f"Avg Precision  : {average_precision_score(y_test, y_proba):.4f}")

    cv_outer = StratifiedKFold(n_splits=5, shuffle=True, random_state=0)
    cv_scores = cross_val_score(best_rf, X, y, cv=cv_outer, scoring="recall", n_jobs=-1)
    print(f"\n5-fold outer CV Recall: {cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")

    print("\nFeature Importances:")
    for feat, imp in sorted(zip(FEATURE_COLS, best_rf.feature_importances_), key=lambda x: -x[1]):
        print(f"   {feat:<22} {imp:.3f}")

    joblib.dump(best_rf, MODEL_OUT)
    print(f"\nModel saved → {MODEL_OUT}")


if __name__ == "__main__":
    train()
