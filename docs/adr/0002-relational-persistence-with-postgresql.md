# ADR 0002: Relational Persistence with PostgreSQL for Canonical Records and Review Tracking

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

Previously, RFPEngine relied exclusively on search indexes for knowledge records and browser `localStorage` for questionnaire response drafts.

This presented several architectural limitations:
1. **Lack of a single canonical source of truth**: Search indexes (Elasticsearch/Pinecone) are optimized for indexing and retrieval, not for ACID transactions, referential integrity, relational modeling, or audit history.
2. **Review state synchronization**: Workspaces and questionnaire answers need persistent multi-user review tracking (e.g., assigning questions to Security, Legal, or Product SMEs, and logging approval states).
3. **Multi-device / multi-user access**: Drafts stored only in browser local storage cannot be shared between different team members (e.g., Proposal Manager to SME Reviewer).

## Decision

We introduce **PostgreSQL** as the canonical relational datastore for all application data:
1. **`kb_entries` table**: Stores canonical approved question-and-answer pairs, tenant IDs, categories, metadata, and timestamps.
2. **`response_workspaces` table**: Stores imported questionnaire metadata, tenant ID, source mode (URL, upload, extension), and source URL.
3. **`question_reviews` table**: Tracks each individual questionnaire question, suggested draft answer, final edited answer, review status (`Draft`, `SME review`, `Approved by SME`, `Legal review`, `Approved by Legal`, `Final approved`, `Rejected`, `Inserted`), assigned role, confidence score, and citations.
4. **Data Sync Flow**:
   - Write operations (Create/Update/Delete KB entries) write to PostgreSQL first.
   - Upon successful database commit, the document is indexed into Elasticsearch and vector upserted into Pinecone.

## Consequences

### Positive
- **ACID Guarantees & Integrity**: Knowledge records, tenant partitions, and review records have foreign key constraints and transactional consistency.
- **Persistent Collaboration**: Reviewers and approvers can view, edit, and approve questionnaires across different sessions and devices.
- **Search Re-indexing**: Search indexes in Elasticsearch and Pinecone can be regenerated or re-embedded at any time directly from canonical PostgreSQL records.

### Negative / Trade-offs
- Additional infrastructure component (PostgreSQL) required in deployment.
- Requires database connection pooling and migration management (via async SQLAlchemy & asyncpg).

