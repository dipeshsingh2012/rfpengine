// RFPEngine Product Roadmap & Discovery Hub Data Model

export type RoadmapStage = "discovery" | "spec" | "development" | "beta" | "shipped";
export type StrategicTheme =
  | "Core AI & Retrieval"
  | "Enterprise Governance"
  | "Smart Ingestion"
  | "Ecosystem Integrations"
  | "Collaboration & Workflow";
export type PriorityLevel = "P0 - Critical" | "P1 - High" | "P2 - Medium";

export interface RICEScore {
  reach: number; // Estimated % or number of customers impacted
  impact: number; // 1 = Low, 2 = Medium, 3 = High, 4 = Massive
  confidence: number; // 50% - 100%
  effort: number; // Person-weeks (1-10)
  score: number; // (Reach * Impact * Confidence) / Effort
}

export interface RoadmapInitiative {
  id: string;
  title: string;
  stage: RoadmapStage;
  theme: StrategicTheme;
  priority: PriorityLevel;
  targetPersona: string;
  quarter: string;
  summary: string;
  problemStatement: string;
  userStory: string;
  successMetrics: string[];
  acceptanceCriteria: string[];
  technicalArchitecture: string;
  rice: RICEScore;
  upvotes: number;
  tags: string[];
}

export const STAGE_CONFIG: Record<
  RoadmapStage,
  { label: string; icon: string; description: string; color: string; badgeClass: string }
> = {
  discovery: {
    label: "In Discovery",
    icon: "🔍",
    description: "Customer interviews, user research & problem validation",
    color: "#64748b",
    badgeClass: "stage-discovery",
  },
  spec: {
    label: "In Spec & Design",
    icon: "📐",
    description: "PRD documentation, UX wireframing & technical architecture",
    color: "#8b5cf6",
    badgeClass: "stage-spec",
  },
  development: {
    label: "In Development",
    icon: "🏗️",
    description: "Active sprint execution and backend/frontend engineering",
    color: "#3b82f6",
    badgeClass: "stage-dev",
  },
  beta: {
    label: "Beta & Testing",
    icon: "🧪",
    description: "Pilot testing with enterprise design partner customers",
    color: "#f59e0b",
    badgeClass: "stage-beta",
  },
  shipped: {
    label: "Shipped & Live",
    icon: "🚀",
    description: "Deployed to production and actively serving enterprise users",
    color: "#10b981",
    badgeClass: "stage-shipped",
  },
};

export const INITIAL_ROADMAP_INITIATIVES: RoadmapInitiative[] = [
  // --- SHIPPED ---
  {
    id: "proposal-drafter-agent",
    title: "Proposal Drafter Agent (Grounded Knowledge Engine)",
    stage: "shipped",
    theme: "Core AI & Retrieval",
    priority: "P0 - Critical",
    targetPersona: "Proposal Drafter",
    quarter: "Shipped",
    summary: "Production Python FastAPI service on Google Cloud Run with Gemini 2.5 Flash and hybrid retrieval, acting as the foundational drafting agent.",
    problemStatement:
      "Enterprise sales teams spend 30+ hours per RFP searching through outdated sales decks and disconnected wikis for accurate compliance answers, risking factual inaccuracies.",
    userStory:
      "As a Proposal Drafter, I want an AI Proposal Drafter to generate baseline response drafts strictly grounded in verified company collateral with exact citations.",
    successMetrics: [
      "99.4% factual grounding precision",
      "< 1.2s end-to-end retrieval latency",
      "Zero ungrounded hallucinations in production",
    ],
    acceptanceCriteria: [
      "Given a question, the Proposal Drafter retrieves top-k passages with semantic and keyword scores.",
      "When confidence is high, citations and exact source document IDs are returned.",
      "Responses return structured JSON with confidence score and passage attribution.",
    ],
    technicalArchitecture:
      "FastAPI + Vertex AI gemini-2.5-flash + pgvector cosine similarity + Cloud Run container with auto-scaling.",
    rice: { reach: 100, impact: 4, confidence: 95, effort: 3, score: 126.7 },
    upvotes: 84,
    tags: ["Proposal Drafter", "Vertex AI", "Gemini 2.5", "Cloud Run", "pgvector"],
  },
  {
    id: "chrome-extension-mv3",
    title: "Manifest V3 Assistant with Background Service Worker",
    stage: "shipped",
    theme: "Enterprise Governance",
    priority: "P0 - Critical",
    targetPersona: "Proposal Drafter",
    quarter: "Shipped",
    summary: "In-page buyer form autofill and side panel assistant utilizing chrome.storage.local and 3-tier DOM matching.",
    problemStatement:
      "Buyers mandate filling out custom web portals (Coupa, Google Forms, Typeform) with 50+ text fields, forcing sellers to manually copy and paste answers one-by-one.",
    userStory:
      "As a Proposal Drafter, I want an extension that detects all form fields on external buyer portals and injects approved workspace answers in one click, so that manual data entry is eliminated.",
    successMetrics: [
      "100% field match rate across 9-question mock procurement portal",
      "Zero LLM API calls required during handoff insertion",
      "< 500ms 1-click batch injection time",
    ],
    acceptanceCriteria: [
      "Extension listens to Background Service Worker message passing.",
      "Matches fields via 3-tier heuristic (exact text -> fuzzy overlap -> positional index).",
      "Triggers React/Angular input/change events to ensure form validation passes.",
    ],
    technicalArchitecture:
      "Chrome Manifest V3 + Service Worker (background.js) + content script DOM injector + sandboxed storage.",
    rice: { reach: 90, impact: 4, confidence: 90, effort: 3, score: 108.0 },
    upvotes: 67,
    tags: ["Chrome Extension", "MV3", "Autofill", "DOM Matching"],
  },
  {
    id: "governance-approval-workflow",
    title: "4-Role Enterprise Governance & SME Review Queue",
    stage: "shipped",
    theme: "Enterprise Governance",
    priority: "P0 - Critical",
    targetPersona: "Security SME / Legal Counsel",
    quarter: "Shipped",
    summary: "Multi-stage routing workflow with Proposal Drafter, Security SME, Legal Reviewer, and Final Approver roles.",
    problemStatement:
      "RFPs contain sensitive legal terms and technical commitments that cannot be submitted without sign-off from dedicated security and legal stakeholders.",
    userStory:
      "As a Security Director, I want a structured review queue where draft answers are routed to me for audit and sign-off before submission, so that liability risks are mitigated.",
    successMetrics: [
      "100% audit trail compliance for approved responses",
      "-50% turnaround time on SME review handoffs",
      "Zero unreviewed draft submissions",
    ],
    acceptanceCriteria: [
      "Drafter can dispatch individual or all questionnaire items to specific SME roles.",
      "Reviewers can leave feedback notes, request changes, or approve.",
      "Celebratory completion state only unlocks when all items achieve full sign-off.",
    ],
    technicalArchitecture:
      "Role-aware state management with local persistence, multi-role badge classification, and interactive modal drawer.",
    rice: { reach: 85, impact: 3, confidence: 95, effort: 2, score: 121.1 },
    upvotes: 59,
    tags: ["Governance", "SME Review", "Legal Sign-off", "Audit Trail"],
  },

  // --- BETA & TESTING ---
  {
    id: "kb-doc-ingestion",
    title: "Document Ingestion Pipeline & Retrieval Playground",
    stage: "beta",
    theme: "Smart Ingestion",
    priority: "P1 - High",
    targetPersona: "Proposal Manager",
    quarter: "Q1 2026",
    summary: "Multi-file document ingestion (PDF, Markdown, TXT, JSON) with live semantic chunking and test playground.",
    problemStatement:
      "Maintaining an up-to-date RFP knowledge base requires constant document uploads and testing retrieval accuracy against real customer questions.",
    userStory:
      "As a Knowledge Manager, I want to drag-and-drop our latest SOC 2 and security policies and immediately test question retrieval in a live playground.",
    successMetrics: [
      "< 3s ingestion processing time for 50-page PDFs",
      "Immediate searchability in the interactive playground",
      "Document chunk provenance tracking",
    ],
    acceptanceCriteria: [
      "Users can upload multiple files with progress feedback.",
      "Playground provides side-by-side prompt testing and retrieved source inspection.",
      "Ingested documents are queryable across all tenant sessions.",
    ],
    technicalArchitecture:
      "Client-side document parser + FastAPI ingestion endpoints + embedding generator + vector store indexing.",
    rice: { reach: 80, impact: 3, confidence: 85, effort: 3, score: 68.0 },
    upvotes: 43,
    tags: ["Ingestion", "PDF Parser", "Playground", "Chunking"],
  },

  // --- IN DEVELOPMENT ---
  {
    id: "excel-sig-lite-parser",
    title: "Multi-Format Excel & SIG Lite / CAIQ Parser",
    stage: "development",
    theme: "Smart Ingestion",
    priority: "P0 - Critical",
    targetPersona: "Proposal Manager",
    quarter: "Q2 2026",
    summary: "Native parser for complex .xlsx spreadsheets, multi-tab workbooks, and standard questionnaires (SIG Lite, CAIQ v4).",
    problemStatement:
      "Over 70% of enterprise security questionnaires arrive as 300-row Excel files with complex merged headers, dropdown options, and multi-sheet layouts.",
    userStory:
      "As a Proposal Manager, I want to upload a vendor Excel questionnaire and have RFPEngine automatically extract all questions and sheet structures into an editable workspace.",
    successMetrics: [
      "98% accuracy on tabular question/column detection",
      "Support for multi-sheet workbooks up to 500 questions",
      "1-click export back to original .xlsx format with formulas intact",
    ],
    acceptanceCriteria: [
      "Accepts .xlsx and .csv files with auto-detection of Question and Answer columns.",
      "Preserves original row IDs and category groupings.",
      "Exports filled Excel file matching the buyer's exact column format.",
    ],
    technicalArchitecture:
      "WebAssembly-powered SheetJS parser + Python openpyxl backend validation service + schema mapper.",
    rice: { reach: 95, impact: 4, confidence: 85, effort: 4, score: 80.8 },
    upvotes: 91,
    tags: ["Excel Parser", "SIG Lite", "CAIQ", "Spreadsheets"],
  },
  {
    id: "compliance-matrix-exporter",
    title: "Automated Compliance Matrix & Audit Package Exporter",
    stage: "development",
    theme: "Enterprise Governance",
    priority: "P1 - High",
    targetPersona: "Security Director",
    quarter: "Q2 2026",
    summary: "One-click export of approved RFP responses into audit-ready PDF, Word (DOCX), and CSV compliance packages.",
    problemStatement:
      "Enterprise buyers and procurement auditors require signed compliance packages with timestamps, SME signatures, and citation appendices.",
    userStory:
      "As a Security Director, I want to generate a branded, audit-stamped Compliance Report PDF with verified sources, so that our submission looks professional and compliant.",
    successMetrics: [
      "-80% time spent formatting final RFP deliverables",
      "Branded company template customization",
      "100% citation inclusion in exported appendices",
    ],
    acceptanceCriteria: [
      "Generates PDF and DOCX documents with corporate branding and table of contents.",
      "Appends full audit trail of reviewer approvals and timestamps.",
      "Includes structured appendix of all cited SOC 2 / ISO clauses.",
    ],
    technicalArchitecture:
      "Headless document generator (Docx templating + PDF rendering engine) + cryptographic hash verification.",
    rice: { reach: 75, impact: 3, confidence: 90, effort: 2, score: 101.3 },
    upvotes: 38,
    tags: ["DOCX Export", "PDF Generation", "Audit Stamping", "Compliance"],
  },

  // --- IN SPEC & DESIGN ---
  {
    id: "multi-agent-fact-checker",
    title: "Autonomous Multi-Agent Fact-Checker & Hallucination Guard",
    stage: "spec",
    theme: "Core AI & Retrieval",
    priority: "P0 - Critical",
    targetPersona: "Legal Counsel / Security SME",
    quarter: "Q3 2026",
    summary: "Agentic critic swarm that cross-examines AI drafts against contract clauses, rejecting unverified claims.",
    problemStatement:
      "Standard LLM outputs occasionally make unsubstantiated product roadmap claims or commit to SLA terms that exceed standard contract boundaries.",
    userStory:
      "As Legal Counsel, I want an automated AI Fact-Checker to highlight any commitment that is not backed by an approved policy, so that our company is protected from breach of contract.",
    successMetrics: [
      "100% identification of unverified commitments",
      "Confidence-weighted sentence highlighting",
      "-75% time spent by legal scanning for liability traps",
    ],
    acceptanceCriteria: [
      "Specialized Critic Agent cross-checks every sentence against knowledge base embeddings.",
      "Flags high-risk keywords (e.g. 'guarantee', 'indemnify', 'unlimited liability', '100% uptime').",
      "Provides inline suggested redlines with cited policy bounds.",
    ],
    technicalArchitecture:
      "LangGraph / AutoGen multi-agent pipeline with parallel Critic, Security, and Compliance evaluators.",
    rice: { reach: 85, impact: 4, confidence: 75, effort: 4, score: 63.8 },
    upvotes: 76,
    tags: ["Multi-Agent", "Fact-Checking", "Hallucination Guard", "Risk Scoring"],
  },
  {
    id: "cloud-connectors-sync",
    title: "Continuous Knowledge Connectors (Drive, Confluence, Notion)",
    stage: "spec",
    theme: "Ecosystem Integrations",
    priority: "P1 - High",
    targetPersona: "Head of Sales / RevOps",
    quarter: "Q3 2026",
    summary: "Automated background sync connecting Google Drive folders, Confluence spaces, and Notion docs.",
    problemStatement:
      "Company policies change weekly, but RFP response databases become stale when product managers update documentation in Confluence without notifying proposal teams.",
    userStory:
      "As RevOps Lead, I want RFPEngine to continuously sync with our engineering Confluence space and product Notion, so that answers always reflect the latest release notes.",
    successMetrics: [
      "Zero manual knowledge re-uploads required",
      "Daily incremental sync with change delta detection",
      "Automatic archiving of deprecated documentation",
    ],
    acceptanceCriteria: [
      "OAuth 2.0 connectors for Google Drive, Atlassian Confluence, and Notion.",
      "Webhook-driven incremental change indexing.",
      "Admin dashboard showing sync health and document freshness score.",
    ],
    technicalArchitecture:
      "Cloud Tasks background worker + OAuth token vault + incremental vector index updater.",
    rice: { reach: 70, impact: 3, confidence: 80, effort: 3, score: 56.0 },
    upvotes: 52,
    tags: ["Google Drive", "Confluence", "Notion", "Continuous Sync"],
  },

  // --- IN DISCOVERY ---
  {
    id: "realtime-multiplayer-collab",
    title: "Real-Time Multiplayer Collaborative Drafting & Presence",
    stage: "discovery",
    theme: "Collaboration & Workflow",
    priority: "P1 - High",
    targetPersona: "Bid Team",
    quarter: "H2 2026",
    summary: "Live collaborative workspace with multi-user presence cursors, inline comments, and section assignment.",
    problemStatement:
      "Large enterprise bids require 5+ simultaneous contributors (Technical Architects, Pricing, Legal), causing version conflicts when working in silos.",
    userStory:
      "As a Proposal Manager, I want to see which team members are editing each section in real time and @mention colleagues for instant review, so that collaboration is seamless.",
    successMetrics: [
      "Zero edit overwrite conflicts",
      "< 100ms multi-cursor sync latency",
      "Integrated Slack review notifications",
    ],
    acceptanceCriteria: [
      "Displays live user avatars on active question cards.",
      "Field locking prevents simultaneous conflicting edits.",
      "Inline comment threads with @mention alerts.",
    ],
    technicalArchitecture:
      "WebSocket connection gateway + CRDT / Yjs conflict resolution + Redis PubSub cluster.",
    rice: { reach: 65, impact: 3, confidence: 70, effort: 4, score: 34.1 },
    upvotes: 49,
    tags: ["Multiplayer", "WebSockets", "Live Cursors", "CRDT"],
  },
  {
    id: "advanced-portal-adapters",
    title: "Advanced Buyer Portal Automation (Coupa, Ariba, Loopio)",
    stage: "discovery",
    theme: "Ecosystem Integrations",
    priority: "P2 - Medium",
    targetPersona: "Proposal Drafter",
    quarter: "H2 2026",
    summary: "Deep browser extension adapters for dropdowns, radio matrices, and multi-page questionnaire navigation.",
    problemStatement:
      "Complex procurement portals use custom dropdowns, yes/no radio groups, and multi-page wizards that basic DOM scanners struggle to automate.",
    userStory:
      "As a Proposal Drafter, I want the extension to automatically select the right compliance dropdowns (e.g. 'Compliant', 'Partially Compliant') based on AI reasoning.",
    successMetrics: [
      "95% accuracy on standard dropdown and radio option mapping",
      "Multi-page auto-navigation support for Coupa and Ariba",
    ],
    acceptanceCriteria: [
      "Extension detects and maps non-standard select2/custom dropdowns.",
      "Selects Yes/No/Partial based on answer context.",
      "Handles paginated form transitions without losing session state.",
    ],
    technicalArchitecture:
      "Custom DOM shadow-root parser + selector heuristics + client-side option matcher.",
    rice: { reach: 60, impact: 2, confidence: 65, effort: 3, score: 26.0 },
    upvotes: 31,
    tags: ["Coupa", "Ariba", "Dropdown Automator", "Browser Extension"],
  },
  {
    id: "win-loss-analytics",
    title: "Proposal Win/Loss Intelligence & Knowledge Gap Analytics",
    stage: "discovery",
    theme: "Enterprise Governance",
    priority: "P2 - Medium",
    targetPersona: "Head of Sales / RevOps",
    quarter: "H2 2026",
    summary: "Executive analytics dashboard identifying repetitive question trends, win rates, and knowledge base gaps.",
    problemStatement:
      "Sales leadership lacks visibility into which product areas cause the most friction in security reviews or where documentation is lacking.",
    userStory:
      "As Head of Sales, I want an executive report highlighting questions with low retrieval confidence, so that we can prioritize updating documentation on weak product areas.",
    successMetrics: [
      "Identifies top 10 most frequent buyer questions per quarter",
      "Automated Knowledge Gap Health Score",
      "Correlation insights between response speed and deal win rate",
    ],
    acceptanceCriteria: [
      "Visual charts for question frequency, confidence distributions, and turnaround times.",
      "Knowledge gap alert triggers when repeat questions yield low confidence scores.",
      "Exportable quarterly RFP performance summaries.",
    ],
    technicalArchitecture:
      "Aggregated query analytics table + Chart.js / Recharts visualizer + trend clustering algorithm.",
    rice: { reach: 50, impact: 3, confidence: 70, effort: 2, score: 52.5 },
    upvotes: 28,
    tags: ["Analytics", "Win/Loss", "Executive Dashboard", "Knowledge Gaps"],
  },
];

