# ADR 0022: Model Context Protocol (MCP) Integration for IDEs, Chat Assistants, and Autonomous Fleet Swarms

* **Status**: Accepted
* **Date**: 2026-09-01
* **Deciders**: Architecture, Security & Developer Experience Team

## Context

As **RFPEngine** and the **Central Agentic Fleet** matured, developers and autonomous AI agents required rich, real-time context exchange across multiple environments:
1. **Developer Workstations & IDEs**: Developers coding in VS Code, Cursor, Antigravity IDE, or chatting with Gemini / Claude need direct, interactive access to the RFPEngine knowledge base, active discovery roadmap, and system diagnostics without leaving their editor.
2. **Autonomous Multi-Agent Fleet (`agentic-fleet`)**: Autonomous agents (`pm-agent`, `dev-agent`, `qa-agent`, `reviewer-agent`) running in CI/CD and cloud runners need a standardized tool-calling interface to query backlog tickets, submit pull requests, and inspect live PostgreSQL state.
3. **Product & Discovery UI**: The KanBan roadmap board (`rfpengine.net/roadmap`) serves as the central control plane where drag-and-drop state transitions trigger automated development cycles.

Earlier integrations relied on custom, ad-hoc REST endpoints and bespoke prompt schemas, creating high coupling, prompt bloating, and transport fragmentation.

## Decision

We adopt the open **Model Context Protocol (MCP)** standard (JSON-RPC 2.0) across RFPEngine and the Central Fleet, providing a decoupled, vendor-agnostic tool execution plane over dual transports (**`stdio`** and **`SSE`**).

```
                               ┌────────────────────────────────────────────────┐
                               │             AI Clients & Developers            │
                               │  (Gemini Chat, Antigravity IDE, Cursor, Claude)│
                               └───────────────────────┬────────────────────────┘
                                                       │
                           ┌───────────────────────────┴───────────────────────────┐
                           │ (1) stdio (Local IDE)        (2) SSE (Remote Cloud Run)│
                           ▼                                                       ▼
  ┌─────────────────────────────────────────────────┐   ┌─────────────────────────────────────────────────┐
  │         1. RFPEngine MCP Server                 │   │         2. Agentic-Fleet MCP Server             │
  │        (Domain & Roadmap Capabilities)          │   │          (Autonomous SDLC Engine)               │
  ├─────────────────────────────────────────────────┤   ├─────────────────────────────────────────────────┤
  │ 🔍 search_knowledge_base (Hybrid Vector Search) │   │ 🛸 fleet_run_pipeline (Full 5-Agent SDLC)       │
  │ 📋 manage_roadmap (Backlog & KanBan Sync)       │   │ 🎯 fleet_invoke_pm_agent                        │
  │ 🩺 get_cloud_diagnostics (Health & Latencies)   │   │ 🧑‍💻 fleet_invoke_dev_agent                     │
  └────────────────────────┬────────────────────────┘   └────────────────────────┬────────────────────────┘
                           │                                                       │
                           ▼                                                       ▼
               ┌───────────────────────┐                               ┌───────────────────────┐
               │ PostgreSQL / FastAPIs │                               │ GitHub API & Actions  │
               └───────────────────────┘                               └───────────────────────┘
```

### 1. Dual Transport Architecture
- **Local `stdio` Transport**:
  - Developers connect their local IDE (Antigravity / Cursor / Claude Code) directly to `backend/app/mcp/server.py` via `mcp_config.json`.
  - Executes locally with sub-millisecond overhead and zero exposed network ports.
- **Remote `SSE` (Server-Sent Events) Transport**:
  - Mounted directly on Cloud Run under `/api/v1/mcp/sse` and `/api/v1/mcp/messages`.
  - Enables web clients, GitHub Actions runners, and remote LLM orchestrators to maintain persistent, bidirectional JSON-RPC tool-calling channels.

### 2. Standardized Tool Suite (`backend/app/mcp/tools.py`)
The RFPEngine MCP Server implements core capabilities:
1. `search_knowledge_base(query: str, limit: int = 5)`: Executes hybrid sparse (BM25) and dense vector search across tenant-scoped whitepapers and proposals.
2. `manage_roadmap(action: str, item_id: Optional[str], payload: Optional[Dict])`: Inspects discovery backlog items, creates new Gherkin-backed user stories, and transitions KanBan column stages (`discovery` $\rightarrow$ `in_development` $\rightarrow$ `in_review` $\rightarrow$ `done`).
3. `get_cloud_diagnostics(service_name: str)`: Provides real-time health, connection pool status, and latency diagnostics across Cloud Run, PostgreSQL, and search indexes.

### 3. Multi-Tenant Zero-Trust Isolation
- In compliance with **ADR-0001**, **ADR-0002**, and **ADR-0021**, all MCP invocations require explicit tenant resolution:
  - Remote SSE connections require the `X-Tenant-ID` header or authenticated JWT claims.
  - All tool executions are strictly scoped to the caller's tenant database partitions and Pinecone vector namespaces. Cross-tenant access is rejected with HTTP 403 / JSON-RPC error `-32000`.

### 4. Zero-LLM Deterministic Gateway
- The MCP server layer contains **0 AI models and 0 prompt tokens**. It is a pure deterministic JSON-RPC 2.0 gateway delegating to Pydantic-validated domain services. The AI reasoning happens exclusively in the client (Gemini, Claude, Antigravity, or Fleet Runner).

## Consequences

### Positive
- **Universal IDE & Agent Compatibility**: Works out-of-the-box with Gemini Chat, Antigravity IDE, Cursor, Claude Code, and autonomous CI/CD fleets without proprietary SDKs.
- **Bi-Directional Event Bridging**: Dragging a ticket to "In Development" on the roadmap UI can immediately invoke the fleet via MCP, which materializes code, opens PRs, and reports status back to PostgreSQL.
- **Strict Multi-Tenant Security**: Tenant headers are validated at the protocol boundary before any tool logic executes.

### Negative / Trade-offs
- **Connection State Management**: Remote SSE connections require an in-memory queue or Pub/Sub registry (`connections[tenant_id]`) to route asynchronous POST responses back to the persistent SSE stream.
- **Tool Schema Governance**: Any modification to backend schema contracts must be mirrored in the MCP Pydantic tool argument definitions.
