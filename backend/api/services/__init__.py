from importlib import import_module

__all__ = ["JournalRecommendationService", "RecommendationService"]


def __getattr__(name):
	if name == "JournalRecommendationService":
		return import_module(".journal_recommendation_service", __name__).JournalRecommendationService
	if name == "RecommendationService":
		return import_module(".recommendation_service", __name__).RecommendationService
	raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
