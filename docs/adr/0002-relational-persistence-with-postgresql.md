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

We define clear datastore responsibilities:
1. **PostgreSQL**: Manages canonical operational relational data:
   - **`response_workspaces` table**: Stores imported questionnaire metadata, tenant ID, source mode (URL, upload, extension), and source URL.
   - **`question_reviews` table**: Tracks each individual questionnaire question, suggested draft answer, final edited answer, review status (`Draft`, `SME review`, `Approved by SME`, `Legal review`, `Approved by Legal`, `Final approved`, `Rejected`, `Inserted`), assigned role, confidence score, and citations.
2. **Elasticsearch & Pinecone**: Manage knowledge base document chunks:
   - High-volume document chunks (300–500 tokens) are indexed directly into **Elasticsearch** (BM25 keyword search and full text storage) and **Pinecone** (1536-dimensional semantic vector search).
   - Search is performed across both engines and ranked with Reciprocal Rank Fusion (RRF).

## Consequences

### Positive
- **Lean Database Footprint**: PostgreSQL is not burdened with high-volume, ephemeral, or chunked document text.
- **Fast Dual-Retrieval**: Elasticsearch and Pinecone handle search and direct document hydration with zero extra relational round-trips.
- **Persistent Collaboration**: Multi-user questionnaire review workflows, status transitions, and role assignments retain full ACID integrity in PostgreSQL.

### Negative / Trade-offs
- Re-indexing entire knowledge bases requires re-uploading source files or exporting directly from Elasticsearch.

