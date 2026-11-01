import os
import shutil
import tempfile
import re
from typing import Dict, Any, List
from pathlib import Path

class GitMiner:
    """Extracts process metrics from Git history including churn, authors, frequency, and bug-fix commits."""

    BUG_KEYWORDS = re.compile(r'\b(fix|fixed|fixes|bug|bugs|patch|resolved|resolves|issue|defect|error|hotfix)\b', re.IGNORECASE)

    @classmethod
    def clone_repository(cls, repo_url: str, target_dir: str, depth: int = 50) -> bool:
        """Performs a shallow clone with strict timeout and prompt suppression."""
        try:
            import subprocess
            env = dict(os.environ, GIT_TERMINAL_PROMPT="0")
            result = subprocess.run(
                ["git", "clone", "--depth", str(depth), repo_url, target_dir],
                env=env,
                timeout=20,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return True
            print(f"[GitMiner] Cloning failed (returncode {result.returncode}): {result.stderr.strip()}")
            return False
        except Exception as e:
            print(f"[GitMiner] Cloning exception: {e}")
            return False

    @classmethod
    def mine_git_history(cls, repo_path: str) -> Dict[str, Dict[str, Any]]:
        """Mines commit history for each file in the repository."""
        file_metrics: Dict[str, Dict[str, Any]] = {}
        try:
            import git
            repo = git.Repo(repo_path)
            commits = list(repo.iter_commits(max_count=100))

            for commit in commits:
                try:
                    is_bug_fix = bool(cls.BUG_KEYWORDS.search(commit.message))
                    author = commit.author.email or commit.author.name
                    stats_files = commit.stats.files
                except Exception:
                    continue

                for file_path in stats_files.keys():
                    norm_path = file_path.replace("\\", "/")
                    if norm_path not in file_metrics:
                        file_metrics[norm_path] = {
                            "commit_frequency": 0,
                            "code_churn": 0,
                            "authors": set(),
                            "bug_fixes_count": 0
                        }

                    stat = stats_files[file_path]
                    file_metrics[norm_path]["commit_frequency"] += 1
                    file_metrics[norm_path]["code_churn"] += stat.get("insertions", 0) + stat.get("deletions", 0)
                    file_metrics[norm_path]["authors"].add(author)
                    if is_bug_fix:
                        file_metrics[norm_path]["bug_fixes_count"] += 1

            # Convert sets to author counts
            result = {}
            for path, data in file_metrics.items():
                result[path] = {
                    "commit_frequency": data["commit_frequency"],
                    "code_churn": data["code_churn"],
                    "authors_count": max(1, len(data["authors"])),
                    "bug_fixes_count": data["bug_fixes_count"]
                }
            return result
        except Exception as e:
            print(f"[GitMiner] Git mining error: {e}")
            return {}
