from pydantic import BaseModel, EmailStr
from typing import Optional, List

# ── Auth ──────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "Analyst"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ── ESG Data ──────────────────────────────────────────────────────────────────

class ESGDataCreate(BaseModel):
    country: str
    year: int
    # Social
    life_expectancy: Optional[float] = None
    health_expenditure: Optional[float] = None
    unemployment_rate: Optional[float] = None
    # Environmental
    pm25_level: Optional[float] = None
    renewable_energy_pct: Optional[float] = None
    forest_area_pct: Optional[float] = None
    co2_emissions: Optional[float] = None
    aqi_value: Optional[float] = None
    so2: Optional[float] = None
    no2: Optional[float] = None
    # Economic / Governance
    gdp_per_capita: Optional[float] = None
    government_effectiveness: Optional[float] = None
    regulatory_quality: Optional[float] = None
    rule_of_law: Optional[float] = None
    political_stability: Optional[float] = None
    control_of_corruption: Optional[float] = None

class ESGDataResponse(ESGDataCreate):
    id: int
    esg_score: Optional[float] = None
    is_anomaly: bool = False
    performance_category: Optional[str] = None
    class Config:
        from_attributes = True

# ── Prediction ────────────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    # Social
    life_expectancy: Optional[float] = None
    health_expenditure: Optional[float] = None
    unemployment_rate: Optional[float] = None
    # Environmental
    pm25_level: Optional[float] = None
    renewable_energy_pct: Optional[float] = None
    forest_area_pct: Optional[float] = None
    aqi_value: Optional[float] = None
    so2: Optional[float] = None
    no2: Optional[float] = None
    # Economic / Governance
    gdp_per_capita: Optional[float] = None
    government_effectiveness: Optional[float] = None
    regulatory_quality: Optional[float] = None
    rule_of_law: Optional[float] = None
    political_stability: Optional[float] = None
    control_of_corruption: Optional[float] = None

class PredictionResponse(BaseModel):
    predicted_esg_score: float
    lgbm_score: Optional[float] = None
    tabnet_score: Optional[float] = None
    is_anomaly: bool
    performance_category: str           # Good / Moderate / Poor
    governance_score: Optional[float] = None
    environmental_score: Optional[float] = None
    social_score: Optional[float] = None

# ── Analytics Endpoints ───────────────────────────────────────────────────────

class FeatureImportanceItem(BaseModel):
    feature: str
    shap_value: float
    lgbm_gain: Optional[float] = None

class AblationRow(BaseModel):
    config: str
    rmse: float
    mae: float
    r2: float

class ModelMetricRow(BaseModel):
    model: str
    rmse: float
    mae: float
    r2: float
