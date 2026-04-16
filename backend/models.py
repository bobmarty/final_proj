from sqlalchemy import Column, Integer, Float, String, Boolean
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="Analyst")  # Admin / Analyst / Manager

class CompanyESG(Base):
    __tablename__ = "company_esg"
    id = Column(Integer, primary_key=True, index=True)
    country = Column(String, index=True)
    year = Column(Integer)

    # --- Social ---
    life_expectancy      = Column(Float, nullable=True)
    health_expenditure   = Column(Float, nullable=True)   # health_exp_gdp_pct
    unemployment_rate    = Column(Float, nullable=True)

    # --- Environmental ---
    pm25_level           = Column(Float, nullable=True)   # pm25_exposure
    renewable_energy_pct = Column(Float, nullable=True)
    forest_area_pct      = Column(Float, nullable=True)
    co2_emissions        = Column(Float, nullable=True)
    aqi_value            = Column(Float, nullable=True)
    so2                  = Column(Float, nullable=True)
    no2                  = Column(Float, nullable=True)

    # --- Economic / Governance ---
    gdp_per_capita           = Column(Float, nullable=True)
    government_effectiveness = Column(Float, nullable=True)  # govt_effectiveness (WGI)
    regulatory_quality       = Column(Float, nullable=True)  # derived: (rule_of_law + control_of_corruption) / 2
    rule_of_law              = Column(Float, nullable=True)
    political_stability      = Column(Float, nullable=True)
    control_of_corruption    = Column(Float, nullable=True)

    # --- Outputs ---
    esg_score            = Column(Float, nullable=True)
    is_anomaly           = Column(Boolean, default=False)
    performance_category = Column(String, nullable=True)   # Good / Moderate / Poor
