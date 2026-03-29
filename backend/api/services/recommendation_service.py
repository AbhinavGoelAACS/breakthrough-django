"""
Reviewer Recommendation using NLP text matching

Algorithm:
1. For each reviewer, compute:
   - profile_score: Text similarity between paper (title+abstract+keywords+research_area) 
     and reviewer.specialization
   - history_score: Text similarity between paper and keywords from papers the reviewer 
     has previously reviewed
2. Text similarity uses:
   - Exact word matches
   - Partial/substring matches (e.g., "engineer" in "engineering")
   - TF-IDF fallback for longer texts
3. Final score = profile_score * 0.5 + history_score * 0.5
4. Return top 5 reviewers with score >= 0.15
"""

import re
import logging

logger = logging.getLogger(__name__)

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger.warning("scikit-learn not installed. Using fallback text matching.")


class RecommendationService:
    PROFILE_WEIGHT = 0.5
    HISTORY_WEIGHT = 0.5
    MIN_RECOMMENDATION_SCORE = 0.15
    MAX_RECOMMENDED = 5

    def _combine_paper_text(self, paper) -> str:
        """Combine paper fields - keywords and research_area weighted higher"""
        parts = []
        if paper.keyword:
            parts.extend([paper.keyword, paper.keyword])  # Double weight
        if paper.research_area:
            parts.extend([paper.research_area, paper.research_area])
        if paper.abstract:
            parts.append(paper.abstract)
        if paper.title:
            parts.append(paper.title)
        return ' '.join(parts).lower()

    def _get_reviewer_history_text(self, reviewer_id: int) -> str:
        """Build text from reviewer's past reviewed papers"""
        from api.models import OnlineReview, Paper
        
        # Get paper IDs that this reviewer has completed reviews for
        paper_ids = OnlineReview.objects.filter(
            reviewer_id=str(reviewer_id),
            review_status__in=['completed', 'submitted']
        ).values_list('paper_id', flat=True)
        
        papers = Paper.objects.filter(id__in=paper_ids)
        text_parts = []
        for p in papers:
            if p.keyword:
                text_parts.append(p.keyword)
            if p.research_area:
                text_parts.append(p.research_area)
        
        return ' '.join(text_parts).lower()

    def _compute_text_similarity(self, text1: str, text2: str) -> float:
        """Multi-strategy text similarity"""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(re.findall(r'\b[a-z]{3,}\b', text1.lower()))
        words2 = set(re.findall(r'\b[a-z]{3,}\b', text2.lower()))
        
        if not words1 or not words2:
            return 0.0

        # Exact word matches
        exact = words1 & words2
        
        # Partial matches (substring or common prefix)
        partial = 0
        for w1 in words1:
            for w2 in words2:
                if len(w1) >= 4 and len(w2) >= 4:
                    if (w1 in w2 or w2 in w1) and w1 not in exact:
                        partial += 1
                    elif w1[:5] == w2[:5] and w1 not in exact:
                        partial += 0.5

        total = len(exact) + partial * 0.7
        if total > 0:
            score = min(total / min(len(words1), len(words2)), 1.0)
            # Boost score if there are exact matches
            return min(score + 0.2, 1.0) if exact else score

        # TF-IDF fallback for longer texts
        if SKLEARN_AVAILABLE and len(text1.split()) >= 5 and len(text2.split()) >= 5:
            try:
                vectorizer = TfidfVectorizer(
                    lowercase=True,
                    stop_words='english',
                    ngram_range=(1, 2),
                    max_features=5000
                )
                matrix = vectorizer.fit_transform([text1, text2])
                return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
            except Exception as e:
                logger.warning(f"TF-IDF computation failed: {e}")
        
        return 0.0

    def get_recommendations(self, paper, reviewers):
        """
        Compute recommendations for all reviewers
        
        Args:
            paper: Paper model instance
            reviewers: QuerySet or list of User model instances
            
        Returns:
            List of recommendation dicts with scores
        """
        paper_text = self._combine_paper_text(paper)
        results = []

        for reviewer in reviewers:
            # Profile-based score
            specialization = (reviewer.specialization or "").lower()
            profile_score = self._compute_text_similarity(paper_text, specialization)
            
            # History-based score
            history_text = self._get_reviewer_history_text(reviewer.id)
            history_score = self._compute_text_similarity(paper_text, history_text)
            
            # Weighted final score
            score = self.PROFILE_WEIGHT * profile_score + self.HISTORY_WEIGHT * history_score

            match_reason = ""
            if profile_score > 0.1 and reviewer.specialization:
                spec_preview = reviewer.specialization[:50] if len(reviewer.specialization) > 50 else reviewer.specialization
                match_reason = f"Expertise in {spec_preview}"
            elif history_score > 0.1:
                match_reason = "Has reviewed similar papers"

            results.append({
                "reviewer_id": reviewer.id,
                "score": round(score, 4),
                "profile_score": round(profile_score, 4),
                "history_score": round(history_score, 4),
                "match_reason": match_reason
            })

        # Sort by score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        
        # Mark top reviewers as recommended
        for i, r in enumerate(results):
            r["is_recommended"] = i < self.MAX_RECOMMENDED and r["score"] >= self.MIN_RECOMMENDATION_SCORE
        
        return results

    def enrich_reviewers_with_recommendations(self, paper_id: int, reviewers_list: list):
        """
        Enrich reviewer dicts with recommendation data
        
        Args:
            paper_id: ID of the paper to match reviewers against
            reviewers_list: List of reviewer dictionaries (must have 'id' key)
            
        Returns:
            Enriched and sorted list of reviewer dicts
        """
        from api.models import Paper, User

        paper = Paper.objects.filter(id=paper_id).first()
        if not paper:
            return reviewers_list

        # Get User objects for the reviewers
        reviewer_ids = [r["id"] for r in reviewers_list]
        reviewers = User.objects.filter(id__in=reviewer_ids)
        
        # Get recommendations
        recommendations = self.get_recommendations(paper, reviewers)
        rec_map = {r["reviewer_id"]: r for r in recommendations}

        # Enrich the original list
        for r in reviewers_list:
            rec = rec_map.get(r["id"], {})
            r["is_recommended"] = rec.get("is_recommended", False)
            r["recommendation_score"] = rec.get("score", 0.0)
            r["profile_score"] = rec.get("profile_score", 0.0)
            r["history_score"] = rec.get("history_score", 0.0)
            r["match_reason"] = rec.get("match_reason", "")

        # Sort: recommended first, then by score
        return sorted(
            reviewers_list,
            key=lambda x: (x["is_recommended"], x["recommendation_score"]),
            reverse=True
        )
