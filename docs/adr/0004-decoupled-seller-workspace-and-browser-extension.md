# ADR 0004: Decoupled Seller Workspace and Manifest V3 Browser Extension Architecture

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

Sellers encounter RFPs in various formats and platforms:
1. **Third-party online portals**: Vendor portals, procurement software (e.g., Coupa, Ariba, Loopio, RFP360), and web forms where direct API access is not available to the seller.
2. **Offline documents and spreadsheets**: RFPs distributed as CSV, JSON, HTML, or spreadsheet files.
3. **Internal collaboration**: Multi-stakeholder review by Proposal Managers, Security Engineers, and Legal Counsel.

Building separate bespoke integrations for every procurement portal is infeasible due to vendor walled gardens and lack of standardized APIs.

## Decision

We decouple the system into two complementary client experiences that share the same backend search and persistence services:

1. **React Web Workspace (`frontend/`)**:
   - Handles questionnaire ingestion from URLs and uploaded files (HTML, JSON, CSV).
   - Provides full-screen collaborative review, question assignment, confidence inspection, and manual answer editing.
   - Saves workspace state to PostgreSQL for team collaboration.
2. **Manifest V3 Browser Extension (`extension/`)**:
   - Operates directly inside any buyer web page or third-party portal via a side-panel interface.
   - [content.js](file:///home/dipes/projects/RFQEngine/extension/content.js): Scans DOM form elements (`textarea`, `input`, `contenteditable`) and maps questions from labels, ARIA attributes, nearby headings, and placeholders.
   - [sidepanel.js](file:///home/dipes/projects/RFQEngine/extension/sidepanel.js): Queries `POST /api/v1/search` for each detected question, displays citations, requires seller approval, and dispatches DOM fill events directly into the form fields.
   - Features visual field highlighting on insertion.

## Consequences

### Positive
- Universal compatibility with virtually any web-based RFP questionnaire without custom vendor integrations.
- Clear separation of concerns between deep collaborative editing (Workspace) and rapid in-situ form filling (Extension).
- Shared backend API guarantees consistent retrieval, confidence scoring, and citation grounding across both clients.

### Negative / Trade-offs
- The browser extension depends on client-side DOM heuristics to detect question-field pairings, which may require ongoing refinement for complex custom web widgets.

