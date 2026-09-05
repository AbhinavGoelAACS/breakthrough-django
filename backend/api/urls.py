from django.urls import path

from .views_auth import (
    ChangePasswordView,
    ForgotPasswordView,
    LoginView,
    MeView,
    RefreshTokenView,
    ResetPasswordView,
    SignupView,
    CoAuthorTokenStatusView,
    CompleteProfileView,
)
from .views_journals import (
    IssuePapersView,
    JournalAllIssuesView,
    JournalByShortFormView,
    JournalDetailView,
    JournalEditorialBoardView,
    JournalExtendedDetailsView,
    JournalListView,
    JournalRecommendationView,
    JournalVolumesView,
    VolumeIssuesView,
)
from .views_articles import (
    ArticleDetailView,
    ArticleListView,
    ArticlePDFView,
    ArticlesByJournalView,
    LatestArticlesView,
    PublicNewsDetailView,
    PublicNewsListView,
    ArticleAbstractView,
)
from .views_author import (
    AuthorStatsView,
    AuthorSubmissionsView,
    AuthorSubmissionDetailView,
    AuthorProfileView,
    SubmitPaperView,
    AuthorPaperRevisionsView,
    AuthorPaperResubmitView,
    AuthorCorrespondenceListView,
    AuthorCorrespondenceReadView,
    AuthorContactEditorialView,
    AuthorUnreadCorrespondenceCountView,
    AuthorPaperCommentsView,
    AuthorPaperDecisionView,
    AuthorPaperDownloadView,
    AuthorPaperView,
    AuthorPaperTitlePageView,
    AuthorPaperBlindedManuscriptView,
    AuthorReviewReportView,
    AuthorRequestReviewersView,
)

from .views_roles import (
    MyRolesView,
    RoleRequestView,
    SwitchRoleView,
    AdminRoleRequestsView,
    AdminProcessRoleRequestView,
    AdminUserRolesView,
    AdminRevokeUserRoleView,
)

from .views_webhooks import (
    EmailDeliveryWebhookView,
    EmailDeliveryStatusView,
)

from .views_editor import (
    MyJournalsView, EditorJournalDetailView, EditorDashboardStatsView,
    EditorPendingActionsView, EditorPaperQueueView, EditorPapersPendingDecisionView,
    EditorPaperDetailView, EditorInviteReviewerView, EditorAssignReviewerView,
    EditorPaperReviewsView, ListAvailableReviewersView, EditorPaperStatusUpdateView,
    EditorPaperDecisionView, EditorPublishPaperView, EditorAcceptedPapersView,
    EditorReadyToPublishView, EditorPaperViewTitlePage, EditorPaperViewBlindedManuscript,
    EditorPaperViewTrackChanges, EditorPaperViewCleanRevision, EditorPaperViewResponseToReviewer,
    EditorPaperViewFile,
    EditorPublishPaperWithFileView, EditorCheckDOIStatusView, InvitationStatusView,
    EditorPublishedPapersView, EditorPublishedPaperAccessUpdateView,
    AcceptInvitationView,
    DeclineInvitationView,
    RegisterAcceptInvitationView,
    EditorPaperSubmissionHistoryView, EditorPaperVersionFileView,
    EditorPaperInvitationsView,
    EditorRemindInvitationView,
    EditorPaperPreviousReviewersView,
)

from .views_reviewer import (
    ReviewerDashboardStatsView,
    ReviewerProfileView,
    ReviewerInvitationsView,
    AcceptInvitationAuthView,
    DeclineInvitationAuthView,
    ReviewerAssignmentsView,
    ReviewerAssignmentDetailView,
    ReviewerAssignmentPaperDetailView,
    ReviewerAssignmentViewPaperView,
    ReviewerSaveDraftView,
    ReviewerSubmitReviewCompleteView,
    ReviewerUploadReportView,
    ReviewerDownloadReportView,
    ReviewerSubmitReviewBasicView,
    ReviewerHistoryView,
    ReviewerNotifyUpdateView,
    AdminDeadlineReminderView,
    # Phase 3: Reviewer document views
    ReviewerViewTrackChangesView,
    ReviewerViewCleanManuscriptView,
    ReviewerViewResponseToReviewerView,
)


from .views_admin import (
    AdminDashboardStatsView, AdminRecentActivityView, AdminPapersByStatusView,
    AdminUsersListView, AdminUserRoleUpdateView, AdminUserRolesDetailView,
    AdminUserDeleteView, AdminPapersListView, AdminPaperDetailView,
    AdminJournalsListView, AdminPaperFileView, AdminPaperAccessUpdateView,
    AdminBulkAccessUpdateView,
    # Editor management
    AdminEditorsListView, AdminJournalEditorsView, AdminEditorDetailView,
    # Phase 4: User creation and correspondence
    AdminUserCreateView, AdminPaperCorrespondenceView,
    # Phase 5: Published papers and DOI
    AdminPublishedPapersListView, AdminPublishedPaperDetailView,
    AdminTriggerCopyrightView, AdminDOIStatisticsView,
    # Phase 7: News management
    AdminNewsListCreateView, AdminNewsDetailView,
    # Phase 8: Email templates
    AdminEmailTemplateListCreateView, AdminEmailTemplateDetailView,
    # Phase 9: Analytics
    AdminSubmissionTrendsView, AdminTopReviewersView, AdminStatusDistributionView,
    AdminJournalStatsView, AdminUserGrowthView, AdminReviewMetricsView,
)

from .views_copyright import (
    CopyrightPendingView,
    CopyrightDetailView,
    CopyrightSubmitView,
)

from .views_books_admin import (
    AdminBookChapterDetailView,
    AdminBookGuestEditorDetailView,
    AdminBookGuestEditorListView,
    GuestEditorInvitationView,
    GuestEditorRespondView,
    MyVolumesView,
    AdminBookChapterListView,
    AdminBookContributorsView,
    AdminBookDetailView,
    AdminBookListView,
    AdminBookSeriesDetailView,
    AdminBookSeriesListView,
    AdminDownloadDetailView,
    AdminDownloadListView,
    AdminProposalConvertView,
)
from .views_books import (
    AdminProposalDetailView,
    AdminProposalListView,
    BookDetailView,
    BookListView,
    BookProposalCreateView,
    BookSeriesListView,
    DownloadAssetListView,
    ProceedingsProposalCreateView,
)
from .views_careers import (
    CareerJobsListView,
    CareerJobDetailView,
    JobApplicationCreateView,
    AdminCareerJobsView,
    AdminCareerApplicationsView,
    AdminCareerApplicationDetailView,
    AdminCareerSendInviteView,
)

urlpatterns = [
    # Auth endpoints
    path("api/v1/auth/login", LoginView.as_view(), name="auth-login"),
    path("api/v1/auth/signup", SignupView.as_view(), name="auth-signup"),
    path("api/v1/auth/refresh", RefreshTokenView.as_view(), name="auth-refresh"),
    path("api/v1/auth/me", MeView.as_view(), name="auth-me"),
    path(
        "api/v1/auth/change-password",
        ChangePasswordView.as_view(),
        name="auth-change-password",
    ),
    path(
        "api/v1/auth/forgot-password",
        ForgotPasswordView.as_view(),
        name="auth-forgot-password",
    ),
    path(
        "api/v1/auth/reset-password",
        ResetPasswordView.as_view(),
        name="auth-reset-password",
    ),
    # Co-author profile completion endpoints
    path(
        "api/v1/auth/coauthor-token/<str:token>",
        CoAuthorTokenStatusView.as_view(),
        name="auth-coauthor-token-status",
    ),
    path(
        "api/v1/auth/complete-profile/<str:token>",
        CompleteProfileView.as_view(),
        name="auth-complete-profile",
    ),
    # Journal endpoints
    path("api/v1/journals/", JournalListView.as_view(), name="journals-list"),
    path(
        "api/v1/journals/recommend/",
        JournalRecommendationView.as_view(),
        name="journal-recommendations",
    ),
    path(
        "api/v1/journals/by-subdomain/<str:short_form>",
        JournalByShortFormView.as_view(),
        name="journals-by-short-form",
    ),
    path(
        "api/v1/journals/by-subdomain/<str:short_form>/editorial-board",
        JournalEditorialBoardView.as_view(),
        name="journals-editorial-board",
    ),
    path(
        "api/v1/journals/<int:journal_id>",
        JournalDetailView.as_view(),
        name="journals-detail-update-delete",
    ),
    path(
        "api/v1/journals/<int:journal_id>/details",
        JournalExtendedDetailsView.as_view(),
        name="journals-extended-details",
    ),
    path(
        "api/v1/journals/<int:journal_id>/volumes",
        JournalVolumesView.as_view(),
        name="journals-volumes",
    ),
    path(
        "api/v1/journals/<int:journal_id>/volumes/<int:volume_no>/issues",
        VolumeIssuesView.as_view(),
        name="journals-volume-issues",
    ),
    path(
        "api/v1/journals/<int:journal_id>/issues",
        JournalAllIssuesView.as_view(),
        name="journals-all-issues",
    ),
    path(
        "api/v1/journals/<int:journal_id>/issues/<int:volume_no>/<int:issue_no>/papers",
        IssuePapersView.as_view(),
        name="journals-issue-papers",
    ),
    # Articles endpoints
    path("api/v1/articles/", ArticleListView.as_view(), name="articles-list"),
    path(
        "api/v1/articles/latest",
        LatestArticlesView.as_view(),
        name="articles-latest",
    ),
    path(
        "api/v1/articles/<int:article_id>",
        ArticleDetailView.as_view(),
        name="articles-detail",
    ),
    path(
        "api/v1/articles/<int:article_id>/pdf",
        ArticlePDFView.as_view(),
        name="articles-pdf",
    ),
    path(
        "api/v1/articles/journal/<int:journal_id>",
        ArticlesByJournalView.as_view(),
        name="articles-by-journal",
    ),
    # Public news endpoints
    path("api/v1/articles/news", PublicNewsListView.as_view(), name="news-list"),
    path(
        "api/v1/articles/news/<int:news_id>",
        PublicNewsDetailView.as_view(),
        name="news-detail",
    ),
    # Author endpoints (subset)
    path(
        "api/v1/author/dashboard/stats",
        AuthorStatsView.as_view(),
        name="author-stats",
    ),
    path(
        "api/v1/author/submissions",
        AuthorSubmissionsView.as_view(),
        name="author-submissions",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>",
        AuthorSubmissionDetailView.as_view(),
        name="author-submission-detail",
    ),
    path(
        "api/v1/author/profile",
        AuthorProfileView.as_view(),
        name="author-profile",
    ),
    path(
        "api/v1/author/submit-paper",
        SubmitPaperView.as_view(),
        name="author-submit-paper",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/correspondence",
        AuthorCorrespondenceListView.as_view(),
        name="author-correspondence-list",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/correspondence/<int:correspondence_id>/read",
        AuthorCorrespondenceReadView.as_view(),
        name="author-correspondence-read",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/contact-editorial",
        AuthorContactEditorialView.as_view(),
        name="author-contact-editorial",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/unread-count",
        AuthorUnreadCorrespondenceCountView.as_view(),
        name="author-unread-correspondence-count",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/revisions",
        AuthorPaperRevisionsView.as_view(),
        name="author-paper-revisions",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/resubmit",
        AuthorPaperResubmitView.as_view(),
        name="author-paper-resubmit",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/comments",
        AuthorPaperCommentsView.as_view(),
        name="author-paper-comments",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/decision",
        AuthorPaperDecisionView.as_view(),
        name="author-paper-decision",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/download",
        AuthorPaperDownloadView.as_view(),
        name="author-paper-download",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/view",
        AuthorPaperView.as_view(),
        name="author-paper-view",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/view-title-page",
        AuthorPaperTitlePageView.as_view(),
        name="author-paper-view-title-page",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/view-blinded-manuscript",
        AuthorPaperBlindedManuscriptView.as_view(),
        name="author-paper-view-blinded-manuscript",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/reviews/<int:review_id>/view-report",
        AuthorReviewReportView.as_view(),
        name="author-review-view-report",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/reviews/<int:review_id>/download-report",
        AuthorReviewReportView.as_view(),
        name="author-review-download-report",
    ),
    path(
        "api/v1/author/submissions/<int:paper_id>/request-reviewers",
        AuthorRequestReviewersView.as_view(),
        name="author-request-reviewers",
    ),
    
    # Roles user endpoints
    path(
        "api/v1/roles/my-roles",
        MyRolesView.as_view(),
        name="roles-my-roles",
    ),
    path(
        "api/v1/roles/request",
        RoleRequestView.as_view(),
        name="roles-request",
    ),
    path(
        "api/v1/roles/switch",
        SwitchRoleView.as_view(),
        name="roles-switch",
    ),
    
    # Roles admin endpoints
    path(
        "api/v1/roles/requests",
        AdminRoleRequestsView.as_view(),
        name="admin-roles-requests",
    ),
    path(
        "api/v1/roles/requests/<int:request_id>",
        AdminProcessRoleRequestView.as_view(),
        name="admin-roles-requests-process",
    ),
    path(
        "api/v1/roles/users/<int:user_id>/roles",
        AdminUserRolesView.as_view(),
        name="admin-roles-user",
    ),
    path(
        "api/v1/roles/users/<int:user_id>/roles/<str:role>",
        AdminRevokeUserRoleView.as_view(),
        name="admin-roles-user-revoke",
    ),
    
    # Webhook endpoints
    path(
        "api/v1/webhooks/email-delivery",
        EmailDeliveryWebhookView.as_view(),
        name="webhooks-email-delivery",
    ),
    path(
        "api/v1/webhooks/email-delivery/status/<str:webhook_id>",
        EmailDeliveryStatusView.as_view(),
        name="webhooks-email-delivery-status",
    ),
    
    # Copyright endpoints
    path(
        "api/v1/copyright/pending",
        CopyrightPendingView.as_view(),
        name="copyright-pending",
    ),
    path(
        "api/v1/copyright/<int:paper_id>",
        CopyrightDetailView.as_view(),
        name="copyright-detail",
    ),
    path(
        "api/v1/copyright/<int:paper_id>/submit",
        CopyrightSubmitView.as_view(),
        name="copyright-submit",
    ),
    
    # Editor endpoints
    path("api/v1/editor/my-journals", MyJournalsView.as_view(), name="editor-my-journals"),
    path("api/v1/editor/journals/<int:journal_id>", EditorJournalDetailView.as_view(), name="editor-journal-detail"),
    path("api/v1/editor/dashboard/stats", EditorDashboardStatsView.as_view(), name="editor-dashboard-stats"),
    path("api/v1/editor/pending-actions", EditorPendingActionsView.as_view(), name="editor-pending-actions"),
    path("api/v1/editor/paper-queue", EditorPaperQueueView.as_view(), name="editor-paper-queue"),
    path("api/v1/editor/papers-pending-decision", EditorPapersPendingDecisionView.as_view(), name="editor-papers-pending-decision"),
    path("api/v1/editor/papers/<int:paper_id>", EditorPaperDetailView.as_view(), name="editor-paper-detail"),
    path("api/v1/editor/papers/<int:paper_id>/invite-reviewer", EditorInviteReviewerView.as_view(), name="editor-invite-reviewer"),
    path("api/v1/editor/papers/<int:paper_id>/invitations", EditorPaperInvitationsView.as_view(), name="editor-paper-invitations"),
    path("api/v1/editor/papers/<int:paper_id>/invitations/<int:invitation_id>/remind", EditorRemindInvitationView.as_view(), name="editor-remind-invitation"),
    path("api/v1/editor/papers/<int:paper_id>/previous-reviewers", EditorPaperPreviousReviewersView.as_view(), name="editor-paper-previous-reviewers"),
    path("api/v1/editor/papers/<int:paper_id>/assign-reviewer", EditorAssignReviewerView.as_view(), name="editor-assign-reviewer"),
    path("api/v1/editor/papers/<int:paper_id>/reviews", EditorPaperReviewsView.as_view(), name="editor-paper-reviews"),
    path("api/v1/editor/reviewers", ListAvailableReviewersView.as_view(), name="editor-reviewers"),
    path("api/v1/editor/papers/<int:paper_id>/status", EditorPaperStatusUpdateView.as_view(), name="editor-paper-status"),
    path("api/v1/editor/papers/<int:paper_id>/decision", EditorPaperDecisionView.as_view(), name="editor-paper-decision"),
    path("api/v1/editor/papers/<int:paper_id>/publish", EditorPublishPaperView.as_view(), name="editor-publish-paper"),
    
    # New Editor endpoints added
    path("api/v1/editor/accepted-papers", EditorAcceptedPapersView.as_view(), name="editor-accepted-papers"),
    path("api/v1/editor/ready-to-publish", EditorReadyToPublishView.as_view(), name="editor-ready-to-publish"),
    path("api/v1/editor/published-papers", EditorPublishedPapersView.as_view(), name="editor-published-papers"),
    path("api/v1/editor/published-papers/<int:published_paper_id>/access", EditorPublishedPaperAccessUpdateView.as_view(), name="editor-published-paper-access"),
    path("api/v1/editor/papers/<int:paper_id>/view-title-page", EditorPaperViewTitlePage.as_view(), name="editor-paper-view-title-page"),
    path("api/v1/editor/papers/<int:paper_id>/view", EditorPaperViewFile.as_view(), name="editor-paper-view-file"),
    path("api/v1/editor/papers/<int:paper_id>/view-blinded-manuscript", EditorPaperViewBlindedManuscript.as_view(), name="editor-paper-view-blinded-manuscript"),
    path("api/v1/editor/papers/<int:paper_id>/view-track-changes", EditorPaperViewTrackChanges.as_view(), name="editor-paper-view-track-changes"),
    path("api/v1/editor/papers/<int:paper_id>/view-clean-revision", EditorPaperViewCleanRevision.as_view(), name="editor-paper-view-clean-revision"),
    path("api/v1/editor/papers/<int:paper_id>/view-response-to-reviewer", EditorPaperViewResponseToReviewer.as_view(), name="editor-paper-view-response-to-reviewer"),
    path("api/v1/editor/papers/<int:paper_id>/publish-with-file", EditorPublishPaperWithFileView.as_view(), name="editor-publish-paper-with-file"),
    path("api/v1/editor/papers/<int:paper_id>/doi-status", EditorCheckDOIStatusView.as_view(), name="editor-check-doi-status"),
    path("api/v1/editor/papers/<int:paper_id>/submission-history", EditorPaperSubmissionHistoryView.as_view(), name="editor-paper-submission-history"),
    path("api/v1/editor/papers/<int:paper_id>/versions/<int:version_id>/view", EditorPaperVersionFileView.as_view(), name="editor-paper-version-file"),
    
    # Invitation endpoints (Public Editor sub-namespace essentially)
    path("api/v1/invitations/status/<str:token>", InvitationStatusView.as_view(), name="invitations-status"),
    path("api/v1/invitations/<str:token>/accept", AcceptInvitationView.as_view(), name="invitations-accept"),
    path("api/v1/invitations/<str:token>/decline", DeclineInvitationView.as_view(), name="invitations-decline"),
    path("api/v1/invitations/<str:token>/register-accept", RegisterAcceptInvitationView.as_view(), name="invitations-register-accept"),
    
    # ------------------------------------------------------------------------
    # REVIEWER PORTAL
    # ------------------------------------------------------------------------
    
    # Dashboard & Profile
    path('api/v1/reviewer/dashboard/stats', ReviewerDashboardStatsView.as_view(), name='reviewer-dashboard-stats'),
    path('api/v1/reviewer/profile', ReviewerProfileView.as_view(), name='reviewer-profile'),
    
    # Invitations
    path('api/v1/reviewer/invitations', ReviewerInvitationsView.as_view(), name='reviewer-invitations'),
    path('api/v1/reviewer/invitations/<int:invitation_id>/accept', AcceptInvitationAuthView.as_view(), name='reviewer-accept-invitation-auth'),
    path('api/v1/reviewer/invitations/<int:invitation_id>/decline', DeclineInvitationAuthView.as_view(), name='reviewer-decline-invitation-auth'),
    
    # Assignments & History
    path('api/v1/reviewer/assignments', ReviewerAssignmentsView.as_view(), name='reviewer-assignments'),
    path('api/v1/reviewer/assignments/<int:review_id>', ReviewerAssignmentDetailView.as_view(), name='reviewer-assignment-detail'),
    path('api/v1/reviewer/assignments/<int:review_id>/detail', ReviewerAssignmentPaperDetailView.as_view(), name='reviewer-assignment-paper-detail'),
    path('api/v1/reviewer/assignments/<int:review_id>/view-paper', ReviewerAssignmentViewPaperView.as_view(), name='reviewer-assignment-view-paper'),
    path('api/v1/reviewer/history', ReviewerHistoryView.as_view(), name='reviewer-history'),
    
    # Review Submission Handling
    path('api/v1/reviewer/assignments/<int:review_id>/save-draft', ReviewerSaveDraftView.as_view(), name='reviewer-save-draft'),
    path('api/v1/reviewer/assignments/<int:review_id>/submit', ReviewerSubmitReviewCompleteView.as_view(), name='reviewer-submit-review-complete'),
    path('api/v1/reviewer/assignments/<int:review_id>/submit-review', ReviewerSubmitReviewBasicView.as_view(), name='reviewer-submit-review-basic'),
    path('api/v1/reviewer/assignments/<int:review_id>/upload-report', ReviewerUploadReportView.as_view(), name='reviewer-upload-report'),
    path('api/v1/reviewer/assignments/<int:review_id>/download-report', ReviewerDownloadReportView.as_view(), name='reviewer-download-report'),
    
    # Reviewer document views (Phase 3)
    path('api/v1/reviewer/assignments/<int:review_id>/view-track-changes', ReviewerViewTrackChangesView.as_view(), name='reviewer-view-track-changes'),
    path('api/v1/reviewer/assignments/<int:review_id>/view-clean-manuscript', ReviewerViewCleanManuscriptView.as_view(), name='reviewer-view-clean-manuscript'),
    path('api/v1/reviewer/assignments/<int:review_id>/view-response-to-reviewer', ReviewerViewResponseToReviewerView.as_view(), name='reviewer-view-response-to-reviewer'),
    
    # Notifications
    path('api/v1/reviewer/notify-update', ReviewerNotifyUpdateView.as_view(), name='reviewer-notify-update'),
    path('api/v1/reviewer/deadline-reminder', AdminDeadlineReminderView.as_view(), name='reviewer-deadline-reminder'),

    # Admin endpoints
    path("api/v1/admin/dashboard/stats", AdminDashboardStatsView.as_view(), name="admin-dashboard-stats"),
    path("api/v1/admin/activity", AdminRecentActivityView.as_view(), name="admin-activity"),
    path("api/v1/admin/stats/papers-by-status", AdminPapersByStatusView.as_view(), name="admin-papers-by-status"),
    
    path("api/v1/admin/users", AdminUsersListView.as_view(), name="admin-users-list"),
    path("api/v1/admin/users/<int:user_id>/role", AdminUserRoleUpdateView.as_view(), name="admin-user-role-update"),
    path("api/v1/admin/users/<int:user_id>/roles", AdminUserRolesDetailView.as_view(), name="admin-user-roles-detail"),
    path("api/v1/admin/users/<int:user_id>", AdminUserDeleteView.as_view(), name="admin-user-delete"),
    
    path("api/v1/admin/papers", AdminPapersListView.as_view(), name="admin-papers-list"),
    path("api/v1/admin/papers/<int:paper_id>", AdminPaperDetailView.as_view(), name="admin-paper-detail"),
    path("api/v1/admin/papers/<int:paper_id>/view", AdminPaperFileView.as_view(), name="admin-paper-file"),
    
    path("api/v1/admin/journals", AdminJournalsListView.as_view(), name="admin-journals-list"),
    
    path("api/v1/admin/published-papers/<int:paper_id>/access", AdminPaperAccessUpdateView.as_view(), name="admin-paper-access-update"),
    path("api/v1/admin/published-papers/bulk-access", AdminBulkAccessUpdateView.as_view(), name="admin-bulk-access"),
    
    # Editor management endpoints
    path("api/v1/admin/editors", AdminEditorsListView.as_view(), name="admin-editors"),
    path("api/v1/admin/journals/<int:journal_id>/editors", AdminJournalEditorsView.as_view(), name="admin-journal-editors"),
    path("api/v1/admin/editors/<int:editor_id>", AdminEditorDetailView.as_view(), name="admin-editor-detail"),
    
    # Phase 4: User creation and correspondence
    path("api/v1/admin/users/create", AdminUserCreateView.as_view(), name="admin-user-create"),
    path("api/v1/admin/papers/<int:paper_id>/correspondence", AdminPaperCorrespondenceView.as_view(), name="admin-paper-correspondence"),
    
    # Phase 5: Published papers and DOI
    path("api/v1/admin/published-papers", AdminPublishedPapersListView.as_view(), name="admin-published-papers-list"),
    path("api/v1/admin/published-papers/<int:paper_id>/detail", AdminPublishedPaperDetailView.as_view(), name="admin-published-paper-detail"),
    path("api/v1/admin/papers/<int:paper_id>/trigger-copyright-form", AdminTriggerCopyrightView.as_view(), name="admin-trigger-copyright"),
    path("api/v1/admin/doi-statistics", AdminDOIStatisticsView.as_view(), name="admin-doi-statistics"),
    
    # Phase 7: News management
    path("api/v1/admin/news", AdminNewsListCreateView.as_view(), name="admin-news-list-create"),
    path("api/v1/admin/news/<int:news_id>", AdminNewsDetailView.as_view(), name="admin-news-detail"),
    
    # Phase 8: Email templates
    path("api/v1/admin/email-templates", AdminEmailTemplateListCreateView.as_view(), name="admin-email-templates-list"),
    path("api/v1/admin/email-templates/<int:template_id>", AdminEmailTemplateDetailView.as_view(), name="admin-email-template-detail"),
    
    # Phase 9: Analytics
    path("api/v1/admin/analytics/submission-trends", AdminSubmissionTrendsView.as_view(), name="admin-analytics-submission-trends"),
    path("api/v1/admin/analytics/top-reviewers", AdminTopReviewersView.as_view(), name="admin-analytics-top-reviewers"),
    path("api/v1/admin/analytics/status-distribution", AdminStatusDistributionView.as_view(), name="admin-analytics-status-distribution"),
    path("api/v1/admin/analytics/journal-stats", AdminJournalStatsView.as_view(), name="admin-analytics-journal-stats"),
    path("api/v1/admin/analytics/user-growth", AdminUserGrowthView.as_view(), name="admin-analytics-user-growth"),
    path("api/v1/admin/analytics/review-metrics", AdminReviewMetricsView.as_view(), name="admin-analytics-review-metrics"),
    
    # Phase 10: Article abstract
    path("api/v1/articles/<int:article_id>/abstract", ArticleAbstractView.as_view(), name="article-abstract"),
    # Books & Conference Proceedings (public)
    path("api/v1/books/", BookListView.as_view(), name="books-list"),
    path("api/v1/books/proposals/", BookProposalCreateView.as_view(), name="book-proposal-create"),
    path("api/v1/books/<slug:slug>", BookDetailView.as_view(), name="book-detail"),
    path("api/v1/book-series/", BookSeriesListView.as_view(), name="book-series-list"),
    path("api/v1/proceedings/downloads/", DownloadAssetListView.as_view(), name="proceedings-downloads"),
    path(
        "api/v1/proceedings/proposals/",
        ProceedingsProposalCreateView.as_view(),
        name="proceedings-proposal-create",
    ),

    # Editorial queue for incoming proposals (admin/editor only)
    path("api/v1/admin/proposals/", AdminProposalListView.as_view(), name="admin-proposals-list"),
    path(
        "api/v1/admin/proposals/<str:kind>/<int:proposal_id>",
        AdminProposalDetailView.as_view(),
        name="admin-proposal-detail",
    ),
    path(
        "api/v1/admin/proposals/<str:kind>/<int:proposal_id>/convert",
        AdminProposalConvertView.as_view(),
        name="admin-proposal-convert",
    ),

    # Catalogue management (admin/editor only)
    path("api/v1/admin/books/", AdminBookListView.as_view(), name="admin-books-list"),
    path("api/v1/admin/books/<int:book_id>", AdminBookDetailView.as_view(), name="admin-book-detail"),
    path(
        "api/v1/admin/books/<int:book_id>/contributors",
        AdminBookContributorsView.as_view(),
        name="admin-book-contributors",
    ),
    path(
        "api/v1/admin/books/<int:book_id>/chapters/",
        AdminBookChapterListView.as_view(),
        name="admin-book-chapters",
    ),
    path(
        "api/v1/admin/books/<int:book_id>/chapters/<int:chapter_id>",
        AdminBookChapterDetailView.as_view(),
        name="admin-book-chapter-detail",
    ),
    path(
        "api/v1/admin/books/<int:book_id>/guest-editors",
        AdminBookGuestEditorListView.as_view(),
        name="admin-book-guest-editors",
    ),
    path(
        "api/v1/admin/books/<int:book_id>/guest-editors/<int:guest_id>",
        AdminBookGuestEditorDetailView.as_view(),
        name="admin-book-guest-editor-detail",
    ),

    # Guest editor invitation flow (reading is public, responding is not)
    path("api/v1/guest-editor/<str:token>", GuestEditorInvitationView.as_view(), name="guest-editor-invite"),
    path("api/v1/guest-editor/<str:token>/respond", GuestEditorRespondView.as_view(), name="guest-editor-respond"),
    path("api/v1/my-volumes", MyVolumesView.as_view(), name="my-volumes"),

    path("api/v1/admin/book-series/", AdminBookSeriesListView.as_view(), name="admin-series-list"),
    path(
        "api/v1/admin/book-series/<int:series_id>",
        AdminBookSeriesDetailView.as_view(),
        name="admin-series-detail",
    ),
    path("api/v1/admin/downloads/", AdminDownloadListView.as_view(), name="admin-downloads-list"),
    path(
        "api/v1/admin/downloads/<int:asset_id>",
        AdminDownloadDetailView.as_view(),
        name="admin-download-detail",
    ),
]

