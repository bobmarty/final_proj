"""
Seed the database from academic_esg_dataset.csv using the trained hybrid model.
Uses LightGBM-only for bulk prediction (TabNet is slow on batch macOS runs).
Run train.py first to generate the required .pkl and .zip artifacts.
"""
import os
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import pandas as pd
import numpy as np
import joblib
from database import SessionLocal, init_db
import models

DATASET_PATH = "academic_esg_dataset.csv"

def get_performance_category(score: float) -> str:
    if score >= 75:
        return "Good"
    elif score >= 50:
        return "Moderate"
    return "Poor"


def safe_float(val):
    try:
        v = float(val)
        return None if np.isnan(v) else v
    except Exception:
        return None


def main():
    init_db()

    # ── Load artifacts ────────────────────────────────────────────────────────
    print("Loading model artifacts …", flush=True)
    scaler     = joblib.load("scaler.pkl")
    lgbm_model = joblib.load("lgbm_model.pkl")
    iso_forest = joblib.load("iso_forest.pkl")
    weights    = joblib.load("hybrid_weights.pkl")
    feat_names = joblib.load("feature_names.pkl")
    print(f"  Features used by model: {len(feat_names)}", flush=True)

    # ── Load dataset ──────────────────────────────────────────────────────────
    df = pd.read_csv(DATASET_PATH)
    df = df.sort_values(["country", "year"]).reset_index(drop=True)
    print(f"Dataset: {df.shape[0]:,} rows × {df.shape[1]} columns", flush=True)

    # Derive regulatory_quality
    if "rule_of_law" in df.columns and "control_of_corruption" in df.columns:
        df["regulatory_quality"] = (df["rule_of_law"] + df["control_of_corruption"]) / 2

    # Align features: fill any missing columns with 0
    for col in feat_names:
        if col not in df.columns:
            df[col] = 0.0

    # Impute NaN with column median
    for col in feat_names:
        df[col] = df[col].fillna(df[col].median())

    X = df[feat_names].values
    X_scaled = scaler.transform(X)

    # ── Batch predictions ─────────────────────────────────────────────────────
    print("Running batch predictions …", flush=True)
    p_lgbm   = lgbm_model.predict(X_scaled)
    # Use the hybrid esg_score from CSV as the primary score (ground truth 0–1 → 0–100)
    # but fall back to LightGBM where CSV target is missing
    if "esg_score" in df.columns:
        csv_scores = df["esg_score"].values * 100
        scores = np.where(np.isnan(csv_scores), np.clip(p_lgbm, 0, 100), csv_scores)
    else:
        scores = np.clip(p_lgbm, 0, 100)

    anomaly_preds = iso_forest.predict(X_scaled)
    n_anomalies = (anomaly_preds == -1).sum()
    print(f"  Anomalies flagged: {n_anomalies} / {len(df)} ({n_anomalies/len(df)*100:.1f}%)", flush=True)

    # ── Write to DB ───────────────────────────────────────────────────────────
    db = SessionLocal()
    try:
        existing = db.query(models.CompanyESG).count()
        if existing > 0:
            print(f"DB has {existing} existing rows → clearing …", flush=True)
            db.query(models.CompanyESG).delete()
            db.commit()

        batch = []
        for i, row in df.iterrows():
            batch.append(models.CompanyESG(
                country                  = str(row["country"]),
                year                     = int(row["year"]),
                # Social
                life_expectancy          = safe_float(row.get("life_expectancy")),
                health_expenditure       = safe_float(row.get("health_exp_gdp_pct")),
                unemployment_rate        = safe_float(row.get("unemployment_rate")),
                # Environmental
                pm25_level               = safe_float(row.get("pm25_exposure")),
                renewable_energy_pct     = safe_float(row.get("renewable_energy_pct")),
                forest_area_pct          = safe_float(row.get("forest_area_pct")),
                co2_emissions            = safe_float(row.get("co2_emissions")),
                aqi_value                = None,
                so2                      = None,
                no2                      = None,
                # Governance
                gdp_per_capita           = safe_float(row.get("gdp_per_capita")),
                government_effectiveness = safe_float(row.get("govt_effectiveness")),
                regulatory_quality       = safe_float(row.get("regulatory_quality")),
                rule_of_law              = safe_float(row.get("rule_of_law")),
                political_stability      = safe_float(row.get("political_stability")),
                control_of_corruption    = safe_float(row.get("control_of_corruption")),
                # Outputs
                esg_score                = float(scores[i]),
                is_anomaly               = bool(anomaly_preds[i] == -1),
                performance_category     = get_performance_category(float(scores[i])),
            ))
            if len(batch) >= 500:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []
                print(f"  … {i + 1:,} rows inserted", flush=True)

        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        total = db.query(models.CompanyESG).count()
        print(f"\n✓ Seeding complete. {total:,} rows in database.", flush=True)
    finally:
        db.close()


if __name__ == "__main__":
    main()
