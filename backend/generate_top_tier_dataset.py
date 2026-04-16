import pandas as pd
import numpy as np

# Simulate 193 countries over 24 years (2000-2023)
COUNTRIES_COUNT = 193
YEARS = list(range(2000, 2024))
np.random.seed(42)

def generate_dataset():
    data = []
    
    for country_id in range(1, COUNTRIES_COUNT + 1):
        country_name = f"Country_{country_id}"
        
        # Country baseline traits
        base_corruption = np.random.uniform(0.1, 0.9)
        base_wealth = np.random.uniform(0.1, 0.9)
        base_renewables = np.random.uniform(0.05, 0.6)
        
        # Initialize temporal momentum 
        prev_esg = np.random.uniform(0.4, 0.8)
        
        for year in YEARS:
            # Add temporal drift and noise
            corruption_perception = np.clip(base_corruption + np.random.normal(0, 0.02), 0, 1) # Higher is less corrupt (CPI style)
            political_stability = np.clip(corruption_perception + np.random.normal(0, 0.1), 0, 1)
            regulatory_quality = np.clip(base_wealth + np.random.normal(0, 0.05), 0, 1)
            rule_of_law = np.clip((corruption_perception + regulatory_quality)/2 + np.random.normal(0, 0.05), 0, 1)
            
            education_index = np.clip(base_wealth + np.random.normal(0.05, 0.02) * (year - 2000) / 10, 0, 1)
            gender_equality_index = np.clip(education_index + np.random.normal(0, 0.05), 0, 1)
            unemployment_rate = np.clip(0.15 - base_wealth * 0.1 + np.random.normal(0, 0.02), 0, 1)
            poverty_ratio = np.clip(0.3 - base_wealth * 0.2 + np.random.normal(0, 0.05), 0, 1)
            
            renewable_energy_share = np.clip(base_renewables + (year - 2000)*0.01 + np.random.normal(0, 0.02), 0, 1)
            forest_area_loss = np.clip(0.1 - regulatory_quality * 0.05 + np.random.normal(0, 0.02), 0, 1)
            climate_risk_index = np.clip(np.random.beta(2, 5), 0, 1)
            carbon_intensity = np.clip(0.8 - renewable_energy_share + np.random.normal(0, 0.05), 0, 1)
            
            # The True Unknown Causal Formula (Decoupled Target)
            # ESG is driven heavily by governance, momentum, and improving environmental/social conditions.
            true_esg = (
                0.4 * prev_esg + 
                0.2 * corruption_perception + 
                0.15 * renewable_energy_share + 
                0.1 * education_index - 
                0.05 * carbon_intensity - 
                0.05 * poverty_ratio + 
                0.05 * rule_of_law +
                np.random.normal(0, 0.03) # Fundamental uncertainty noise
            )
            true_esg = np.clip(true_esg, 0, 1)
            
            # Introduce a massive Global Shock in 2020 (COVID-19 proxy)
            if year == 2020:
                unemployment_rate = np.clip(unemployment_rate + np.random.uniform(0.05, 0.15), 0, 1)
                poverty_ratio = np.clip(poverty_ratio + np.random.uniform(0.02, 0.08), 0, 1)
                political_stability = np.clip(political_stability - np.random.uniform(0.05, 0.2), 0, 1)
                true_esg -= np.random.uniform(0.02, 0.08) # Overall global structural hit
            
            # Introduce a specific localized catastrophe in 2022 (Sri Lanka Proxy)
            if year == 2022 and country_id == 50:
                political_stability = 0.05
                corruption_perception -= 0.3
                true_esg -= 0.25
                
            data.append({
                'country': country_name,
                'year': year,
                'renewable_energy_share': renewable_energy_share,
                'forest_area_loss': forest_area_loss,
                'climate_risk_index': climate_risk_index,
                'carbon_intensity': carbon_intensity,
                'education_index': education_index,
                'gender_equality_index': gender_equality_index,
                'unemployment_rate': unemployment_rate,
                'poverty_ratio': poverty_ratio,
                'corruption_perception_index': corruption_perception,
                'political_stability': political_stability,
                'regulatory_quality': regulatory_quality,
                'rule_of_law': rule_of_law,
                'esg_score_proxy': true_esg
            })
            
            prev_esg = true_esg
            
    df = pd.DataFrame(data)
    
    # Save standard dataset
    df.to_csv("top_tier_esg_dataset.csv", index=False)
    print(f"Generated top-tier dataset with {df.shape[0]} rows and {df.shape[1]} columns.")
    
    # Generate Lagged Panel (T-1 -> T) for strict rolling window evaluation
    print("Engineering Temporal Lags for rigor...")
    
    grouped = df.groupby('country')
    lag_dfs = []
    
    FEATURE_COLS = [
        'renewable_energy_share', 'forest_area_loss', 'climate_risk_index', 'carbon_intensity',
        'education_index', 'gender_equality_index', 'unemployment_rate', 'poverty_ratio',
        'corruption_perception_index', 'political_stability', 'regulatory_quality', 'rule_of_law'
    ]
    
    for _, group_df in grouped:
        for f in FEATURE_COLS:
            group_df[f'{f}_lag1'] = group_df[f].shift(1)
            group_df[f'{f}_yoy_shock'] = group_df[f] - group_df[f'{f}_lag1']
        
        group_df['esg_lag1'] = group_df['esg_score_proxy'].shift(1)
        lag_dfs.append(group_df)
        
    lag_df = pd.concat(lag_dfs).dropna().reset_index(drop=True)
    lag_df.to_csv("top_tier_lagged_panel.csv", index=False)
    print("Saved decoupled temporal forecasting panel to top_tier_lagged_panel.csv.")

if __name__ == "__main__":
    generate_dataset()
