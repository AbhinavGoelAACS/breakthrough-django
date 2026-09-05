import re
from typing import Dict, List, Tuple


SKILL_ALIASES = {
    "django": ["django", "dj"],
    "python": ["python", "py"],
    "java": ["java", "core java", "java programming"],
    "javascript": ["javascript", "js", "es6", "nodejs"],
    "react": ["react", "reactjs", "react.js"],
    "fastapi": ["fastapi", "fast api"],
    "sql": ["sql", "postgresql", "mysql", "database"],
    "postgresql": ["postgresql", "psql"],
    "mysql": ["mysql"],
    "machine learning": ["machine learning", "ml", "scikit-learn", "sklearn"],
    "ai": ["ai", "artificial intelligence"],
    "rest api": ["rest api", "restful api", "apis", "api development"],
    "git": ["git", "github"],
    "data structures": ["data structures", "dsa", "algorithms"],
    "css": ["css", "html", "frontend"],
    "streamlit": ["streamlit"],
    "pandas": ["pandas"],
    "numpy": ["numpy"],
    "langchain": ["langchain"],
    "openai": ["openai", "open ai"],
    "spring boot": ["spring boot", "springboot"],
}


def _normalize_text(value: str) -> str:
    if not value:
        return ""
    value = value.lower()
    value = value.replace("/", " ")
    value = re.sub(r"[^a-z0-9+\s]", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def _skill_matches(skill_name: str, resume_text: str) -> bool:
    normalized_skill = _normalize_text(skill_name)
    normalized_resume = _normalize_text(resume_text)
    aliases = SKILL_ALIASES.get(normalized_skill, [normalized_skill])
    return any(alias in normalized_resume for alias in aliases)


def _extract_required_skills(job: Dict) -> List[str]:
    skills = job.get("required_skills") or []
    if isinstance(skills, str):
        return [item.strip() for item in skills.split(",") if item.strip()]
    return [str(item).strip() for item in skills if str(item).strip()]


def screen_candidate_for_job(job: Dict, resume_text: str) -> Dict:
    """Return a lightweight screening score and recommendation for a job."""
    required_skills = _extract_required_skills(job)
    if not required_skills:
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "summary": "No job skills were defined for this role.",
        }

    normalized_resume = _normalize_text(resume_text)
    matched_skills = []
    missing_skills = []

    for skill in required_skills:
        if _skill_matches(skill, normalized_resume):
            matched_skills.append(skill.lower())
        else:
            missing_skills.append(skill.lower())

    safe_total = max(len(required_skills), 1)
    score = int(round((len(matched_skills) / safe_total) * 100))

    if score >= 80:
        summary = "Strong fit for the role with strong skill alignment and relevant experience."
    elif score >= 60:
        summary = "Good potential fit; a few key skills are still missing or need validation."
    elif score >= 40:
        summary = "Moderate fit; candidate may need further evaluation for role-specific skills."
    else:
        summary = "Low fit based on current skill match; additional screening is recommended."

    return {
        "score": max(0, min(100, score)),
        "matched_skills": sorted(dict.fromkeys(matched_skills)),
        "missing_skills": sorted(dict.fromkeys(missing_skills)),
        "summary": summary,
    }
