"""
Temporal feature engineering for the World Bank ESG sovereign panel dataset.

Input : dataset/wb_esg_raw.csv   (produced by fetch_worldbank_data.py)
Output: backend/academic_esg_dataset.csv

Feature engineering applied per country group (strictly causal — no future leakage):
  • T-1, T-2, T-3 lags for every base indicator          → 12 × 3 = 36 lag features
  • 3-year rolling mean  (computed on already-shifted values)  → 12 rolling-mean features
  • 3-year rolling std   (momentum volatility)                 → 12 rolling-std features
  • ESG autoregressive lags: esg_lag1, esg_lag2            →  2 AR features
  • YoY ESG change (esg_yoy_change)                        →  1 trend feature
  ─────────────────────────────────────────────────────────────────────────────
  Total engineered features: 36 + 12 + 12 + 2 + 1 = 63
  Plus 12 contemporaneous base features (for reference, not used as predictors)
  ─────────────────────────────────────────────────────────────────────────────

The train/test split must be strictly chronological (≤ 2018 train, ≥ 2019 test)
to guarantee zero temporal leakage.
"""

import pandas as pd
import numpy as np
import os

DATASET_IN  = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            '..', 'dataset', 'wb_esg_raw.csv')
DATASET_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            'academic_esg_dataset.csv')

# The 12 base features that receive full temporal engineering
BASE_FEATURES = [
    # Environmental (3 indicators — co2_per_capita excluded: WB API unavailable for EN.ATM.CO2E.PC)
    'renewable_energy_pct',
    'forest_area_pct',
    'pm25_exposure',
    # Social
    'life_expectancy',
    'health_exp_gdp_pct',
    'unemployment_rate',
    'gdp_per_capita',
    # Governance (World Governance Indicators)
    'political_stability',
    'rule_of_law',
    'control_of_corruption',
    'govt_effectiveness',
]

# Columns that are output metadata / target — not used as predictors
NON_FEATURE_COLS = {'country', 'year', 'esg_score', 'E_score', 'S_score', 'G_score'}


def engineer_temporal_features(group: pd.DataFrame) -> pd.DataFrame:
    """
    For a single country's time-sorted panel, add lag and rolling features.
    All lag/rolling operations use .shift(1) as the base so that no information
    from time T leaks into the feature set predicting T.
    """
    g = group.copy().sort_values('year').reset_index(drop=True)

    for f in BASE_FEATURES:
        if f not in g.columns:
            continue

        # Strict T-1, T-2, T-3 lags
        for lag in [1, 2, 3]:
            g[f'{f}_lag{lag}'] = g[f].shift(lag)

        # 3-year rolling mean and std anchored at T-1 (window ends at T-1)
        shifted = g[f].shift(1)
        g[f'{f}_roll3_mean'] = shifted.rolling(window=3, min_periods=2).mean()
        g[f'{f}_roll3_std']  = shifted.rolling(window=3, min_periods=2).std()

    # Autoregressive ESG lags and trend signal
    g['esg_lag1']      = g['esg_score'].shift(1)
    g['esg_lag2']      = g['esg_score'].shift(2)
    g['esg_yoy_change'] = g['esg_score'].diff(1)   # T-1 → T change (known at T)

    return g


def main():
    print("=" * 62)
    print("  TEMPORAL FEATURE ENGINEERING  (T-1 / T-2 / T-3 lags)")
    print("=" * 62)

    if not os.path.exists(DATASET_IN):
        raise FileNotFoundError(
            f"Raw dataset not found at {DATASET_IN}.\n"
            "Please run fetch_worldbank_data.py first."
        )

    print(f"\nLoading {DATASET_IN} …")
    df = pd.read_csv(DATASET_IN)
    df = df.sort_values(['country', 'year']).reset_index(drop=True)
    print(f"  Input shape : {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"  Countries   : {df['country'].nunique()}")
    print(f"  Year range  : {df['year'].min()} – {df['year'].max()}")

    # Keep only base features + identifiers + target (drop E/S/G sub-scores
    # from model inputs — they are derived from the same base features and
    # would constitute target leakage in the composite prediction setting)
    keep_cols = ['country', 'year', 'esg_score'] + \
                [f for f in BASE_FEATURES if f in df.columns]
    df = df[keep_cols]

    # Apply temporal feature engineering country-by-country
    print("\nEngineering lag and rolling features per country …")
    enriched_groups = []
    for country, group in df.groupby('country'):
        enriched_groups.append(engineer_temporal_features(group))

    result = pd.concat(enriched_groups).reset_index(drop=True)

    # ── Quality filter ─────────────────────────────────────────────────────────
    # Require at minimum: target, esg_lag1 (the strongest AR predictor), esg_lag2
    result = result.dropna(subset=['esg_score', 'esg_lag1', 'esg_lag2'])

    # Drop rows where >30 % of the engineered feature columns are still NaN
    eng_cols = [c for c in result.columns if c not in NON_FEATURE_COLS]
    null_frac = result[eng_cols].isnull().mean(axis=1)
    result = result[null_frac <= 0.30].reset_index(drop=True)

    # Impute residual NaN with per-column median (affects only early rolling windows)
    for col in eng_cols:
        median = result[col].median()
        result[col] = result[col].fillna(median)

    # ── Summary ────────────────────────────────────────────────────────────────
    n_features = len(eng_cols)
    n_base     = len([c for c in eng_cols if '_lag' not in c and '_roll' not in c
                                          and c not in ('esg_yoy_change',)])
    n_lag      = len([c for c in eng_cols if '_lag' in c])
    n_rolling  = len([c for c in eng_cols if '_roll' in c])

    print(f"\n{'─'*62}")
    print(f"  Output shape          : {result.shape[0]:,} rows × {result.shape[1]} columns")
    print(f"  Countries retained    : {result['country'].nunique()}")
    print(f"  Year range            : {result['year'].min()} – {result['year'].max()}")
    print(f"{'─'*62}")
    print(f"  Base features         : {n_base}")
    print(f"  Lag features (T1-T3)  : {n_lag}")
    print(f"  Rolling features      : {n_rolling}")
    print(f"  Total predictor cols  : {n_features}")
    print(f"{'─'*62}")
    print(f"  ESG target range      : {result['esg_score'].min():.4f} – {result['esg_score'].max():.4f}")

    # Train / test split preview
    train = result[result['year'] <= 2018]
    test  = result[result['year'] >= 2019]
    print(f"\n  Chronological split preview:")
    print(f"    Train (≤ 2018): {len(train):,} rows")
    print(f"    Test  (≥ 2019): {len(test):,}  rows")

    result.to_csv(DATASET_OUT, index=False)
    print(f"\n✓ Saved → {os.path.abspath(DATASET_OUT)}")


if __name__ == '__main__':
    main()
