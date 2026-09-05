from django.test import TestCase

from api.services.career_screening import screen_candidate_for_job


class CareerScreeningTests(TestCase):
    def test_screen_candidate_for_job_highlights_required_skills(self):
        job = {
            "title": "Python Backend Developer",
            "required_skills": ["python", "django", "rest api", "postgresql"],
            "experience_level": "mid",
        }
        resume_text = (
            "Python developer with Django, FastAPI, REST APIs and PostgreSQL experience. "
            "Built scalable backend services and APIs for product teams."
        )

        result = screen_candidate_for_job(job, resume_text)

        self.assertGreater(result["score"], 70)
        self.assertIn("python", result["matched_skills"])
        self.assertIn("django", result["matched_skills"])
        self.assertNotIn("rest api", result["missing_skills"])
        self.assertIn("Strong fit", result["summary"])