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
  tenant_id?: string;
  title: string;
  stage: RoadmapStage;
  theme: StrategicTheme;
  priority: PriorityLevel;
  targetPersona: string;
  target_persona?: string;
  quarter: string;
  summary: string;
  problemStatement: string;
  problem_statement?: string;
  userStory: string;
  user_story?: string;
  successMetrics: string[];
  success_metrics?: string[];
  acceptanceCriteria: string[];
  acceptance_criteria?: string[];
  technicalArchitecture: string;
  technical_architecture?: string;
  rice: RICEScore;
  upvotes: number;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export function normalizeInitiative(raw: any): RoadmapInitiative {
  return {
    id: raw.id || "",
    tenant_id: raw.tenant_id || "default",
    title: raw.title || "Untitled Initiative",
    stage: raw.stage || "discovery",
    theme: raw.theme || "Smart Ingestion",
    priority: raw.priority || "P1 - High",
    targetPersona: raw.targetPersona || raw.target_persona || "Proposal Manager",
    target_persona: raw.target_persona || raw.targetPersona || "Proposal Manager",
    quarter: raw.quarter || "In Discovery",
    summary: raw.summary || "",
    problemStatement: raw.problemStatement || raw.problem_statement || "",
    problem_statement: raw.problem_statement || raw.problemStatement || "",
    userStory: raw.userStory || raw.user_story || "",
    user_story: raw.user_story || raw.userStory || "",
    successMetrics: raw.successMetrics || raw.success_metrics || [],
    success_metrics: raw.success_metrics || raw.successMetrics || [],
    acceptanceCriteria: raw.acceptanceCriteria || raw.acceptance_criteria || [],
    acceptance_criteria: raw.acceptance_criteria || raw.acceptanceCriteria || [],
    technicalArchitecture: raw.technicalArchitecture || raw.technical_architecture || "",
    technical_architecture: raw.technical_architecture || raw.technicalArchitecture || "",
    rice: raw.rice || { reach: 50, impact: 2, confidence: 70, effort: 3, score: 23.3 },
    upvotes: raw.upvotes || 0,
    tags: raw.tags || [],
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
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
