# Architecture Diagrams — Vision7 SDD

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vite + React)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Homepage  │  │ Category │  │ PostPage │  │ Admin Dashboard│  │
│  │  Index    │  │  Pages   │  │          │  │  + Automation  │  │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│        │             │             │                 │           │
│  ┌─────┴─────────────┴─────────────┴─────────────────┴───────┐  │
│  │                    Hooks Layer                              │  │
│  │  usePosts | useCategories | useAnalytics | useSiteSettings │  │
│  └─────────────────────┬──────────────────────────────────────┘  │
│                        │                                         │
│  ┌─────────────────────┴──────────────────────────────────────┐  │
│  │              TanStack Query (Cache + State)                │  │
│  └─────────────────────┬──────────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    SUPABASE PLATFORM                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   Auth    │  │ PostgREST│  │ Storage  │  │   Edge Fns   │   │
│  │  (OTP)   │  │   (API)  │  │ (Media)  │  │  (planned)   │   │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│        │             │             │                │           │
│  ┌─────┴─────────────┴─────────────┴────────────────┴───────┐  │
│  │                PostgreSQL Database                        │  │
│  │  ┌─────────┐ ┌──────┐ ┌─────────┐ ┌───────────────────┐ │  │
│  │  │  posts  │ │roles │ │analytics│ │  RLS + has_role()  │ │  │
│  │  │categories│ │audit │ │settings │ │                   │ │  │
│  │  └─────────┘ └──────┘ └─────────┘ └───────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                 │
│  │   n8n    │  │  RSS     │  │   AI (LLM)   │                 │
│  │ Workflows│  │  Feeds   │  │  Curation     │                │
│  └──────────┘  └──────────┘  └──────────────┘                 │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow: Post Lifecycle

```
RSS Feed ──→ n8n Workflow ──→ AI Curation ──→ Post Draft (Supabase)
                                                    │
Admin Editor ──→ TipTap ──→ PostForm ──→ Supabase INSERT
                                              │
                                              ▼
                              TanStack Query Invalidation
                                              │
                                              ▼
                              Public Page ──→ DOMPurify ──→ DOM
```

## Auth Flow: OTP Login

```
Admin Email Input
       │
       ▼
requestAdminCode(email)
       │
       ▼
Supabase signInWithOtp (shouldCreateUser: false)
       │
       ▼
Email Delivered (6-digit code)
       │
       ▼
verifyAdminCode(email, token)
       │
       ▼
JWT Session Created
       │
       ▼
AuthContext Updates → useAdminAccess() → Route Protection
```

## Module Dependency Graph

```
                    ┌─────────────────────┐
                    │  Supabase & Database │  Layer 0
                    └──────────┬──────────┘
                     ┌─────────┴─────────┐
                     ▼                   ▼
          ┌──────────────────┐  ┌─────────────────┐
          │ Auth & Segurança │  │ Tags & Taxonomia │  Layer 1
          └────────┬─────────┘  └────────┬────────┘
                   │    ┌────────────────┘
                   ▼    ▼
          ┌──────────────────┐  ┌───────────┐
          │ News Aggregator  │  │ Analytics │       Layer 2
          └────────┬─────────┘  └───────────┘
                   │
          ┌────────┴──────────────┐
          ▼                       ▼
    ┌───────────┐  ┌──────────────────┐
    │    CMS    │  │  Automação n8n   │             Layer 3
    └───────────┘  └──────────────────┘
          │
          ▼
    ┌────────────────┐
    │  Frontend & UI │                              Layer 4
    └────────────────┘
          │
    ┌─────┴─────────────┐
    ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ CI/CD DevOps │  │ Agents & Skills  │              Layer 5
└──────────────┘  └──────────────────┘
```
