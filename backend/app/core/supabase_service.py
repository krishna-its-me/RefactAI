import os
import json
import uuid
import hashlib
import secrets
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
from .config import settings, DATA_DIR

class SupabaseService:
    """Handles communication with Supabase database tables for inquiries, audit logs, user profiles, and git history."""

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
            "user_id": inquiry.get("user_id") or None,
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
    def record_analysis_request(cls, summary: Dict[str, Any], user_id: Optional[str] = None) -> str:
        """Records a repository analysis submission and its mined Git history into Supabase."""
        analysis_id = str(uuid.uuid4())
        record = {
            "id": analysis_id,
            "user_id": user_id or summary.get("user_id") or None,
            "repo_name": summary.get("repo_name", "Unknown"),
            "repo_url": summary.get("repo_url", ""),
            "branch": summary.get("branch", "main"),
            "overall_debt_score": summary.get("overall_debt_score", 0.0),
            "health_status": summary.get("health_status", "Analyzed"),
            "total_files": summary.get("total_files", 0),
            "critical_risk_files": summary.get("critical_risk_files", 0),
            "avg_complexity": summary.get("avg_complexity", 0.0),
            "active_model": summary.get("active_model", "random_forest"),
            "analyzed_at": summary.get("analyzed_at") or datetime.utcnow().isoformat()
        }

        # 1. Local Persistence Backup
        cls._save_local_backup("analysis_history.json", record)

        # 2. Save Git History Logs
        git_history = summary.get("git_history") or []
        git_records = []
        for g in git_history:
            g_dict = g if isinstance(g, dict) else g.dict()
            git_record = {
                "id": str(uuid.uuid4()),
                "analysis_id": analysis_id,
                "user_id": user_id or summary.get("user_id") or None,
                "repo_url": summary.get("repo_url", ""),
                "commit_hash": g_dict.get("commit_hash", ""),
                "author": g_dict.get("author", "Unknown"),
                "commit_date": g_dict.get("commit_date") or None,
                "commit_message": g_dict.get("commit_message", ""),
                "code_churn": g_dict.get("code_churn", 0),
                "is_bug_fix": g_dict.get("is_bug_fix", False),
                "created_at": datetime.utcnow().isoformat()
            }
            git_records.append(git_record)
            cls._save_local_backup("git_history_logs.json", git_record)

        # 3. Supabase Cloud Sync
        url, key = cls.get_credentials()
        if url and key:
            try:
                # Sync analysis_requests
                target_url = f"{url}/rest/v1/analysis_requests"
                req_data = json.dumps(record).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8):
                    pass

                # Sync git_history_logs if any
                if git_records:
                    target_git_url = f"{url}/rest/v1/git_history_logs"
                    req_git_data = json.dumps(git_records).encode("utf-8")
                    req_git = urllib.request.Request(
                        target_git_url,
                        data=req_git_data,
                        headers={
                            "apikey": key,
                            "Authorization": f"Bearer {key}",
                            "Content-Type": "application/json",
                            "Prefer": "return=minimal"
                        },
                        method="POST"
                    )
                    with urllib.request.urlopen(req_git, timeout=8):
                        pass

            except Exception as e:
                print(f"[SupabaseService] Cloud analysis sync warning: {e}")

        return analysis_id

    @classmethod
    def sync_user_profile(cls, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Saves or updates user profile on Supabase and local storage (Google OAuth / Phone Auth)."""
        user_id = profile.get("id") or str(uuid.uuid4())
        record = {
            "id": user_id,
            "email": profile.get("email"),
            "phone": profile.get("phone"),
            "display_name": profile.get("display_name") or profile.get("email") or profile.get("phone") or "RefactAI User",
            "avatar_url": profile.get("avatar_url") or "",
            "auth_provider": profile.get("auth_provider", "google"),
            "last_sign_in": datetime.utcnow().isoformat()
        }

        # Local backup
        cls._save_local_backup("user_profiles.json", record)

        # Supabase sync
        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/rest/v1/user_profiles?on_conflict=id"
                req_data = json.dumps(record).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "Prefer": "resolution=merge-duplicates"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8):
                    return {"success": True, "storage": "supabase_cloud", "user": record}
            except Exception as e:
                print(f"[SupabaseService] Profile sync error: {e}")

        return {"success": True, "storage": "local_backup", "user": record}

    @classmethod
    def sign_up(cls, full_name: str, email: str, password: str) -> Dict[str, Any]:
        """Registers a new user with Supabase Auth or secure local fallback."""
        email_clean = email.strip().lower()
        full_name_clean = full_name.strip()

        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/auth/v1/signup"
                req_data = json.dumps({
                    "email": email_clean,
                    "password": password,
                    "data": {"full_name": full_name_clean}
                }).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    user_obj = resp_data.get("user") or resp_data
                    token = resp_data.get("access_token") or secrets.token_urlsafe(32)
                    user_data = {
                        "id": user_obj.get("id"),
                        "email": email_clean,
                        "full_name": full_name_clean,
                        "avatar_url": "",
                        "auth_provider": "email"
                    }
                    cls.sync_user_profile(user_data)
                    return {
                        "status": "success",
                        "message": "User registered successfully in Supabase Cloud.",
                        "access_token": token,
                        "token_type": "bearer",
                        "user": user_data
                    }
            except Exception as e:
                print(f"[SupabaseService] Cloud signup failed, using local secure vault: {e}")

        # Local Secure Storage Fallback
        users_file = DATA_DIR / "users.json"
        users = []
        if users_file.exists():
            try:
                with open(users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
            except Exception:
                users = []

        # Check existing email
        for u in users:
            if u.get("email") == email_clean:
                raise ValueError("An account with this email address already exists.")

        user_id = str(uuid.uuid4())
        salt = secrets.token_hex(16)
        pwd_hash = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()

        user_record = {
            "id": user_id,
            "email": email_clean,
            "full_name": full_name_clean,
            "salt": salt,
            "hash": pwd_hash,
            "created_at": datetime.utcnow().isoformat()
        }
        users.append(user_record)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(users_file, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)

        token = secrets.token_urlsafe(32)
        cls._save_session(token, user_id, email_clean, full_name_clean)

        user_data = {
            "id": user_id,
            "email": email_clean,
            "full_name": full_name_clean,
            "avatar_url": "",
            "auth_provider": "email"
        }
        cls.sync_user_profile(user_data)

        return {
            "status": "success",
            "message": "Account created successfully.",
            "access_token": token,
            "token_type": "bearer",
            "user": user_data
        }

    @classmethod
    def sign_in(cls, email: str, password: str) -> Dict[str, Any]:
        """Authenticates a user via Supabase Auth or secure local fallback."""
        email_clean = email.strip().lower()

        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/auth/v1/token?grant_type=password"
                req_data = json.dumps({
                    "email": email_clean,
                    "password": password
                }).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    user_obj = resp_data.get("user") or {}
                    token = resp_data.get("access_token") or secrets.token_urlsafe(32)
                    meta = user_obj.get("user_metadata") or {}
                    full_name = meta.get("full_name") or user_obj.get("email") or "RefactAI User"
                    user_data = {
                        "id": user_obj.get("id"),
                        "email": email_clean,
                        "full_name": full_name,
                        "avatar_url": meta.get("avatar_url") or "",
                        "auth_provider": "email"
                    }
                    return {
                        "status": "success",
                        "message": "Logged in successfully via Supabase Cloud.",
                        "access_token": token,
                        "token_type": "bearer",
                        "user": user_data
                    }
            except Exception as e:
                print(f"[SupabaseService] Cloud signin failed, checking local vault: {e}")

        # Local Secure Storage Verification
        users_file = DATA_DIR / "users.json"
        users = []
        if users_file.exists():
            try:
                with open(users_file, "r", encoding="utf-8") as f:
                    users = json.load(f)
            except Exception:
                users = []

        found_user = None
        for u in users:
            if u.get("email") == email_clean:
                found_user = u
                break

        if not found_user:
            raise ValueError("Invalid email or password.")

        expected_hash = hashlib.sha256((found_user["salt"] + password).encode("utf-8")).hexdigest()
        if expected_hash != found_user["hash"]:
            raise ValueError("Invalid email or password.")

        token = secrets.token_urlsafe(32)
        cls._save_session(token, found_user["id"], found_user["email"], found_user["full_name"])

        user_data = {
            "id": found_user["id"],
            "email": found_user["email"],
            "full_name": found_user["full_name"],
            "avatar_url": "",
            "auth_provider": "email"
        }
        return {
            "status": "success",
            "message": "Logged in successfully.",
            "access_token": token,
            "token_type": "bearer",
            "user": user_data
        }

    @classmethod
    def forgot_password(cls, email: str) -> Dict[str, Any]:
        """Handles password recovery requests via Supabase or local email log."""
        email_clean = email.strip().lower()

        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/auth/v1/recover"
                req_data = json.dumps({"email": email_clean}).encode("utf-8")
                req = urllib.request.Request(
                    target_url,
                    data=req_data,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=8):
                    return {
                        "status": "success",
                        "message": "Password recovery email sent via Supabase."
                    }
            except Exception as e:
                print(f"[SupabaseService] Cloud recovery warning: {e}")

        # Local recovery record
        cls._save_local_backup("password_resets.json", {
            "email": email_clean,
            "reset_token": secrets.token_hex(16),
            "requested_at": datetime.utcnow().isoformat()
        })
        return {
            "status": "success",
            "message": f"Password recovery instructions generated for {email_clean}."
        }

    @classmethod
    def get_user_by_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """Validates a bearer token and returns the authenticated user."""
        if not token:
            return None

        # Check local sessions
        sessions_file = DATA_DIR / "sessions.json"
        if sessions_file.exists():
            try:
                with open(sessions_file, "r", encoding="utf-8") as f:
                    sessions = json.load(f)
                    if token in sessions:
                        return sessions[token]
            except Exception:
                pass

        # Check Supabase cloud token
        url, key = cls.get_credentials()
        if url and key:
            try:
                target_url = f"{url}/auth/v1/user"
                req = urllib.request.Request(
                    target_url,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {token}"
                    }
                )
                with urllib.request.urlopen(req, timeout=6) as resp:
                    u = json.loads(resp.read().decode("utf-8"))
                    meta = u.get("user_metadata") or {}
                    return {
                        "id": u.get("id"),
                        "email": u.get("email"),
                        "full_name": meta.get("full_name") or u.get("email") or "RefactAI User",
                        "avatar_url": meta.get("avatar_url") or "",
                        "auth_provider": "supabase"
                    }
            except Exception:
                pass

        return None

    @classmethod
    def _save_session(cls, token: str, user_id: str, email: str, full_name: str) -> None:
        try:
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            sessions_file = DATA_DIR / "sessions.json"
            sessions = {}
            if sessions_file.exists():
                try:
                    with open(sessions_file, "r", encoding="utf-8") as f:
                        sessions = json.load(f)
                except Exception:
                    sessions = {}
            sessions[token] = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "logged_in_at": datetime.utcnow().isoformat()
            }
            with open(sessions_file, "w", encoding="utf-8") as f:
                json.dump(sessions, f, indent=2)
        except Exception as e:
            print(f"[SupabaseService] Session save failed: {e}")

    @classmethod
    def remove_session(cls, token: str) -> None:
        try:
            sessions_file = DATA_DIR / "sessions.json"
            if sessions_file.exists():
                with open(sessions_file, "r", encoding="utf-8") as f:
                    sessions = json.load(f)
                if token in sessions:
                    del sessions[token]
                    with open(sessions_file, "w", encoding="utf-8") as f:
                        json.dump(sessions, f, indent=2)
        except Exception:
            pass

    @classmethod
    def get_user_history(cls, user_id: str) -> Dict[str, Any]:
        """Returns the user's analyses and git histories from Supabase or local backup."""
        url, key = cls.get_credentials()
        if url and key and user_id:
            try:
                target_url = f"{url}/rest/v1/analysis_requests?user_id=eq.{user_id}&order=analyzed_at.desc&limit=20"
                req = urllib.request.Request(
                    target_url,
                    headers={
                        "apikey": key,
                        "Authorization": f"Bearer {key}"
                    }
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    analyses = json.loads(resp.read().decode("utf-8"))
                    return {"analyses": analyses, "storage": "supabase_cloud"}
            except Exception as e:
                print(f"[SupabaseService] Fetch user history failed: {e}")

        # Local fallback
        file_path = DATA_DIR / "analysis_history.json"
        local_items = []
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    local_items = json.load(f)
            except Exception:
                pass
        return {"analyses": local_items, "storage": "local_backup"}

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
            
            # Avoid duplicate primary key in list
            if "id" in data:
                existing = [x for x in existing if x.get("id") != data["id"]]

            existing.insert(0, data)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(existing[:100], f, indent=2)
        except Exception as e:
            print(f"[SupabaseService] Local backup write failed: {e}")
