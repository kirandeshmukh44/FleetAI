"""Train the fleet behavior anomaly model from the bundled labeled events."""
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from app.ml.models import RiskPredictionModel
from app.ml.preprocessing import DataPreprocessor

BACKEND_DIR = Path(__file__).resolve().parent
DATASET_DIR = BACKEND_DIR / "datasets"
MODEL_DIR = BACKEND_DIR / "trained_models"
DATASET_PATH = DATASET_DIR / "driver_behavior_route_anomaly_dataset_with_derived_features.csv"
LABEL_COLUMN = "anomalous_event"
FEATURE_COLUMNS = ["speed", "acceleration", "braking", "harsh_braking", "harsh_acceleration", "speeding"]
SOURCE_COLUMNS = ["timestamp", "driver_id", "vehicle_id", "speed", "acceleration", "brake_usage", LABEL_COLUMN]


def load_training_data():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Labeled driving behavior data not found: {DATASET_PATH}")
    source = pd.read_csv(DATASET_PATH, usecols=SOURCE_COLUMNS, parse_dates=["timestamp"])
    source = source.sort_values("timestamp", kind="stable").reset_index(drop=True)
    frame = pd.DataFrame({
        "speed": pd.to_numeric(source["speed"], errors="coerce"),
        "acceleration": pd.to_numeric(source["acceleration"], errors="coerce"),
        # Live inference and training use the same signed braking convention.
        "braking": -pd.to_numeric(source["brake_usage"], errors="coerce").abs(),
    })
    frame["harsh_braking"] = (frame["braking"].abs() >= 8).astype(int)
    frame["harsh_acceleration"] = (frame["acceleration"] >= 3).astype(int)
    frame["speeding"] = (frame["speed"] > 80).astype(int)
    labels = pd.to_numeric(source[LABEL_COLUMN], errors="coerce")
    frame["risk_level"] = labels.map({0: "LOW", 1: "HIGH"})
    valid = frame.replace([np.inf, -np.inf], np.nan).notna().all(axis=1) & source["timestamp"].notna()
    frame = frame.loc[valid].reset_index(drop=True)
    source = source.loc[valid].reset_index(drop=True)
    if frame["risk_level"].nunique() < 2:
        raise ValueError("Training data must contain both normal and anomalous events")
    return frame, source


def train_risk_model():
    frame, source = load_training_data()
    # Keep the newest 20% of records as an out-of-time holdout to better reflect
    # using earlier trips to score future behavior.
    split_at = int(len(frame) * 0.8)
    train_frame, test_frame = frame.iloc[:split_at], frame.iloc[split_at:]
    if train_frame["risk_level"].nunique() < 2 or test_frame["risk_level"].nunique() < 2:
        raise ValueError("Chronological train and holdout periods must each contain both event classes")

    preprocessor = DataPreprocessor()
    X_train = preprocessor.prepare_features(train_frame)
    X_test = preprocessor.prepare_features(test_frame)
    y_train = preprocessor.prepare_labels(train_frame, "risk_level")
    y_test = preprocessor.label_encoder.transform(test_frame["risk_level"])
    X_train_scaled, X_test_scaled = preprocessor.scale_features(X_train, X_test)

    model = RiskPredictionModel("random_forest")
    model.model.set_params(
        n_estimators=180,
        max_depth=18,
        min_samples_leaf=12,
        max_features="sqrt",
        class_weight="balanced_subsample",
        n_jobs=2,
        random_state=42,
    )
    model.train(X_train_scaled, y_train)
    predicted = model.predict(X_test_scaled)
    high_index = list(preprocessor.label_encoder.classes_).index("HIGH")
    high_class = int(preprocessor.label_encoder.transform(["HIGH"])[0])
    high_probability = model.predict_proba(X_test_scaled)[:, high_index]
    high_actual = (y_test == high_class).astype(int)
    high_predicted = (predicted == high_class).astype(int)
    metrics = {
        "accuracy": float(accuracy_score(y_test, predicted)),
        "balanced_accuracy": float(balanced_accuracy_score(y_test, predicted)),
        "macro_f1": float(f1_score(y_test, predicted, average="macro", zero_division=0)),
        "high_precision": float(precision_score(high_actual, high_predicted, zero_division=0)),
        "high_recall": float(recall_score(high_actual, high_predicted, zero_division=0)),
        "high_f1": float(f1_score(high_actual, high_predicted, zero_division=0)),
        "high_average_precision": float(average_precision_score(high_actual, high_probability)),
        "high_roc_auc": float(roc_auc_score(high_actual, high_probability)),
        "confusion_matrix": confusion_matrix(y_test, predicted, labels=range(len(preprocessor.label_encoder.classes_))).tolist(),
        "class_names": preprocessor.label_encoder.classes_.tolist(),
    }

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(MODEL_DIR / "risk_prediction_model.pkl")
    joblib.dump(preprocessor, MODEL_DIR / "preprocessor.pkl")
    joblib.dump({
        "model_name": "Random Forest behavior event classifier",
        "source": DATASET_PATH.name,
        "label": LABEL_COLUMN,
        "label_description": "Observed anomalous driving event in the bundled development dataset",
        "rows_used": int(len(frame)),
        "train_rows": int(len(train_frame)),
        "holdout_rows": int(len(test_frame)),
        "class_counts": {str(key): int(value) for key, value in frame["risk_level"].value_counts().items()},
        "driver_count": int(source["driver_id"].nunique()),
        "vehicle_count": int(source["vehicle_id"].nunique()),
        "period_start": source["timestamp"].min().isoformat(),
        "period_end": source["timestamp"].max().isoformat(),
        "holdout_method": "chronological last 20%",
        "features": FEATURE_COLUMNS,
        "metrics": metrics,
        "feature_importance": {
            name: float(value)
            for name, value in zip(FEATURE_COLUMNS, model.model.feature_importances_)
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "limitations": [
            "The bundled dataset contains only five driver IDs and five vehicle IDs.",
            "Its timestamp coverage is short and does not establish performance on a real fleet.",
            "Predictions are behavior anomaly alerts, not crash predictions.",
        ],
    }, MODEL_DIR / "training_metadata.pkl")

    print(f"Trained on {len(frame):,} behavior events from {DATASET_PATH.name}")
    print(f"Class counts: {frame['risk_level'].value_counts().to_dict()}")
    print(f"Chronological holdout: {len(test_frame):,} events")
    print("Holdout metrics:", {key: value for key, value in metrics.items() if key not in {"confusion_matrix", "class_names"}})
    print("Feature importance:", dict(zip(FEATURE_COLUMNS, model.model.feature_importances_.tolist())))
    print(f"Saved model artifacts to {MODEL_DIR}")
    return model, preprocessor, metrics


if __name__ == "__main__":
    train_risk_model()
