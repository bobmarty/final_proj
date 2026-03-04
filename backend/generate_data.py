import pandas as pd
import numpy as np
import random
import os

from database import SessionLocal, engine
from models import Base, CompanyESG
import ml_pipeline

def generate_mock_data(num_samples=200):
    np.random.seed(42)
    random.seed(42)
    
    companies = [f"Company {chr(65 + (i % 26))}{i}" for i in range(num_samples)]
    
    # Generate realistic-looking base features
    env_scores = np.random.normal(loc=60, scale=15, size=num_samples).clip(0, 100)
    soc_scores = np.random.normal(loc=65, scale=12, size=num_samples).clip(0, 100)
    gov_scores = np.random.normal(loc=70, scale=10, size=num_samples).clip(0, 100)
    carbon_footprint = np.random.normal(loc=500, scale=200, size=num_samples).clip(10, 2000)
    board_diversity = np.random.normal(loc=30, scale=10, size=num_samples).clip(0, 100)
    community_investment = np.random.normal(loc=1_000_000, scale=500_000, size=num_samples).clip(0, 5_000_000)
    
    df = pd.DataFrame({
        "company_name": companies,
        "environmental_score": env_scores,
        "social_score": soc_scores,
        "governance_score": gov_scores,
        "carbon_footprint": carbon_footprint,
        "board_diversity": board_diversity,
        "community_investment": community_investment
    })
    
    # Introduce some anomalies (e.g. extremely low scores or extremely high carbon footprint)
    anomaly_indices = random.sample(range(num_samples), int(num_samples * 0.05))
    for idx in anomaly_indices:
        df.loc[idx, "environmental_score"] = random.uniform(0, 20)
        df.loc[idx, "carbon_footprint"] = random.uniform(1500, 2500)
        
    return df

def seed_database():
    print("Generating mock dataset...")
    df = generate_mock_data(300)
    
    # Save raw CSV to meet Step 2 requirement
    csv_path = "esg_dataset.csv"
    df.to_csv(csv_path, index=False)
    print(f"Dataset saved to {csv_path}")

    print("Training ML models (Random Forest, Isolation Forest)...")
    ml_pipeline.train_models(df)
    
    print("Populating the database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clear existing data
    db.query(CompanyESG).delete()
    
    for _, row in df.iterrows():
        # Use trained model to get final values for the DB
        features = {
            "environmental_score": row["environmental_score"],
            "social_score": row["social_score"],
            "governance_score": row["governance_score"],
            "carbon_footprint": row["carbon_footprint"],
            "board_diversity": row["board_diversity"],
            "community_investment": row["community_investment"]
        }
        
        prediction = ml_pipeline.predict_esg(features)
        
        db_item = CompanyESG(
            company_name=row["company_name"],
            environmental_score=row["environmental_score"],
            social_score=row["social_score"],
            governance_score=row["governance_score"],
            carbon_footprint=row["carbon_footprint"],
            board_diversity=row["board_diversity"],
            community_investment=row["community_investment"],
            overall_esg_score=prediction["predicted_esg_score"],
            is_anomaly=prediction["is_anomaly"],
            performance_category=prediction["performance_category"]
        )
        db.add(db_item)
    
    db.commit()
    db.close()
    print("Database seeded successfully with predictions and anomaly flags!")

if __name__ == "__main__":
    seed_database()
