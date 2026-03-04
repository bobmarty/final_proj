import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_squared_error
import joblib
import os

MODEL_PATH = "rf_model.pkl"
ANOMALY_PATH = "iso_forest.pkl"
SCALER_PATH = "scaler.pkl"

def get_performance_category(score):
    if score >= 75:
        return "Good"
    elif score >= 50:
        return "Moderate"
    else:
        return "Poor"

def train_models(df: pd.DataFrame):
    # Features
    X = df[['environmental_score', 'social_score', 'governance_score', 'carbon_footprint', 'board_diversity', 'community_investment']]
    # Target (Synthetic: roughly based on E, S, G + some noise)
    # If target doesn't exist, we assume the dataset needs it generated for training
    if 'overall_esg_score' not in df.columns:
        df['overall_esg_score'] = (df['environmental_score'] * 0.4 + 
                                   df['social_score'] * 0.3 + 
                                   df['governance_score'] * 0.3) - (df['carbon_footprint'] * 0.05) + (df['board_diversity'] * 5) + (df['community_investment'] * 0.1)
        # Normalize target roughly to 0-100
        min_score = df['overall_esg_score'].min()
        max_score = df['overall_esg_score'].max()
        df['overall_esg_score'] = (df['overall_esg_score'] - min_score) / (max_score - min_score) * 100
        
    y = df['overall_esg_score']

    # Preprocessing
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

    # Train Random Forest
    rf = RandomForestRegressor(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = rf.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    print(f"Random Forest R2 Score: {r2:.4f}")

    # Train Isolation Forest for Anomaly Detection
    iso_forest = IsolationForest(contamination=0.05, random_state=42)
    iso_forest.fit(X_scaled)

    # Save models
    joblib.dump(rf, MODEL_PATH)
    joblib.dump(iso_forest, ANOMALY_PATH)
    joblib.dump(scaler, SCALER_PATH)

    print("Models trained and saved successfully.")

def predict_esg(features: dict):
    if not (os.path.exists(MODEL_PATH) and os.path.exists(ANOMALY_PATH) and os.path.exists(SCALER_PATH)):
        raise RuntimeError("Models not trained yet.")
    
    rf = joblib.load(MODEL_PATH)
    iso_forest = joblib.load(ANOMALY_PATH)
    scaler = joblib.load(SCALER_PATH)

    # Convert to dataframe for scaling
    df = pd.DataFrame([features])
    X_scaled = scaler.transform(df)

    score = rf.predict(X_scaled)[0]
    
    # Isolation forest returns -1 for anomaly, 1 for normal
    anomaly_pred = iso_forest.predict(X_scaled)[0]
    is_anomaly = bool(anomaly_pred == -1)

    category = get_performance_category(score)

    return {
        "predicted_esg_score": float(score),
        "is_anomaly": is_anomaly,
        "performance_category": category
    }
