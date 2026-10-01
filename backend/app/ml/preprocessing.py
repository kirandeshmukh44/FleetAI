import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

class DataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
    
    def prepare_features(self, df):
        """Prepare features for ML model training"""
        features = []
        
        if 'speed' in df.columns:
            features.append(df['speed'].values)
        if 'acceleration' in df.columns:
            features.append(df['acceleration'].values)
        if 'braking' in df.columns:
            features.append(df['braking'].values)
        if 'harsh_braking' in df.columns:
            features.append(df['harsh_braking'].astype(int).values)
        if 'harsh_acceleration' in df.columns:
            features.append(df['harsh_acceleration'].astype(int).values)
        if 'speeding' in df.columns:
            features.append(df['speeding'].astype(int).values)
        
        if not features:
            raise ValueError("No valid features found in dataframe")
        
        X = np.column_stack(features)
        return X
    
    def prepare_labels(self, df, label_column='risk_level'):
        """Prepare labels for classification"""
        if label_column not in df.columns:
            raise ValueError(f"Label column '{label_column}' not found")
        
        y = self.label_encoder.fit_transform(df[label_column])
        return y
    
    def split_data(self, X, y, test_size=0.2, random_state=42):
        """Split data into train and test sets"""
        return train_test_split(X, y, test_size=test_size, random_state=random_state)
    
    def scale_features(self, X_train, X_test=None):
        """Scale features using StandardScaler"""
        X_train_scaled = self.scaler.fit_transform(X_train)
        
        if X_test is not None:
            X_test_scaled = self.scaler.transform(X_test)
            return X_train_scaled, X_test_scaled
        
        return X_train_scaled
