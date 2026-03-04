from pydantic import BaseModel, EmailStr
from typing import Optional, List

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

class ESGDataCreate(BaseModel):
    company_name: str
    environmental_score: float
    social_score: float
    governance_score: float
    carbon_footprint: float
    board_diversity: float
    community_investment: float

class ESGDataResponse(ESGDataCreate):
    id: int
    overall_esg_score: Optional[float] = None
    is_anomaly: bool = False
    performance_category: Optional[str] = None
    class Config:
        from_attributes = True

class PredictionRequest(BaseModel):
    environmental_score: float
    social_score: float
    governance_score: float
    carbon_footprint: float
    board_diversity: float
    community_investment: float

class PredictionResponse(BaseModel):
    predicted_esg_score: float
    is_anomaly: bool
    performance_category: str
