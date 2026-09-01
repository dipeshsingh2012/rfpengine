# Agentic SDLC Framework & Architecture Blueprints

This directory contains the architecture specifications, operational blueprints, and future implementation guides for the **Centralized GitHub-Native Agentic SDLC**.

---

## Documents

| Document | Purpose | Status |
| :--- | :--- | :--- |
| [BLUEPRINT-CENTRALIZED-AGENTIC-SDLC.md](BLUEPRINT-CENTRALIZED-AGENTIC-SDLC.md) | Comprehensive architecture blueprint for decoupling agents into a central repo with zero-CLI GitHub-native workflows. | Ready for Future Implementation |

---

## Key Highlights of the Blueprint
1. **Zero Local CLI Dependency**: All planning, coding, security reviews, and QA run in cloud containers via GitHub Issues & PRs.
2. **Centralized Multi-Repo Swarm**: Agents live in `agentic-sdlc-central`; target projects only hold application code.
3. **5 Role-Bound Autonomous Agents**: `pm-agent`, `dev-agent`, `security-agent`, `qa-agent`, and `senior-reviewer-agent`.
4. **Dual Integration Modes**: Reusable GitHub Actions or Account-Level GitHub App.

