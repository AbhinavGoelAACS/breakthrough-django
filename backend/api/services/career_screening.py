"""Keyword screening of a resume against a job posting.

The score compares the whole resume with four parts of the posting — the
curated skills list, the requirements, the responsibilities and the
description — rather than the skills list alone. Each part that has content
contributes its coverage (what fraction of its meaningful terms appear in the
resume), weighted so the curated skills list dominates and the prose sections
refine it. Weights are renormalised over whichever parts are actually filled
in, so a posting with no responsibilities is not penalised for it.

This is a keyword match, not an assessment of a candidate, and every surface
that shows the number says so.
"""

import re
from typing import Dict, Iterable, List


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

# Relative influence of each part of the posting. Skills are curated by an
# editor so they carry the most; the description is the loosest prose and
# carries the least. Renormalised over the sections that have content.
SECTION_WEIGHTS = {
    "skills": 5,
    "requirements": 2,
    "responsibilities": 2,
    "description": 1,
}

# Words that appear in almost any job ad and almost any resume. Counting them
# would push every candidate towards the same score and flatten the ranking.
STOPWORDS = {
    "a", "an", "and", "any", "are", "as", "at", "able", "about", "above", "across",
    "after", "all", "also", "am", "amongst", "be", "been", "being", "best", "both",
    "but", "by", "can", "candidate", "candidates", "closely", "company", "day",
    "days", "detail", "do", "does", "each", "etc", "excellent", "for", "from",
    "full", "good", "great", "has", "have", "having", "help", "high", "how", "in",
    "including", "into", "is", "it", "its", "job", "join", "keep", "less", "like",
    "look", "looking", "make", "makes", "many", "may", "month", "months", "more",
    "most", "must", "need", "needs", "new", "not", "of", "off", "on", "one", "only",
    "or", "other", "our", "out", "over", "own", "part", "per", "plus", "position",
    "post", "prefer", "preferred", "role", "roles", "same", "seeking", "several",
    "she", "should", "similar", "so", "some", "strong", "such", "team", "teams",
    "than", "that", "the", "their", "them", "then", "there", "these", "they",
    "this", "those", "through", "time", "to", "up", "us", "use", "using", "very",
    "want", "we", "well", "what", "when", "where", "which", "while", "who", "will",
    "with", "within", "work", "working", "would", "year", "years", "you", "your",
    # Frequent in both job ads and resumes, so they separate nobody.
    "ability", "experience", "experienced", "knowledge", "responsibilities",
    "requirements", "skills", "responsible", "required", "support", "ensure",
    "manage", "management", "provide", "including", "across", "related", "based",
}

MIN_TERM_LENGTH = 3


def _normalize_text(value: str) -> str:
    if not value:
        return ""
    value = value.lower()
    value = value.replace("/", " ")
    value = re.sub(r"[^a-z0-9+\s]", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def _skill_matches(skill_name: str, normalized_resume: str) -> bool:
    """True when the skill, or any known alias, appears as whole words.

    Aliases are normalised the same way as the resume, otherwise "scikit-learn"
    could never match a resume where the hyphen has already become a space. The
    match is anchored on word boundaries because a plain substring test lets
    short aliases fire inside unrelated words — "ml" inside "html" being the
    obvious one.
    """
    normalized_skill = _normalize_text(skill_name)
    if not normalized_skill:
        return False
    aliases = SKILL_ALIASES.get(normalized_skill, [normalized_skill])
    for alias in aliases:
        normalized_alias = _normalize_text(alias)
        if not normalized_alias:
            continue
        if re.search(rf"\b{re.escape(normalized_alias)}\b", normalized_resume):
            return True
    return False


def _extract_required_skills(job: Dict) -> List[str]:
    skills = job.get("required_skills") or []
    if isinstance(skills, str):
        return [item.strip() for item in skills.split(",") if item.strip()]
    return [str(item).strip() for item in skills if str(item).strip()]


def _significant_terms(text: str) -> List[str]:
    """Meaningful words from a prose section, deduped and ordered."""
    normalized = _normalize_text(text)
    if not normalized:
        return []
    seen = {}
    for word in normalized.split():
        if len(word) < MIN_TERM_LENGTH or word in STOPWORDS or word.isdigit():
            continue
        seen.setdefault(word, None)
    return list(seen)


def _term_coverage(terms: Iterable[str], resume_words: set) -> float:
    terms = list(terms)
    if not terms:
        return 0.0
    hits = sum(1 for term in terms if term in resume_words)
    return hits / len(terms)


def job_screening_fields(job) -> Dict:
    """Everything the score is built from, read off a JobPosting instance.

    Kept here so the application endpoint and the rescore-on-edit path cannot
    drift apart in what they feed the scorer.
    """
    return {
        "title": job.title,
        "required_skills": job.required_skills,
        "experience_level": job.experience_level,
        "description": job.description,
        "requirements": job.requirements,
        "responsibilities": job.responsibilities,
    }


def screen_candidate_for_job(job: Dict, resume_text: str) -> Dict:
    """Return a screening score, matched/missing skills and a summary line."""
    normalized_resume = _normalize_text(resume_text)
    resume_words = set(normalized_resume.split())

    required_skills = _extract_required_skills(job)
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    for skill in required_skills:
        if _skill_matches(skill, normalized_resume):
            matched_skills.append(skill.lower())
        else:
            missing_skills.append(skill.lower())

    # (weight, coverage, human label) for each section that has content.
    parts = []
    if required_skills:
        coverage = len(matched_skills) / len(required_skills)
        parts.append((SECTION_WEIGHTS["skills"], coverage,
                      f"skills {len(matched_skills)}/{len(required_skills)}"))

    for key in ("requirements", "responsibilities", "description"):
        terms = _significant_terms(job.get(key) or "")
        if not terms:
            continue
        coverage = _term_coverage(terms, resume_words)
        parts.append((SECTION_WEIGHTS[key], coverage,
                      f"{key} {int(round(coverage * 100))}%"))

    if not parts:
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": [],
            "summary": "This role has no skills, requirements, responsibilities or "
                       "description to screen against, so no score could be produced.",
        }

    if not normalized_resume:
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": sorted(dict.fromkeys(missing_skills)),
            "summary": "No resume text could be read, so this profile needs manual review.",
        }

    total_weight = sum(weight for weight, _, _ in parts)
    score = int(round(sum(weight * coverage for weight, coverage, _ in parts) / total_weight * 100))
    score = max(0, min(100, score))

    if score >= 80:
        verdict = "Strong keyword match across the posting."
    elif score >= 60:
        verdict = "Good match; some of the posting is not evidenced in the resume."
    elif score >= 40:
        verdict = "Partial match; worth reading before deciding."
    else:
        verdict = "Little overlap with the posting on keywords alone."

    breakdown = " · ".join(label for _, _, label in parts)

    return {
        "score": score,
        "matched_skills": sorted(dict.fromkeys(matched_skills)),
        "missing_skills": sorted(dict.fromkeys(missing_skills)),
        "summary": f"{verdict} ({breakdown})",
    }
