# BreakThrough Journal Management System

## Technical Documentation

**Version:** 1.0.0  
**Last Updated:** March 29, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Reference](#api-reference)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Paper Workflow](#paper-workflow)
7. [Authentication](#authentication)
8. [Deployment](#deployment)

---

## System Overview

BreakThrough is a comprehensive academic journal management system that facilitates the entire scholarly publishing workflow from paper submission to publication. The system supports multiple journals, peer review processes, DOI registration, and role-based access control.

### Key Features

- **Multi-Journal Support**: Manage multiple academic journals from a single platform
- **Peer Review Management**: Complete reviewer invitation, assignment, and review tracking
- **Role-Based Access Control**: Author, Reviewer, Editor, and Admin roles with granular permissions
- **DOI Integration**: Automatic DOI registration via Crossref
- **Email Notifications**: Automated correspondence tracking and email templates
- **Analytics Dashboard**: Comprehensive statistics for administrators and editors
- **NLP-Powered Features**: Journal recommendations and reviewer matching

### Technology Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Django 4.2 + Django REST Framework |
| **Frontend** | React 18 + Vite |
| **Database** | MySQL 8.0 |
| **Authentication** | JWT (PyJWT) |
| **API Documentation** | OpenAPI 3.0 |
| **Deployment** | cPanel / Passenger WSGI |

---

## Architecture

### System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Frontend (React + Vite)"]
        UI[User Interface]
        API_Service[API Service Layer]
        Auth_Context[Auth Context]
    end
    
    subgraph Backend["Django REST Framework Backend"]
        subgraph Auth["Authentication"]
            JWT[JWT Auth Utils]
            Login[Login/Signup]
            Refresh[Token Refresh]
        end
        
        subgraph Views["API Views"]
            AuthV[Auth Views]
            JournalV[Journal Views]
            ArticleV[Article Views]
            AuthorV[Author Views]
            EditorV[Editor Views]
            ReviewerV[Reviewer Views]
            AdminV[Admin Views]
            RolesV[Roles Views]
            CopyrightV[Copyright Views]
            WebhookV[Webhook Views]
        end
        
        subgraph Services["Business Logic"]
            NLP[NLP Service]
            Email[Email Service]
            DOI[DOI Service]
        end
    end
    
    subgraph Database["MySQL Database"]
        Users[(Users)]
        Journals[(Journals)]
        Papers[(Papers)]
        Reviews[(Reviews)]
    end
    
    subgraph External["External Services"]
        Crossref[Crossref DOI]
        SMTP[SMTP Server]
    end
    
    UI --> API_Service
    API_Service --> Auth_Context
    API_Service -->|HTTP/REST| Views
    Auth_Context -->|JWT Token| JWT
    
    Views --> Services
    Views --> Database
    
    Services --> External
```

### Backend Structure

```
backend/
├── api/                      # Main API application
│   ├── views_auth.py         # Authentication endpoints
│   ├── views_admin.py        # Admin dashboard & management
│   ├── views_articles.py     # Public article access
│   ├── views_author.py       # Author submission management
│   ├── views_editor.py       # Editorial workflow
│   ├── views_journals.py     # Journal CRUD operations
│   ├── views_reviewer.py     # Reviewer assignment & review
│   ├── views_roles.py        # Role management
│   ├── views_webhooks.py     # Email delivery webhooks
│   ├── models.py             # Database models
│   ├── serializers.py        # DRF serializers
│   ├── urls.py               # URL routing
│   ├── auth_utils.py         # Authentication utilities
│   └── jwt_utils.py          # JWT token handling
├── bp_backend/               # Django project settings
│   ├── settings.py           # Configuration
│   ├── urls.py               # Root URL config
│   └── wsgi.py               # WSGI application
├── media/                    # Uploaded files storage
├── docs/                     # Documentation
└── manage.py                 # Django management script
```

### Frontend Structure

```
frontend/
├── src/
│   ├── api/                  # API service layer
│   │   ├── apiService.js     # Main API client
│   │   └── axios.js          # Axios configuration
│   ├── components/           # Reusable UI components
│   │   ├── auth/             # Authentication forms
│   │   ├── header/           # Navigation header
│   │   ├── sidebar/          # Navigation sidebar
│   │   └── ...               # Other components
│   ├── pages/                # Page components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   └── utils/                # Utility functions
├── public/                   # Static assets
└── package.json              # Dependencies
```

---

## Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        int id PK
        string email UK
        string password
        string role
        string fname
        string lname
        string affiliation
        string specialization
        datetime added_on
    }
    
    JOURNAL {
        int fld_id PK
        string fld_journal_name
        string short_form
        string issn_ol
        string issn_prt
        string cheif_editor
        text guidelines
        date added_on
    }
    
    PAPER {
        int id PK
        string paper_code
        int journal FK
        string title
        text abstract
        string keyword
        string file
        string status
        int added_by FK
        int version_number
        datetime added_on
    }
    
    PAPER_PUBLISHED {
        int id PK
        string title
        text abstract
        int journal_id FK
        string volume
        string issue
        string doi
        string access_type
        int paper_submission_id FK
    }
    
    ONLINE_REVIEW {
        int id PK
        int paper_id FK
        int reviewer_id FK
        date assigned_on
        datetime submitted_on
        string review_status
    }
    
    REVIEW_SUBMISSION {
        int id PK
        int paper_id FK
        int reviewer_id FK
        int overall_rating
        text author_comments
        string recommendation
        string status
    }
    
    REVIEWER_INVITATION {
        int id PK
        int paper_id FK
        int reviewer_id FK
        string reviewer_email
        string invitation_token
        string status
    }
    
    USER_ROLE {
        int id PK
        int user_id FK
        string role
        string status
        int journal_id FK
    }
    
    COPYRIGHT_FORM {
        int id PK
        int paper_id FK
        int author_id FK
        string status
        datetime deadline
        boolean copyright_agreed
    }
    
    PAPER_CORRESPONDENCE {
        int id PK
        int paper_id FK
        int sender_id FK
        string subject
        text body
        string delivery_status
    }
    
    USER ||--o{ PAPER : submits
    USER ||--o{ USER_ROLE : has
    USER ||--o{ ONLINE_REVIEW : reviews
    JOURNAL ||--o{ PAPER : contains
    PAPER ||--o{ ONLINE_REVIEW : has
    PAPER ||--o{ REVIEW_SUBMISSION : receives
    PAPER ||--o{ REVIEWER_INVITATION : has
    PAPER ||--o| PAPER_PUBLISHED : becomes
    PAPER ||--o| COPYRIGHT_FORM : requires
    PAPER ||--o{ PAPER_CORRESPONDENCE : has
    USER_ROLE }o--|| JOURNAL : assigned_to
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `user` | User accounts and profiles |
| `journal` | Journal metadata and settings |
| `paper` | Submitted manuscripts |
| `paper_published` | Published articles with DOI |
| `online_review` | Review assignments |
| `review_submission` | Completed reviews |
| `reviewer_invitation` | External reviewer invitations |
| `user_role` | Role assignments per user |
| `role_request` | Pending role requests |
| `paper_correspondence` | Email communication tracking |
| `email_template` | Configurable email templates |
| `copyright_form` | Copyright transfer agreements |

---

## API Reference

### Endpoint Summary

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Authentication** | 5 | Login, signup, token refresh, profile |
| **Journals** | 12 | CRUD, volumes, issues, recommendations |
| **Articles** | 8 | Public article access, search, news |
| **Author** | 22 | Submissions, reviews, revisions |
| **Editor** | 24 | Paper queue, decisions, publishing |
| **Reviewer** | 20 | Invitations, assignments, reviews |
| **Roles** | 8 | Role management, requests |
| **Copyright** | 3 | Copyright form workflow |
| **Webhooks** | 2 | Email delivery tracking |
| **Admin** | 41 | Full system administration |

**Total: 130 endpoints**

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/signup` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh JWT token |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/change-password` | Change password |

### Author Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/author/dashboard/stats` | Dashboard statistics |
| POST | `/api/v1/author/submit-paper` | Submit new paper |
| GET | `/api/v1/author/submissions` | List submissions |
| GET | `/api/v1/author/submissions/{id}` | Submission details |
| POST | `/api/v1/author/submissions/{id}/resubmit` | Submit revision |
| GET | `/api/v1/author/submissions/{id}/reviews` | View reviews |
| GET | `/api/v1/author/submissions/{id}/decision` | View decision |

### Editor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/editor/paper-queue` | Papers awaiting action |
| POST | `/api/v1/editor/papers/{id}/assign-reviewer` | Assign reviewer |
| POST | `/api/v1/editor/papers/{id}/invite-reviewer` | Invite external |
| POST | `/api/v1/editor/papers/{id}/decision` | Make decision |
| POST | `/api/v1/editor/papers/{id}/publish` | Publish paper |
| GET | `/api/v1/editor/reviewers` | Available reviewers |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/dashboard/stats` | System statistics |
| GET | `/api/v1/admin/users` | List all users |
| POST | `/api/v1/admin/users/create` | Create user |
| GET | `/api/v1/admin/papers` | List all papers |
| GET | `/api/v1/admin/editors` | Manage editors |
| GET | `/api/v1/admin/analytics/*` | Analytics endpoints |

---

## User Roles & Permissions

### Role Hierarchy

```mermaid
flowchart TB
    subgraph Roles["User Roles & Permissions"]
        direction TB
        
        subgraph Admin["Admin"]
            A1[Manage Users]
            A2[Manage Journals]
            A3[Manage Editors]
            A4[View Analytics]
            A5[Manage News/Templates]
            A6[Process Role Requests]
        end
        
        subgraph Editor["Editor"]
            E1[Manage Paper Queue]
            E2[Assign Reviewers]
            E3[Make Decisions]
            E4[Publish Papers]
            E5[View Journal Stats]
            E6[Invite External Reviewers]
        end
        
        subgraph Reviewer["Reviewer"]
            R1[View Invitations]
            R2[Accept/Decline]
            R3[Review Papers]
            R4[Submit Reports]
            R5[View History]
        end
        
        subgraph Author["Author"]
            AU1[Submit Papers]
            AU2[Track Submissions]
            AU3[View Reviews]
            AU4[Submit Revisions]
            AU5[Sign Copyright]
            AU6[Contact Editor]
        end
        
        subgraph User["Basic User"]
            U1[Browse Journals]
            U2[Read Articles]
            U3[Search Papers]
            U4[Request Roles]
        end
    end
    
    User --> Author
    User --> Reviewer
    Author --> Editor
    Editor --> Admin
```

### Permission Matrix

| Feature | User | Author | Reviewer | Editor | Admin |
|---------|------|--------|----------|--------|-------|
| View public articles | ✓ | ✓ | ✓ | ✓ | ✓ |
| Submit papers | - | ✓ | ✓ | ✓ | ✓ |
| View own submissions | - | ✓ | - | - | ✓ |
| Review assigned papers | - | - | ✓ | - | - |
| Assign reviewers | - | - | - | ✓ | ✓ |
| Make editorial decisions | - | - | - | ✓ | ✓ |
| Publish papers | - | - | - | ✓ | ✓ |
| Manage users | - | - | - | - | ✓ |
| System configuration | - | - | - | - | ✓ |

---

## Paper Workflow

### Submission & Review Process

```mermaid
sequenceDiagram
    autonumber
    participant A as Author
    participant API as Django API
    participant DB as Database
    participant E as Editor
    participant R as Reviewer
    participant DOI as Crossref DOI
    
    Note over A,DOI: Paper Submission Workflow
    
    A->>API: POST /author/submit-paper
    API->>DB: Create Paper (status: submitted)
    API-->>A: Paper ID & Confirmation
    
    Note over E: Editor Assignment
    E->>API: GET /editor/paper-queue
    API->>DB: Fetch papers
    API-->>E: Papers list
    
    E->>API: POST /editor/papers/{id}/assign-reviewer
    API->>DB: Create ReviewerInvitation
    API->>R: Send invitation email
    
    Note over R: Reviewer Response
    R->>API: POST /invitations/{token}/accept
    API->>DB: Update invitation status
    API->>DB: Create OnlineReview
    
    R->>API: POST /reviewer/assignments/{id}/submit
    API->>DB: Create ReviewSubmission
    API-->>E: Notify review complete
    
    Note over E: Editorial Decision
    E->>API: POST /editor/papers/{id}/decision
    API->>DB: Update paper status
    API-->>A: Decision notification
    
    alt Accepted
        A->>API: POST /copyright/{paper_id}/submit
        API->>DB: Complete CopyrightForm
        E->>API: POST /editor/papers/{id}/publish
        API->>DOI: Register DOI
        DOI-->>API: DOI confirmation
        API->>DB: Create PaperPublished
    else Revision Required
        A->>API: POST /author/submissions/{id}/resubmit
        API->>DB: Create PaperVersion
        Note over E,R: Re-review process
    else Rejected
        API-->>A: Rejection notification
    end
```

### Paper Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Submitted: Author submits paper
    
    Submitted --> UnderReview: Editor assigns reviewers
    Submitted --> Rejected: Editor desk rejection
    
    UnderReview --> ReviewComplete: Reviewers submit reviews
    ReviewComplete --> RevisionRequired: Major/Minor revision
    ReviewComplete --> Accepted: Accept decision
    ReviewComplete --> Rejected: Reject decision
    
    RevisionRequired --> Resubmitted: Author uploads revision
    Resubmitted --> UnderReview: Editor re-assigns reviewers
    
    Accepted --> CopyrightPending: Trigger copyright form
    CopyrightPending --> CopyrightComplete: Author signs form
    CopyrightComplete --> ReadyToPublish: Copyright verified
    
    ReadyToPublish --> Published: Editor publishes
    Published --> [*]
    
    Rejected --> [*]
```

### Status Definitions

| Status | Description |
|--------|-------------|
| `submitted` | Initial submission received |
| `under_review` | Assigned to reviewer(s) |
| `revision_required` | Author must revise |
| `resubmitted` | Revised version submitted |
| `accepted` | Accepted for publication |
| `copyright_pending` | Awaiting copyright form |
| `ready_to_publish` | Copyright complete |
| `published` | Live on platform |
| `rejected` | Not accepted |

---

## Authentication

### JWT Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant API as Django API
    participant JWT as JWT Utils
    participant DB as Database
    
    Note over C,DB: User Authentication Flow
    
    rect rgb(200, 230, 200)
        Note over C,DB: Registration
        C->>API: POST /auth/signup
        API->>DB: Check email exists
        alt Email exists
            API-->>C: 400 Email already registered
        else New user
            API->>DB: Create User
            API->>JWT: Generate tokens
            JWT-->>API: access_token, refresh_token
            API-->>C: 201 User created + tokens
        end
    end
    
    rect rgb(200, 200, 230)
        Note over C,DB: Login
        C->>API: POST /auth/login
        API->>DB: Verify credentials
        alt Invalid credentials
            API-->>C: 401 Unauthorized
        else Valid credentials
            API->>JWT: Generate tokens
            JWT-->>API: access_token, refresh_token
            API-->>C: 200 OK + tokens + user data
        end
    end
    
    rect rgb(230, 230, 200)
        Note over C,DB: Token Refresh
        C->>API: POST /auth/refresh
        API->>JWT: Validate refresh_token
        alt Invalid/Expired token
            API-->>C: 401 Invalid token
        else Valid token
            JWT->>JWT: Generate new access_token
            JWT-->>API: new access_token
            API-->>C: 200 OK + new tokens
        end
    end
    
    rect rgb(230, 200, 200)
        Note over C,DB: Protected Endpoint Access
        C->>API: GET /author/dashboard (+ Bearer token)
        API->>JWT: Validate access_token
        alt Invalid/Expired
            API-->>C: 401 Unauthorized
        else Valid
            API->>DB: Fetch user data
            API-->>C: 200 OK + data
        end
    end
```

### Token Configuration

| Setting | Value |
|---------|-------|
| Access Token Expiry | 15 minutes |
| Refresh Token Expiry | 7 days |
| Algorithm | HS256 |
| Token Type | Bearer |

### Request Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Deployment

### Requirements

```txt
Django>=4.2
djangorestframework>=3.14
PyJWT>=2.8
mysqlclient>=2.2
python-dotenv>=1.0
scikit-learn>=1.3
numpy>=1.24
```

### Environment Variables

```bash
# Database
DB_NAME=breakthroughdb
DB_USER=your_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306

# JWT
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASSWORD=your-email-password

# Crossref DOI
CROSSREF_USERNAME=your_username
CROSSREF_PASSWORD=your_password
CROSSREF_DOI_PREFIX=10.xxxxx
```

### Running Locally

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

### Production Deployment (cPanel)

1. Upload files to `public_html/backend`
2. Configure `passenger_wsgi.py`
3. Set up Python application in cPanel
4. Configure environment variables
5. Run migrations via SSH

---

## API Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

### Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

---

## Support & Maintenance

### Logs

- Application logs: `backend/logs/`
- Django logs: `manage.py runserver` output
- Error tracking: Custom exception handler

### Health Check

```bash
GET /api/v1/health
```

### Database Backup

```bash
mysqldump -u user -p breakthroughdb > backup.sql
```

---

*Documentation generated for BreakThrough Journal Management System v1.0.0*
