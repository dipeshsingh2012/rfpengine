# ADR 0003: Human-in-the-Loop Governance, Multi-Role Approval, and Form Insertion Safety

* **Status**: Accepted
* **Date**: 2026-08-28
* **Deciders**: Engineering Team

## Context

Submitting responses to enterprise RFPs and vendor security questionnaires involves legally binding commitments, compliance disclosures, and pricing terms. 

Unchecked AI auto-submission poses significant risks:
- Risk of hallucinations or outdated company policy disclosures.
- Non-compliance with strict regulatory or legal standards.
- Inadvertent submission of unapproved concessions or technical SLAs.

## Decision

We establish strict **Human-in-the-Loop (HITL) Governance** rules across the application and browser extension:

1. **Zero Auto-Submission**:
   - The browser extension and workspace API will **never** automatically submit an external buyer questionnaire.
   - The final submission must always be performed manually by the designated seller submitter directly on the buyer's platform.
2. **Explicit Answer Approval**:
   - The extension UI disables field insertion until the user explicitly reviews the answer and clicks **Approve**.
   - Answers marked **Rejected** cannot be inserted into web form fields.
3. **Multi-Role Review Workflow**:
   - The platform models distinct review lifecycle stages:
     $$\text{Draft} \longrightarrow \text{SME Review} \longrightarrow \text{Approved by SME} \longrightarrow \text{Final Approval} \longrightarrow \text{Inserted}$$
   - Questions can be designated to specific SME domains (e.g., Security SME, Legal Reviewer, Product Manager, Final Approver).
   - Only answers that reach `Approved by SME` or `Final approved` are eligible for one-click form handoff.

## Consequences

### Positive
- Eliminates the risk of catastrophic automated form submission of incorrect data.
- Complies with enterprise risk and governance standards.
- Provides an audit trail for who reviewed and approved each question response.

### Negative / Trade-offs
- Requires explicit user interaction (click-to-approve) for each questionnaire response.

