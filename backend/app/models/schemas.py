from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class AnalyzeRepoRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL or local repo identifier", example="https://github.com/fastapi/fastapi")
    branch: Optional[str] = Field("main", description="Target Git branch to inspect")
    max_files: Optional[int] = Field(150, description="Max files to analyze")
    model_type: Optional[str] = Field("random_forest", description="ML model to employ: logistic_regression, decision_tree, random_forest, or xgboost")
    use_sample_if_fail: Optional[bool] = Field(True, description="Fallback gracefully to simulated analysis if GitHub rate limited or invalid URL")

class ShapFactor(BaseModel):
    feature_name: str
    display_name: str
    feature_value: float
    shap_value: float
    direction: str = Field(..., description="'increases_risk' or 'decreases_risk'")
    weight_percentage: float = Field(..., description="Relative percentage contribution")
    explanation: str

class FileMetric(BaseModel):
    id: str
    file_path: str
    file_name: str
    language: str
    loc: int
    complexity: float
    functions_count: int
    classes_count: int
    dependencies_count: int
    commit_frequency: int
    code_churn: int
    authors_count: int
    bug_fixes_count: int
    risk_score: float = Field(..., description="Technical debt risk score between 0.0 and 100.0%")
    risk_level: str = Field(..., description="low, moderate, high, or critical")
    shap_explanation: List[ShapFactor] = []
    recommendations: List[str] = []
    code_solution: Optional[str] = None
    before_code: Optional[str] = None
    problem_summary: Optional[str] = None

class ModelBenchmarkItem(BaseModel):
    model_name: str
    display_name: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float
    mae: float
    rmse: float
    r2_score: float
    is_active: bool = False

class ProjectHealthSummary(BaseModel):
    repo_name: str
    repo_url: str
    branch: str
    analyzed_at: str
    overall_debt_score: float
    health_status: str
    total_files: int
    critical_risk_files: int
    high_risk_files: int
    moderate_risk_files: int
    low_risk_files: int
    avg_complexity: float
    total_loc: int
    active_model: str
    files: List[FileMetric]
    model_benchmarks: List[ModelBenchmarkItem]
    top_risk_drivers: List[str]
    global_recommendations: List[str]

class InquirySubmission(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of contact")
    email: str = Field(..., max_length=120, description="Work or personal email address")
    organization: Optional[str] = Field(None, max_length=120, description="Company or organization name")
    inquiry_type: Optional[str] = Field("Enterprise Debt Audit", max_length=80, description="Category of service or inquiry")
    repo_url: Optional[str] = Field(None, max_length=255, description="Repository URL for analysis request")
    message: str = Field(..., min_length=5, max_length=2000, description="Detailed inquiry message or requirements")
