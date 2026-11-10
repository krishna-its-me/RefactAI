from fastapi import APIRouter, HTTPException, Query, Header
from ..models.schemas import (
    AnalyzeRepoRequest, ProjectHealthSummary, InquirySubmission, UserProfileSync,
    UserSignUpRequest, UserLoginRequest, ForgotPasswordRequest, AuthResponse
)
from ..engine.feature_builder import FeatureBuilder
from ..engine.model_predictor import predictor
from ..engine.solution_generator import SolutionGenerator
from ..core.supabase_service import SupabaseService

router = APIRouter()

@router.get("/health")
def get_system_health():
    url, key = SupabaseService.get_credentials()
    return {
        "status": "online",
        "service": "RefactAI Engine",
        "version": "1.0.0",
        "supabase_connected": bool(url and key),
        "available_models": list(predictor.models.keys())
    }

@router.get("/auth/config")
def get_auth_config():
    """Returns Supabase connection configuration for frontend authentication."""
    url, key = SupabaseService.get_credentials()
    return {
        "supabase_url": url,
        "supabase_anon_key": key,
        "is_configured": bool(url and key),
        "auth_providers": ["email", "google", "phone"]
    }

@router.post("/auth/signup", response_model=AuthResponse)
def sign_up_user(payload: UserSignUpRequest):
    """Registers a new user account with email and password."""
    try:
        res = SupabaseService.sign_up(payload.full_name, payload.email, payload.password)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/auth/login", response_model=AuthResponse)
def login_user(payload: UserLoginRequest):
    """Authenticates an existing user account with email and password."""
    try:
        res = SupabaseService.sign_in(payload.email, payload.password)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=401, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest):
    """Sends password reset instructions to the requested email."""
    try:
        return SupabaseService.forgot_password(payload.email)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password reset failed: {str(e)}")

@router.post("/auth/logout")
def logout_user(authorization: str = Header(None)):
    """Logs out user and invalidates session token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        SupabaseService.remove_session(token)
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/auth/me")
def get_current_user(authorization: str = Header(None)):
    """Returns the authenticated user details from the session bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split("Bearer ")[1].strip()
    user = SupabaseService.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid.")
    return {"status": "success", "user": user}

@router.post("/auth/profile")
def sync_user_profile(profile: UserProfileSync):
    """Synchronizes Google OAuth or Phone Number authenticated users with Supabase and local backup."""
    try:
        res = SupabaseService.sync_user_profile(profile.dict())
        return {"status": "success", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/history")
def get_user_history(user_id: str = Query(..., description="Supabase Auth User ID")):
    """Retrieves previous repository analyses and mined Git history for the authenticated user."""
    try:
        return SupabaseService.get_user_history(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
def get_model_benchmarks():
    return {
        "active_default": "random_forest",
        "benchmarks": predictor.benchmarks
    }

@router.get("/sample", response_model=ProjectHealthSummary)
def get_sample_analysis(model_type: str = "random_forest"):
    """Returns an immediate, pre-calculated project health assessment for quick evaluation."""
    summary = FeatureBuilder.analyze_repository(
        repo_url="https://github.com/refactai/microservices-architecture-suite",
        branch="main",
        max_files=50,
        model_type=model_type,
        use_sample_if_fail=True
    )
    # Background record sample assessment
    try:
        SupabaseService.record_analysis_request(summary.dict())
    except Exception:
        pass
    return summary

@router.post("/analyze", response_model=ProjectHealthSummary)
def analyze_repository(request: AnalyzeRepoRequest):
    """Analyzes a GitHub repository or local workspace for Technical Debt analysis with SHAP explanations and Git history."""
    try:
        summary = FeatureBuilder.analyze_repository(
            repo_url=request.repo_url,
            branch=request.branch or "main",
            max_files=request.max_files or 100,
            model_type=request.model_type or "random_forest",
            use_sample_if_fail=request.use_sample_if_fail,
            github_token=request.github_token
        )
        # Record repository analysis & mined git history under user_id to Supabase
        try:
            SupabaseService.record_analysis_request(summary.dict(), user_id=request.user_id)
        except Exception as ex:
            print(f"[Routes] Supabase logging warning: {ex}")
            
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/inquiry")
def submit_inquiry(inquiry: InquirySubmission):
    """Saves user inquiries, consultation requests, and audit bookings to Supabase with local fallback."""
    try:
        result = SupabaseService.save_inquiry(inquiry.dict())
        return {
            "status": "success",
            "message": "Thank you! Your inquiry has been submitted and registered successfully.",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit inquiry: {str(e)}")

@router.get("/inquiry/status")
def get_inquiry_status():
    """Checks the backend persistence mode and Supabase configuration status."""
    is_conf = SupabaseService.is_configured()
    url, _ = SupabaseService.get_credentials()
    return {
        "supabase_configured": is_conf,
        "supabase_url": url if is_conf else None,
        "storage_mode": "supabase_cloud" if is_conf else "local_json_backup"
    }

@router.post("/fix-solution")
def generate_fix_solution(data: dict):
    """Generates an authorized refactored code solution in comment form."""
    file_path = data.get("file_path", "unknown")
    language = data.get("language", "Python")
    complexity = float(data.get("complexity", 10.0))
    loc = int(data.get("loc", 100))
    recs = data.get("recommendations", [])
    problem_summary, before_code, solution_code = SolutionGenerator.get_solution(
        file_path, language, complexity, loc, recs
    )
    return {
        "file_path": file_path,
        "language": language,
        "problem_summary": problem_summary,
        "before_code": before_code,
        "solution_code": solution_code
    }
    return {
        "file_path": file_path,
        "language": language,
        "problem_summary": problem_summary,
        "before_code": before_code,
        "solution_code": solution_code
    }
