"""Train the driving-risk classifier from the labeled route anomaly dataset."""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.model_selection import train_test_split

from app.ml.models import RiskPredictionModel
from app.ml.preprocessing import DataPreprocessor

BACKEND_DIR = Path(__file__).resolve().parent
DATASET_DIR = BACKEND_DIR / "datasets"
MODEL_DIR = BACKEND_DIR / "trained_models"
DATASET_PATH = DATASET_DIR / "driver_behavior_route_anomaly_dataset_with_derived_features.csv"


def load_training_data():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Labeled driving behavior data not found: {DATASET_PATH}")
    source = pd.read_csv(DATASET_PATH)
    label_column = "route_anomaly" if "route_anomaly" in source else "anomalous_event"
    required = {"speed", "acceleration", "brake_usage", label_column}
    missing = required.difference(source.columns)
    if missing:
        raise ValueError(f"Training dataset is missing columns: {', '.join(sorted(missing))}")

    # Keep the live prediction contract consistent with the six deployed features.
    frame = pd.DataFrame({
        "speed": pd.to_numeric(source["speed"], errors="coerce"),
        "acceleration": pd.to_numeric(source["acceleration"], errors="coerce"),
        "braking": -pd.to_numeric(source["brake_usage"], errors="coerce").abs(),
    })
    frame["harsh_braking"] = (frame["braking"].abs() >= 8).astype(int)
    frame["harsh_acceleration"] = (frame["acceleration"] >= 3).astype(int)
    frame["speeding"] = (frame["speed"] > 80).astype(int)
    frame["risk_level"] = pd.to_numeric(source[label_column], errors="coerce").map({0: "LOW", 1: "HIGH"})
    frame = frame.replace([float("inf"), -float("inf")], pd.NA).dropna()
    if frame["risk_level"].nunique() < 2:
        raise ValueError("Training data must contain both normal and anomalous events")
    return frame, label_column


def train_risk_model():
    frame, label_column = load_training_data()
    preprocessor = DataPreprocessor()
    X = preprocessor.prepare_features(frame)
    y = preprocessor.prepare_labels(frame, "risk_level")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train_scaled, X_test_scaled = preprocessor.scale_features(X_train, X_test)

    model = RiskPredictionModel("random_forest")
    model.model.set_params(
        n_estimators=120,
        class_weight="balanced_subsample",
        max_leaf_nodes=128,
        min_samples_leaf=12,
        n_jobs=-1,
    )
    model.train(X_train_scaled, y_train)
    metrics = model.evaluate(X_test_scaled, y_test)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(MODEL_DIR / "risk_prediction_model.pkl")
    joblib.dump(preprocessor, MODEL_DIR / "preprocessor.pkl")
    joblib.dump({
        "source": DATASET_PATH.name,
        "label": label_column,
        "rows_used": len(frame),
        "class_names": preprocessor.label_encoder.classes_.tolist(),
        "metrics": metrics,
    }, MODEL_DIR / "training_metadata.pkl")

    print(f"Trained on {len(frame):,} labeled events from {DATASET_PATH.name}")
    print(f"Labels: {frame['risk_level'].value_counts().to_dict()}")
    print("Holdout metrics:", {key: value for key, value in metrics.items() if key != "confusion_matrix"})
    print(f"Saved model and preprocessing artifacts in {MODEL_DIR}")
    return model, preprocessor


if __name__ == "__main__":
    train_risk_model()
