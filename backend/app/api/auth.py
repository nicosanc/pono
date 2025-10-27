from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.services.security import hash_password, verify_password, create_access_token, decode_access_token
from jose import JWTError
from fastapi import Header
router = APIRouter()

@router.post("/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """ Create a new user account"""
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    print(f"DEBUG: Received password: {user.password!r}, length: {len(user.password)}")
    # Create user with a hashed password
    new_user = models.User(
        email=user.email,
        password_hash=hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Return teh JWT token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """ Login a user and return a JWT Token"""
    # Find user with email
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


# Dependency for protecting routes
def get_current_user(authorization: str = Header(...), db: Session = Depends(get_db)) -> models.User:
    """ Get the current user from the JWT token"""
    try:
        # Extract the token from the Authorization header
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        # Decode JWT
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))

        # Get user from database
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="Users not found")

        return user
    
    except (JWTError, ValueError, AttributeError):
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user information including onboarding status"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "onboarding_completed": current_user.onboarding_completed,
        "created_at": current_user.created_at
    }

        






