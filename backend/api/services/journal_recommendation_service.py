"""
Journal Recommendation using TF-IDF + Cosine Similarity

Algorithm:
1. HARD FILTER: Only journals matching the selected research_area (via description/scope text match)
2. For each journal, compute:
   - abstract_score: TF-IDF cosine similarity between paper abstract and journal scope/description
   - keyword_score: Overlap ratio of paper keywords found in journal text
3. Final score = abstract_score * 0.6 + keyword_score * 0.4
4. Return top 3 journals with score >= 0.05
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


class JournalRecommendationService:
    ABSTRACT_WEIGHT = 0.6
    KEYWORD_WEIGHT = 0.4
    MIN_RECOMMENDATION_SCORE = 0.05
    MAX_RECOMMENDATIONS = 3

    def _clean_html(self, text: str) -> str:
        """Remove HTML tags"""
        if not text:
            return ""
        return re.sub(r'<[^>]+>', '', text).strip()

    def _build_journal_text(self, journal, details=None) -> str:
        """Combine journal fields into searchable text"""
        parts = [
            journal.fld_journal_name or "",
            self._clean_html(journal.description or "")
        ]
        if details:
            parts.extend([
                self._clean_html(details.scope or ""),
                self._clean_html(details.scope or ""),  # Double weight for scope
                self._clean_html(details.aim_objective or ""),
                self._clean_html(details.about_journal or ""),
            ])
        return ' '.join(parts).lower()

    def _compute_tfidf_similarity(self, text1: str, text2: str) -> float:
        """TF-IDF cosine similarity"""
        if not text1 or not text2 or len(text1) < 20 or len(text2) < 20:
            return 0.0
        
        if not SKLEARN_AVAILABLE:
            return self._fallback_similarity(text1, text2)
        
        try:
            vectorizer = TfidfVectorizer(
                lowercase=True,
                stop_words='english',
                ngram_range=(1, 2),
                max_features=2000
            )
            tfidf_matrix = vectorizer.fit_transform([text1.lower(), text2.lower()])
            return float(cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0])
        except Exception as e:
            logger.warning(f"TF-IDF computation failed: {e}")
            return self._fallback_similarity(text1, text2)

    def _fallback_similarity(self, text1: str, text2: str) -> float:
        """Fallback word overlap similarity when sklearn not available"""
        if not text1 or not text2:
            return 0.0
        words1 = set(re.findall(r'\b[a-z]{3,}\b', text1.lower()))
        words2 = set(re.findall(r'\b[a-z]{3,}\b', text2.lower()))
        if not words1 or not words2:
            return 0.0
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        return intersection / union if union > 0 else 0.0

    def _compute_keyword_overlap(self, keywords: list, journal_text: str) -> tuple:
        """Return (score, matched_keywords)"""
        if not keywords or not journal_text:
            return 0.0, []
        journal_words = set(re.findall(r'\b[a-z]{3,}\b', journal_text.lower()))
        matched = []
        for kw in keywords:
            kw_lower = kw.lower().strip()
            if not kw_lower:
                continue
            # Check for exact phrase match or word overlap
            if kw_lower in journal_text.lower():
                matched.append(kw)
            else:
                kw_words = set(re.findall(r'\b[a-z]{3,}\b', kw_lower))
                if kw_words & journal_words:
                    matched.append(kw)
        
        score = min(len(matched) / len(keywords), 1.0) if keywords else 0.0
        return score, matched

    def _matches_research_area(self, research_area: str, journal_text: str) -> bool:
        """Check if research area matches journal text"""
        if not research_area or not journal_text:
            return True  # No filter if no research area specified
        
        research_lower = research_area.lower().strip()
        journal_lower = journal_text.lower()
        
        # Direct match
        if research_lower in journal_lower:
            return True
        
        # Word-level match
        research_words = set(re.findall(r'\b[a-z]{4,}\b', research_lower))
        journal_words = set(re.findall(r'\b[a-z]{4,}\b', journal_lower))
        
        # At least 50% of research area words should match
        if research_words:
            match_ratio = len(research_words & journal_words) / len(research_words)
            return match_ratio >= 0.3
        
        return False

    def get_recommendations(self, research_area: str, keywords: list, abstract: str = ""):
        """
        Main recommendation method
        
        Args:
            research_area: The research category/area (e.g., "Computer Science")
            keywords: List of paper keywords
            abstract: Paper abstract text
            
        Returns:
            List of journal recommendations with scores
        """
        from api.models import Journal, JournalDetails

        # Get all journals
        journals = Journal.objects.all()
        
        # Build details map: journal_id -> JournalDetails
        details_map = {}
        for d in JournalDetails.objects.all():
            try:
                jid = int(d.journal_id) if d.journal_id else None
                if jid:
                    details_map[jid] = d
            except (ValueError, TypeError):
                continue

        results = []
        for journal in journals:
            journal_text = self._build_journal_text(journal, details_map.get(journal.fld_id))
            
            # Hard filter: Check if research area matches
            if research_area and not self._matches_research_area(research_area, journal_text):
                continue
            
            # Compute scores
            abstract_score = self._compute_tfidf_similarity(abstract, journal_text) * 1.2
            keyword_score, matched = self._compute_keyword_overlap(keywords, journal_text)
            
            # Weighted final score
            final_score = min(abstract_score, 1.0) * self.ABSTRACT_WEIGHT + keyword_score * self.KEYWORD_WEIGHT

            if final_score >= self.MIN_RECOMMENDATION_SCORE:
                match_reason = ""
                if matched:
                    match_reason = f"Keywords: {', '.join(matched[:3])}"
                elif research_area:
                    match_reason = f"In {research_area}"
                else:
                    match_reason = "Content match"

                results.append({
                    "journal_id": journal.fld_id,
                    "journal_name": journal.fld_journal_name,
                    "short_form": journal.short_form,
                    "score": round(final_score, 3),
                    "is_recommended": True,
                    "match_reason": match_reason,
                    "abstract_score": round(min(abstract_score, 1.0), 3),
                    "keyword_score": round(keyword_score, 3),
                    "matched_keywords": matched[:5]
                })

        # Sort by score and return top recommendations
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:self.MAX_RECOMMENDATIONS]
