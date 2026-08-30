# ADR 0012: In-App Product Discovery and RICE Prioritization Roadmap Hub

## Status
Accepted

## Context
Enterprise procurement and RFP automation platforms must continuously balance competing requirements across multiple user personas:
1. **Proposal Drafters & Bid Managers** seeking automated ingestion, drafting speed, and 1-click form insertion.
2. **Security & Technical SMEs** demanding granular policy verification, encryption bounds, and SOC 2 alignment.
3. **Legal & Compliance Counsel** requiring strict liability checks, hallucination guards, and contract boundary enforcement.
4. **Sales & RevOps Leadership** seeking deal velocity, win/loss analytics, and continuous knowledge base synchronization.

Communicating strategic vision, customer problem statements, and data-driven prioritization to enterprise stakeholders, design partner customers, and recruiting teams requires transparent, interactive product management artifacts directly integrated into the software.

## Decision
We decided to build an interactive, in-app **Product Strategy & Discovery Hub (`/roadmap`)** directly inside the RFPEngine client architecture.

The hub implements:
1. **Multi-Stage Kanban Lifecycle**:
   - `In Discovery`: Problem validation, customer interviews, and pain point exploration.
   - `In Spec & Design`: PRD authoring, UX wireframing, and technical architecture specs.
   - `In Development`: Active sprint execution and backend/frontend engineering.
   - `Beta & Testing`: Customer pilots and SME design partner validation.
   - `Shipped & Live`: Production capabilities active on Google Cloud Run and Chrome Web Store.
2. **RICE Prioritization Scoring Matrix**:
   - Mathematical formula: `(Reach × Impact × Confidence) ÷ Effort = RICE Score`.
   - Sortable data table demonstrating transparent ROI ranking.
3. **Strategic Portfolio Themes**:
   - Tracking progress across 5 strategic pillars (*Core AI & Retrieval*, *Enterprise Governance*, *Smart Ingestion*, *Ecosystem Integrations*, *Collaboration & Workflow*).
4. **Slide-Over Mini-PRD Specifications**:
   - Deep-dive product requirement documents featuring:
     - The *"Why"* & Customer Problem Statement
     - Target User Persona & Agile User Story (`As a... I want... So that...`)
     - Measurable KPIs & Success Metrics
     - Gherkin-formatted Acceptance Criteria (`Given... When... Then...`)
     - Technical Architecture & Infrastructure Notes
5. **Tactile Drag-and-Drop Lifecycle Transitions**:
   - Native HTML5 drag-and-drop interaction allowing product managers and contributors to transition initiatives across the 5 lifecycle columns (`In Discovery` -> `In Spec & Design` -> `In Development` -> `Beta & Testing` -> `Shipped & Live`).
   - Dynamic lifecycle governance: updates status, triggers toast confirmations, and persists state in `localStorage`.
6. **Community Upvoting & Discovery Feedback Loop**:
   - Interactive upvoting with local storage persistence and a modal for capturing stakeholder feature requests.

## Consequences

### Positive
- **Tactile Product Management UX**: Enables fluid re-prioritization and stage progression directly on the board without leaving the workspace.
- **Demonstrates Product Management & Discovery Rigor**: Clearly showcases the strategic rationale, target personas, and quantitative prioritization driving technical decisions.
- **Enhanced Stakeholder Transparency**: Gives enterprise customers and design partners a live window into upcoming capabilities and release timelines.
- **Continuous Feedback Ingestion**: Provides a native mechanism to capture, validate, and upvote new feature ideas directly within the product.

### Negative
- **Maintenance Overhead**: Requires keeping roadmap items, RICE scores, and stage transitions synchronized as features move from development to production.

