"""
Fetches real World Bank data (2000-2023) for all available economies and
constructs a transparent, three-pillar ESG composite score.

Data sources (fully citable):
  - World Development Indicators (WDI), World Bank Group
  - Worldwide Governance Indicators (WGI), World Bank Group
  URL: https://data.worldbank.org

ESG Composite Methodology:
  Environmental (33%): CO2 per capita (inv), Renewable energy %, Forest area %, PM2.5 (inv)
  Social       (34%): Life expectancy, Health expenditure % GDP, GDP per capita, Unemployment (inv)
  Governance   (33%): Political stability, Rule of law, Corruption control, Govt effectiveness

  All sub-indicators are min-max normalised globally (0-1) before aggregation.
  'inv' = inverted (1 - normalised value) because lower value = better ESG outcome.

Citation:
  World Bank (2024). World Development Indicators. The World Bank Group.
  Kaufmann, D., Kraay, A. & Mastruzzi, M. (2010). The Worldwide Governance Indicators.
  World Bank Policy Research Working Paper 5430.
"""

import warnings
warnings.filterwarnings('ignore')

import wbgapi as wb
import pandas as pd
import numpy as np
import os
import time

# ── Indicator registry ─────────────────────────────────────────────────────────

ENVIRONMENTAL = {
    'EN.ATM.CO2E.PC':    'co2_per_capita',       # metric tons per capita  (inv)
    'EG.FEC.RNEW.ZS':    'renewable_energy_pct', # % of total final energy
    'AG.LND.FRST.ZS':    'forest_area_pct',      # % of land area
    'EN.ATM.PM25.MC.M3': 'pm25_exposure',        # µg/m³ mean annual       (inv)
}

SOCIAL = {
    'SP.DYN.LE00.IN':    'life_expectancy',       # years at birth
    'SH.XPD.CHEX.GD.ZS': 'health_exp_gdp_pct',   # % of GDP
    'SL.UEM.TOTL.ZS':    'unemployment_rate',     # % of labour force      (inv)
    'NY.GDP.PCAP.KD':    'gdp_per_capita',        # constant 2015 USD
}

GOVERNANCE = {
    'PV.EST': 'political_stability',       # WGI estimate (-2.5 → +2.5)
    'RL.EST': 'rule_of_law',
    'CC.EST': 'control_of_corruption',
    'GE.EST': 'govt_effectiveness',
}

ALL_INDICATORS = {**ENVIRONMENTAL, **SOCIAL, **GOVERNANCE}

# Indicators where a LOWER raw value = better ESG outcome → invert after normalising
INVERT_COLS = {'co2_per_capita', 'pm25_exposure', 'unemployment_rate'}

YEARS = list(range(2000, 2024))


# ── Helpers ────────────────────────────────────────────────────────────────────

def fetch_one(code: str, name: str):
    """
    Fetch a single World Bank indicator and return a long-format DataFrame.
    Fetches in two batches (2000-2011, 2012-2023) to avoid API URL-length limits
    that cause JSON decode errors on large requests.
    """
    BATCH_A = list(range(2000, 2012))
    BATCH_B = list(range(2012, 2024))

    def _fetch_batch(years):
        for attempt in range(3):
            try:
                raw = wb.data.DataFrame(code, time=years)
                raw.columns = [int(c[2:]) for c in raw.columns]
                long = raw.stack().reset_index()
                long.columns = ['country_code', 'year', name]
                return long
            except Exception as exc:
                if attempt < 2:
                    time.sleep(2)
                else:
                    raise exc

    try:
        part_a = _fetch_batch(BATCH_A)
        part_b = _fetch_batch(BATCH_B)
        return pd.concat([part_a, part_b], ignore_index=True)
    except Exception as exc:
        print(f"    [WARN] Could not fetch {code} ({name}): {exc}")
        return None


def minmax(series: pd.Series) -> pd.Series:
    lo, hi = series.min(), series.max()
    if hi - lo < 1e-9:
        return pd.Series(0.5, index=series.index)
    return (series - lo) / (hi - lo)


def build_esg_composite(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalise every base indicator globally (across all country-years),
    then compute E / S / G sub-scores and the final ESG composite.
    """
    E_cols = list(ENVIRONMENTAL.values())
    S_cols = list(SOCIAL.values())
    G_cols = list(GOVERNANCE.values())

    normed = {}
    for col in E_cols + S_cols + G_cols:
        if col not in df.columns:
            continue
        n = minmax(df[col].fillna(df[col].median()))
        normed[col] = (1.0 - n) if col in INVERT_COLS else n

    df = df.copy()

    avail_E = [c for c in E_cols if c in normed]
    avail_S = [c for c in S_cols if c in normed]
    avail_G = [c for c in G_cols if c in normed]

    df['E_score'] = pd.DataFrame(normed)[avail_E].mean(axis=1).values if avail_E else 0.5
    df['S_score'] = pd.DataFrame(normed)[avail_S].mean(axis=1).values if avail_S else 0.5
    df['G_score'] = pd.DataFrame(normed)[avail_G].mean(axis=1).values if avail_G else 0.5

    df['esg_score'] = (df['E_score'] + df['S_score'] + df['G_score']) / 3.0
    return df


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    print("=" * 62)
    print("  WORLD BANK ESG DATASET BUILDER  (2000 – 2023)")
    print("=" * 62)

    # Economy name lookup: ISO3 → full English name
    print("\nLoading economy metadata …")
    try:
        econ_meta  = wb.economy.DataFrame()
        iso_to_name = econ_meta['name'].to_dict()
    except Exception:
        iso_to_name = {}

    # Fetch each indicator
    print("\nFetching indicators from World Bank API:")
    frames = []
    for code, name in ALL_INDICATORS.items():
        print(f"  {name:35s} ({code}) … ", end='', flush=True)
        lf = fetch_one(code, name)
        if lf is not None:
            print(f"{len(lf):,} rows")
            frames.append(lf)

    if not frames:
        raise RuntimeError("No indicators could be fetched. Check your network connection.")

    # Outer-join all long frames on (country_code, year)
    print("\nMerging indicators …")
    df = frames[0]
    for f in frames[1:]:
        df = df.merge(f, on=['country_code', 'year'], how='outer')

    # Map ISO3 → full country name
    df['country'] = df['country_code'].map(iso_to_name).fillna(df['country_code'])
    df = df.drop(columns=['country_code'])
    df = df.sort_values(['country', 'year']).reset_index(drop=True)

    print(f"  Raw merged:  {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"  Economies:   {df['country'].nunique()}")

    # ── Imputation ─────────────────────────────────────────────────────────────
    print("\nImputing missing values (linear interpolation within each country) …")
    feat_cols = [c for c in df.columns if c not in ('country', 'year')]
    df = df.sort_values(['country', 'year'])
    for col in feat_cols:
        df[col] = (df
                   .groupby('country')[col]
                   .transform(lambda s: s.interpolate(method='linear',
                                                       limit_direction='both')))

    # Drop rows where >40 % of features are still NaN (truly data-sparse territory)
    null_frac = df[feat_cols].isnull().mean(axis=1)
    df = df[null_frac <= 0.40].reset_index(drop=True)

    # Fill any residual NaN with global column median
    for col in feat_cols:
        df[col] = df[col].fillna(df[col].median())

    print(f"  After imputation: {df.shape[0]:,} rows")

    # ── ESG composite ──────────────────────────────────────────────────────────
    print("\nConstructing three-pillar ESG composite score …")
    df = build_esg_composite(df)
    print(f"  ESG range: {df['esg_score'].min():.4f} – {df['esg_score'].max():.4f}")

    # ── Save ───────────────────────────────────────────────────────────────────
    out_dir  = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dataset')
    out_path = os.path.join(out_dir, 'wb_esg_raw.csv')
    os.makedirs(out_dir, exist_ok=True)
    df.to_csv(out_path, index=False)

    print(f"\n✓ Saved → {os.path.abspath(out_path)}")
    print(f"  Final shape : {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"  Countries   : {df['country'].nunique()}")
    print(f"  Years       : {df['year'].min()} – {df['year'].max()}")
    print("\nColumns:", df.columns.tolist())


if __name__ == '__main__':
    main()
