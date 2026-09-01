# RFPEngine Agent Guidelines & aroadmap.dev MCP Tool Routing

## Autonomous SDLC & MCP Architecture
This repository integrates with the `aroadmap` Model Context Protocol (MCP) server (`https://aroadmap.dev/api/mcp` / `rfpengine.aroadmap.dev`).
When interacting with the user in natural language, automatically invoke the appropriate MCP tool (`call_mcp_tool` with server `rfpengine` or `aroadmap`):

### 1. Pillar 1: Initiative & Opportunity Creation -> `create_initiative`
- **Trigger**: When the user provides a user story (e.g. *"As a [role], I want to [feature] so that [benefit]"*), PRD requirement, customer feedback, or feature request.
- **Action**: Call `create_initiative` with:
  - `title`: Clear descriptive title.
  - `summary`: 1-2 sentence executive summary.
  - `theme`: Relevant theme (e.g. `Smart Ingestion`, `Core AI & Retrieval`, `Enterprise Governance`, `Security`).
  - `priority`: `P0 - Critical` | `P1 - High` | `P2 - Medium` | `P3 - Low`.
  - `target_persona`: Primary user role.
  - `user_story`: Agile user story text.
  - `acceptance_criteria`: Array of testable Gherkin strings (`Given ... When ... Then ...`).
  - `technical_architecture`: Architecture notes and library selections.
  - `rice`: `{ reach: number, impact: number, confidence: number, effort: number }`.

### 2. Pillar 2: Status Transitions & Backlog Updates
- **Stage Transitions -> `transition_initiative_stage`**:
  - **Trigger**: When moving an initiative across the SDLC state machine (`discovery` -> `spec` -> `approved` -> `development` -> `shipped`).
  - **Action**: Call `transition_initiative_stage` with `item_id`, `stage`, and optional `feedback`.
- **Field Updates -> `update_initiative`**:
  - **Trigger**: When updating any field (RICE scores, technical specs, Gherkin criteria, priority, quarter).
  - **Action**: Call `update_initiative` with `item_id` and `updates` object.
- **Query & Inspect Backlog -> `list_initiatives` / `get_initiative`**:
  - **Trigger**: When the user asks about the backlog, living PRD details, or filtered KanBan status.
  - **Action**: Call `list_initiatives` with `stage`, `theme`, `search` or `get_initiative` with `item_id`.
- **Deletion -> `delete_initiative`**:
  - **Trigger**: When explicitly asked to remove a card from the backlog.
  - **Action**: Call `delete_initiative` with `item_id`.

### 3. Pillar 3: Release Notes & Public Changelog
- **Generate Release Notes -> `generate_release_notes`**:
  - **Trigger**: When preparing a release summary or drafting changelogs for a version or milestone.
  - **Action**: Call `generate_release_notes` with `version`, `quarter`, or `item_ids`.
- **Publish Release -> `publish_release`**:
  - **Trigger**: When a feature PR is merged into `main` and should be stamped as shipped.
  - **Action**: Call `publish_release` with `version`, `item_ids`, `pr_url`.

### 4. Diagnostics & Latency -> `get_cloud_diagnostics`
- **Trigger**: When the user asks about database latency, system health, or service uptime.
- **Action**: Call `get_cloud_diagnostics` with `service_name: "all"`.
