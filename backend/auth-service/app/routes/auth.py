from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas import UserRegister, UserLogin, UserResponse
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# --------------------------------------------------
# USER REGISTRATION
# POST /auth/register
# --------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    data: UserRegister,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        name=data.name,
        email=email,
        hashed_password=hash_password(data.password),
        role=data.role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "Registration successful",
        "user_id": user.id,
    }


# --------------------------------------------------
# USER LOGIN
# POST /auth/login
# --------------------------------------------------

@router.post("/login")
def login(
    data: UserLogin,
    db: Session = Depends(get_db),
):
    email = str(data.email).lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user or not verify_password(
        data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# --------------------------------------------------
# GET CURRENT USER PROFILE
# GET /auth/me
# Admin, Agent, Customer
# --------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


# --------------------------------------------------
# GET ALL USERS
# GET /auth/users
# Admin only
# --------------------------------------------------

@router.get("/users")
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.role).strip().lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view all users",
        )

    users = db.query(User).order_by(User.id.desc()).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }
        for user in users
    ]


# --------------------------------------------------
# GET ALL AGENTS
# GET /auth/users/agents
# Admin only
# Used by Assignment Service
# --------------------------------------------------

@router.get("/users/agents")
def get_agents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if str(current_user.role).strip().lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view agents",
        )

    agents = (
        db.query(User)
        .filter(User.role.ilike("agent"))
        .order_by(User.id.asc())
        .all()
    )

    return [
        {
            "id": agent.id,
            "name": agent.name,
            "email": agent.email,
            "role": agent.role,
            "is_active": agent.is_active,
        }
        for agent in agents
    ]