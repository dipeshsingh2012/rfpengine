# ADR 0021: Multi-Tenant B2B Authentication Architecture via Google Cloud Identity Platform and Dual-Track SSO

* **Status**: Accepted
* **Date**: 2026-09-01
* **Deciders**: Architecture & Security Team

## Context

**RFPEngine** serves two distinct user segments:
1. **Self-Serve Users, Evaluators & SMBs**: Need to test and experience the platform immediately without IT setup, corporate SSO configuration, or waiting for enterprise provisioning.
2. **Enterprise Fortune 500 Customers**: Require strict Single Sign-On (SSO) enforcement using corporate Identity Providers (**SAML 2.0, Okta, Microsoft Entra ID / Azure AD, PingFederate, Google Workspace**) with role mapping and domain whitelisting.

A single rigid authentication mechanism either creates excessive friction for product demos or fails enterprise security compliance.

## Decision

We adopt a **Dual-Track Multi-Tenant Authentication Architecture** powered by **Google Cloud Identity Platform (GCIP)**:

### 1. Dual-Track Authentication Flow
- **Track 1 (Frictionless Demo & SMBs)**:
  - **1-Click Google Sign-In (OAuth2 / OIDC)** and Passwordless Magic Links.
  - Automatically provisions an isolated sandbox tenant (`tenant-demo-<uuid>`) pre-populated with sample SOC-2 compliance whitepapers and dummy RFP questionnaires.
- **Track 2 (Enterprise SSO)**:
  - Enterprise SAML 2.0 / OIDC federation configured per tenant.
  - Domain auto-discovery: User enters `alice@acmecorp.com` $\rightarrow$ backend resolves `@acmecorp.com` to `tenant-acme` $\rightarrow$ redirects to Acme's Okta/Azure ID.

### 2. Backend Zero-Trust JWT Verification (FastAPI)
- `RFPEngine` backend authenticates requests by validating Google-issued JWT tokens against Google Public JWKS certificates (`https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`).
- Extracts cryptographically signed claims:
  - `firebase.tenant`: The tenant identifier.
  - `sub / uid`: The unique user ID.
  - `role`: Enterprise RBAC role (`viewer`, `editor`, `compliance_officer`, `admin`).
- Automatically binds `request.state.tenant_id` to all downstream database transactions, Elasticsearch queries, and Pinecone vector lookups.

### 3. Self-Service Tenant SSO Configuration
- Tenant administrators configure SAML/OIDC metadata directly through the RFPEngine Admin Portal (`/settings/sso`).
- Backend uses the GCIP Admin API (`firebase_admin.auth.tenant_mgt`) to provision and manage inbound identity providers dynamically without manual cloud console intervention.

## Consequences

### Positive
- **Instant Product Demos**: Anyone can evaluate RFPEngine in seconds with a personal or work Google account.
- **Enterprise-Grade Compliance**: Full support for enterprise SAML 2.0 and SCIM directory sync satisfying SOC-2 and ISO 27001 requirements.
- **Zero Credential Liability**: No passwords stored in RFPEngine databases; identity verification is completely delegated to Google and corporate IdPs.
- **Seamless Extension Integration**: Chrome Extension uses the same Google token to communicate with backend APIs.

### Negative / Trade-offs
- Requires maintaining Google Cloud Identity Platform tenant configurations in GCP.
- Local test suites require JWT signature mocking or mock test auth tokens.
