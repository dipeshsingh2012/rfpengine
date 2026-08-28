# Security, Compliance, and Architecture Whitepaper (SOC 2 Type II / ISO 27001)

This document provides detailed information on the security controls, data protection policies, and infrastructure governance implemented across our cloud platform.

## 1. Cloud Infrastructure and Hosting

All production infrastructure is hosted exclusively within Amazon Web Services (AWS) in the `us-east-1` (N. Virginia) and `us-west-2` (Oregon) regions. We utilize AWS Virtual Private Clouds (VPCs) with private subnets, strict security group rules, and zero direct public access to internal database or application nodes. Our infrastructure complies with SOC 2 Type II, ISO/IEC 27001:2022, and HIPAA Security Rule specifications.

## 2. Encryption and Cryptographic Controls

### 2.1 Encryption in Transit
All external and internal network communications are encrypted in transit using TLS 1.3 (with fallback to TLS 1.2 minimum). Weak ciphers (RC4, 3DES, CBC mode) and legacy protocols (SSLv3, TLS 1.0, TLS 1.1) are strictly disabled on all Application Load Balancers and Cloudflare edge proxies. HTTP Strict Transport Security (HSTS) is enforced with a `max-age` of 31536000 seconds and preloaded.

### 2.2 Encryption at Rest
All customer data at rest is encrypted using AES-256 via AWS Key Management Service (KMS) Customer Managed Keys (CMKs). This includes all PostgreSQL databases, Elasticsearch indices, S3 document storage buckets, and EBS volumes. Cryptographic keys are rotated automatically every 365 days.

## 3. Identity, Authentication, and Access Control

### 3.1 Single Sign-On (SSO) and Multi-Factor Authentication (MFA)
Enterprise customers can enforce SAML 2.0 and OpenID Connect (OIDC) Single Sign-On across identity providers including Okta, Microsoft Entra ID (Azure AD), Google Workspace, and PingFederate. All employee access to internal administration tools requires hardware-backed multi-factor authentication (FIDO2 / WebAuthn security keys).

### 3.2 Role-Based Access Control (RBAC) and Least Privilege
Access to production systems follows the principle of least privilege and Just-In-Time (JIT) elevation. Production access requires dual-approval, ephemeral credentials with a maximum 4-hour lifespan, and full session recording via Teleport.

## 4. Vulnerability Management and Security Testing

### 4.1 Automated Vulnerability Scanning
All container base images and application dependencies are scanned continuously in CI/CD using Trivy, Snyk, and GitHub Dependabot. Static Application Security Testing (SAST) and Dynamic Application Security Testing (DAST) are gating criteria for all production deployments.

### 4.2 Penetration Testing and Bug Bounty
Independent third-party penetration tests are conducted annually by CREST-accredited security firms. In addition, we operate a private bug bounty program on HackerOne with dedicated triage SLAs for critical and high-severity findings. Executive summaries of recent penetration tests are available under mutual NDA.

## 5. Incident Response and Threat Detection

Our 24/7 Security Operations Center (SOC) utilizes AWS GuardDuty, Datadog Cloud SIEM, and automated anomaly detection to monitor all audit logs and VPC flow records. Critical security incidents (P1) trigger automated paging with a guaranteed 15-minute response SLA. In the event of a confirmed security incident involving customer personal data, affected customers are notified in writing within 72 hours in compliance with GDPR Article 33.

