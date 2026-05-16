"""
URL configuration for bp_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from api.views_scholar import (
    ScholarPaperView,
    ScholarBrowseView,
    ScholarBrowseYearView,
    ScholarBrowseRecentView,
    RobotsView,
    SitemapView,
    ScholarQAView,
)


def custom_404(request, exception=None):
    return JsonResponse({"detail": "Not found."}, status=404)


def custom_500(request):
    return JsonResponse({"detail": "Internal server error."}, status=500)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("api.urls")),

    # Google Scholar indexing pages — server-rendered, no JS required
    path("scholar/paper/<str:paper_code>/", ScholarPaperView.as_view(),       name="scholar-paper"),

    # Crawl discovery — browse by date (plain HTML, no JS)
    path("browse/",                         ScholarBrowseView.as_view(),       name="scholar-browse"),
    path("browse/recent/",                  ScholarBrowseRecentView.as_view(), name="scholar-browse-recent"),
    path("browse/<int:year>/",              ScholarBrowseYearView.as_view(),   name="scholar-browse-year"),

    # Crawler infrastructure
    path("robots.txt",                      RobotsView.as_view(),              name="robots-txt"),
    path("sitemap.xml",                     SitemapView.as_view(),             name="sitemap-xml"),

    # Scholar QA — editor/admin only
    path("api/v1/editor/scholar-qa/<str:paper_code>/", ScholarQAView.as_view(), name="scholar-qa"),

    # OpenAPI endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = custom_404
handler500 = custom_500
