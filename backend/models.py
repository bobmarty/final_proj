from sqlalchemy import Column, Integer, Float, String, Boolean
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Analyst") # Admin / Analyst / Manager

class CompanyESG(Base):
    __tablename__ = "company_esg"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)
    environmental_score = Column(Float)
    social_score = Column(Float)
    governance_score = Column(Float)
    carbon_footprint = Column(Float)
    board_diversity = Column(Float)
    community_investment = Column(Float)
    overall_esg_score = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False)
    performance_category = Column(String, nullable=True)
