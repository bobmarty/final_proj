from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import uvicorn

import database
import models
import schemas
import ml_pipeline

# Security Config
SECRET_KEY = "SECRET_ESG_KEY_CHANGE_IN_PROD"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Initialize database
database.init_db()

app = FastAPI(title="Smart ESG Performance Monitoring API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- AUTH ENDPOINTS ---

@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | (models.User.email == user.email)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username or Email already registered")
    
    hashed_pwd = get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        email=user.email, 
        hashed_password=hashed_pwd, 
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.username == login_data.username).first()
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        print(f"LOGIN ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/users/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- ESG ENDPOINTS ---

@app.post("/predict", response_model=schemas.PredictionResponse)
def predict(request: schemas.PredictionRequest):
    try:
        prediction = ml_pipeline.predict_esg(request.dict())
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-esg-data", response_model=List[schemas.ESGDataResponse])
def get_esg_data(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    data = db.query(models.CompanyESG).offset(skip).limit(limit).all()
    return data

@app.get("/get-anomalies", response_model=List[schemas.ESGDataResponse])
def get_anomalies(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    data = db.query(models.CompanyESG).filter(models.CompanyESG.is_anomaly == True).offset(skip).limit(limit).all()
    return data

# --- NEW TASK ENDPOINTS (Mocked for Flow) ---

@app.post("/companies")
def add_company(company: schemas.ESGDataCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    db_item = models.CompanyESG(**company.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/system-logs")
def get_logs(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    return [
        {"timestamp": datetime.utcnow().isoformat(), "event": "User Login", "user": "admin"},
        {"timestamp": datetime.utcnow().isoformat(), "event": "Data Seeding", "user": "system"},
    ]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
