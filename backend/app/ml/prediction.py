import numpy as np
import joblib
import os
from app.ml.models import RiskPredictionModel
from app.ml.preprocessing import DataPreprocessor

class RiskPredictor:
    def __init__(self):
        self.model = None
        self.preprocessor = None
        self.is_loaded = False
        self.load_model()
    
    def load_model(self):
        """Load the trained model and preprocessor"""
        try:
            # Get the backend directory (parent of app directory)
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            model_dir = os.path.join(backend_dir, 'trained_models')
            model_path = os.path.join(model_dir, 'risk_prediction_model.pkl')
            preprocessor_path = os.path.join(model_dir, 'preprocessor.pkl')
            
            if os.path.exists(model_path) and os.path.exists(preprocessor_path):
                self.model = RiskPredictionModel()
                self.model.load_model(model_path)
                self.preprocessor = joblib.load(preprocessor_path)
                self.is_loaded = True
                print("Risk prediction model loaded successfully")
            else:
                print("Trained model not found. Using fallback prediction.")
        except Exception as e:
            print(f"Error loading model: {e}")
    
    def predict_risk(self, features):
        """Predict risk level from features"""
        if not self.is_loaded:
            # Fallback: simple rule-based prediction
            return self._fallback_prediction(features)
        
        try:
            # Prepare features
            X = np.array([[
                features.get('speed', 0),
                features.get('acceleration', 0),
                features.get('braking', 0),
                features.get('harsh_braking', 0),
                features.get('harsh_acceleration', 0),
                features.get('speeding', 0)
            ]])
            
            # Scale features
            X_scaled = self.preprocessor.scaler.transform(X)
            
            # Get prediction
            probabilities = self.model.predict_proba(X_scaled)[0]
            classes = self.preprocessor.label_encoder.inverse_transform(self.model.model.classes_)
            probability_by_label = dict(zip(classes, probabilities))
            risk_probability = float(probability_by_label.get('HIGH', 0.0))
            # The training labels are observed normal/anomaly events. Medium is
            # an operational band for uncertain anomaly probabilities.
            risk_level = 'HIGH' if risk_probability >= 0.65 else 'MEDIUM' if risk_probability >= 0.35 else 'LOW'
            
            return {
                'risk_level': risk_level,
                'risk_probability': risk_probability,
                'model_used': 'Random Forest · route anomaly data',
                'is_fallback': False
            }
        except Exception as e:
            print(f"Error in prediction: {e}")
            return self._fallback_prediction(features)
    
    def _fallback_prediction(self, features):
        """Fallback rule-based prediction"""
        score = 0
        
        if features.get('speed', 0) > 80:
            score += 2
        if features.get('harsh_braking', 0) == 1:
            score += 3
        if features.get('harsh_acceleration', 0) == 1:
            score += 2
        if features.get('speeding', 0) == 1:
            score += 2
        if abs(features.get('braking', 0)) > 5:
            score += 2
        
        if score >= 5:
            risk_level = 'HIGH'
            risk_probability = 0.7 + (score - 5) * 0.05
        elif score >= 3:
            risk_level = 'MEDIUM'
            risk_probability = 0.4 + (score - 3) * 0.1
        else:
            risk_level = 'LOW'
            risk_probability = 0.2 + score * 0.05
        
        risk_probability = min(risk_probability, 0.95)
        
        return {
            'risk_level': risk_level,
            'risk_probability': risk_probability,
            'model_used': 'Rule-based Fallback',
            'is_fallback': True
        }

# Global predictor instance
risk_predictor = RiskPredictor()
