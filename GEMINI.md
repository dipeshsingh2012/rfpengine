# RFPEngine Agent Guidelines & MCP Tool Routing

## Autonomous SDLC & MCP Tool Routing
This repository integrates with the `rfpengine` Model Context Protocol (MCP) server. When interacting with the user in natural language, automatically invoke the appropriate MCP tool (`call_mcp_tool` with server `rfpengine`):

1. **User Stories & Feature Proposals -> `trigger_pm_initiative`**:
   - **Trigger**: When the user provides a user story (e.g. *"As a [role], I want to [feature] so that [benefit]"*), feature request, PRD requirement, or product concept.
   - **Action**: Call `trigger_pm_initiative` with:
     - `title`: Short descriptive title of the feature.
     - `prompt`: Full text of the user story and requirements.
     - `category`: Relevant product theme (e.g. `smart-ingestion`, `core`, `governance`, `security`, `ai-engine`).

2. **Feature Approvals -> `approve_and_start_development`**:
   - **Trigger**: When the user asks to approve, sign off on, or start development for an initiative (e.g. *"Approve initiative excel-sig-lite-parser"*).
   - **Action**: Call `approve_and_start_development` with `item_id` and optional `feedback`.

3. **Roadmap & Backlog Queries -> `manage_roadmap`**:
   - **Trigger**: When the user asks about the roadmap, backlog, KanBan status, or specific ticket details.
   - **Action**: Call `manage_roadmap` with `action: "list"` or `action: "get"` / `item_id`.

4. **Knowledge Base Searches -> `search_knowledge_base`**:
   - **Trigger**: When the user asks questions about RFPEngine compliance, security policies, SLAs, or capabilities.
   - **Action**: Call `search_knowledge_base` with `query` and `limit`.

5. **Diagnostics & Latency -> `get_cloud_diagnostics`**:
   - **Trigger**: When the user asks about database latency, system health, or service uptime.
   - **Action**: Call `get_cloud_diagnostics` with `service_name: "all"`.

