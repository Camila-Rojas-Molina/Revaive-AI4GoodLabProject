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

DATASET_PATH           = os.path.join(os.path.dirname(__file__), "pod_dataset_2_curr_service.csv")
MODEL_OUT              = os.path.join(os.path.dirname(__file__), "model.pkl")
MODEL_NO_SERVICE_OUT   = os.path.join(os.path.dirname(__file__), "model_no_service.pkl")

FEATURE_COLS            = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia", "curr_service"]
FEATURE_COLS_NO_SERVICE = ["anchor_age", "gender", "admission_type", "prior_delirium", "dementia"]
CAT_COLS               = ["gender", "admission_type", "curr_service"]

RF_PARAMS = dict(
    n_estimators      = 100,
    min_samples_split = 20,
    min_samples_leaf  = 2,
    max_samples       = 0.8,
    max_features      = 0.7,
    max_depth         = 5,
    criterion         = "gini",
    class_weight      = "balanced_subsample",
)


def _evaluate(label, clf, X_tr, X_te, y_tr, y_te, feature_cols):
    y_pred  = clf.predict(X_te)
    y_proba = clf.predict_proba(X_te)[:, 1]
    print(f"\n── {label} ──")
    print(classification_report(y_te, y_pred, target_names=["No POD (0)", "POD (1)"]))
    print(f"Train accuracy : {accuracy_score(y_tr, clf.predict(X_tr)):.4f}")
    print(f"Test  accuracy : {accuracy_score(y_te, y_pred):.4f}")
    print(f"Recall         : {recall_score(y_te, y_pred):.4f}")
    print(f"ROC-AUC        : {roc_auc_score(y_te, y_proba):.4f}")
    print(f"Avg Precision  : {average_precision_score(y_te, y_proba):.4f}")
    print("\nFeature Importances:")
    for feat, imp in sorted(zip(feature_cols, clf.feature_importances_), key=lambda x: -x[1]):
        print(f"   {feat:<22} {imp:.3f}")


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

    # ── Main model (6 features, curr_service known) ──────────────
    main_rf = RandomForestClassifier(**RF_PARAMS)
    main_rf.fit(X_train, y_train)
    _evaluate("Main model (6 features)", main_rf,
              X_train, X_test, y_train, y_test, FEATURE_COLS)
    joblib.dump(main_rf, MODEL_OUT)
    print(f"\nMain model saved → {MODEL_OUT}")

    # ── Fallback model (5 features, no curr_service) ─────────────
    X_train_ns = X_train[FEATURE_COLS_NO_SERVICE]
    X_test_ns  = X_test[FEATURE_COLS_NO_SERVICE]
    fallback_rf = RandomForestClassifier(**RF_PARAMS)
    fallback_rf.fit(X_train_ns, y_train)
    _evaluate("Fallback model (5 features, no service)", fallback_rf,
              X_train_ns, X_test_ns, y_train, y_test, FEATURE_COLS_NO_SERVICE)
    joblib.dump(fallback_rf, MODEL_NO_SERVICE_OUT)
    print(f"\nFallback model saved → {MODEL_NO_SERVICE_OUT}")


if __name__ == "__main__":
    train()
