import os
import json
import uuid
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
from .config import settings, DATA_DIR

class SupabaseService:
    """Handles communication with Supabase database tables for inquiries and audit logs."""

    @classmethod
    def get_credentials(cls) -> tuple[Optional[str], Optional[str]]:
        url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "").strip()
        
        # Also check .env file if available in project root or backend
        if not url or not key:
            env_paths = [Path(__file__).resolve().parent.parent.parent / ".env", Path.cwd() / ".env"]
            for env_path in env_paths:
                if env_path.exists():
                    try:
                        with open(env_path, "r", encoding="utf-8") as f:
                            for line in f:
                                line = line.strip()
                                if line.startswith("#") or "=" not in line:
                                    continue
                                k, v = line.split("=", 1)
                                k, v = k.strip(), v.strip().strip('"').strip("'")
                                if k == "SUPABASE_URL" and not url:
                                    url = v.rstrip("/")
                                elif k in ("SUPABASE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY") and not key:
                                    key = v
                    except Exception:
                        pass
        return url or None, key or None

    @classmethod
    def is_configured(cls) -> bool:
        url, key = cls.get_credentials()
        return bool(url and key)

    @classmethod
    def save_inquiry(cls, inquiry: Dict[str, Any]) -> Dict[str, Any]:
        """Saves a user inquiry/contact form into the Supabase 'inquiries' table with local backup."""
        inquiry_id = str(uuid.uuid4())
        record = {
            "id": inquiry_id,
            "name": inquiry.get("name", "").strip(),
            "email": inquiry.get("email", "").strip(),
            "organization": inquiry.get("organization", "").strip() or None,
            "inquiry_type": inquiry.get("inquiry_type", "Enterprise Debt Audit").strip(),
            "repo_url": inquiry.get("repo_url", "").strip() or None,
            "message": inquiry.get("message", "").strip(),
            "created_at": datetime.utcnow().isoformat()
        }

        # 1. Local Persistence Backup
        cls._save_local_backup("inquiries.json", record)

        # 2. Supabase Cloud Sync
        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/rest/v1/inquiries"
                req_data = json.dumps(record).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = resp.read().decode("utf-8")
                    return {
                        "success": True,
                        "storage": "supabase_cloud",
                        "id": inquiry_id,
                        "record": record
                    }
            except Exception as e:
                print(f"[SupabaseService] Cloud sync failed, stored in local backup: {e}")
                return {
                    "success": True,
                    "storage": "local_backup",
                    "note": f"Saved locally. Supabase sync error: {str(e)}",
                    "id": inquiry_id,
                    "record": record
                }

        return {
            "success": True,
            "storage": "local_backup",
            "note": "Saved locally. Awaiting Supabase connection credentials.",
            "id": inquiry_id,
            "record": record
        }

    @classmethod
    def record_analysis_request(cls, summary: Dict[str, Any]) -> None:
        """Records a repository analysis submission into the Supabase 'analysis_requests' table."""
        record = {
            "id": str(uuid.uuid4()),
            "repo_name": summary.get("repo_name", "Unknown"),
            "repo_url": summary.get("repo_url", ""),
            "branch": summary.get("branch", "main"),
            "overall_debt_score": summary.get("overall_debt_score", 0.0),
            "health_status": summary.get("health_status", "Analyzed"),
            "total_files": summary.get("total_files", 0),
            "critical_risk_files": summary.get("critical_risk_files", 0),
            "avg_complexity": summary.get("avg_complexity", 0.0),
            "analyzed_at": summary.get("analyzed_at") or datetime.utcnow().isoformat()
        }

        cls._save_local_backup("analysis_history.json", record)

        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/rest/v1/analysis_requests"
                req_data = json.dumps(record).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=representation"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8):
                    pass
            except Exception as e:
                print(f"[SupabaseService] Analysis sync failed: {e}")

    @classmethod
    def _save_local_backup(cls, filename: str, data: Dict[str, Any]) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            file_path = DATA_DIR / filename
            existing = []
            if file_path.exists():
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                except Exception:
                    existing = []
            existing.insert(0, data)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(existing, f, indent=2)
        except Exception as e:
            print(f"[SupabaseService] Local backup write failed: {e}")
