export type Source = {
  id: string;
  question: string;
  answer: string;
  score: number;
};

export interface ExemplarItem {
  id: string;
  question: string;
  approved_answer: string;
  category?: string;
  relevance_score?: number;
  source_file?: string;
}

export interface ExtractedQuestionItem {
  id: string;
  question_text: string;
  original_text?: string;
  section?: string;
  expected_type?: "narrative" | "choice" | "numeric" | "boolean" | string;
  options?: string[];
  selected?: boolean;
  is_user_added?: boolean;
  is_edited?: boolean;
  is_rephrased?: boolean;
}

export type SearchResponse = {
  suggested_answer: string;
  confidence_score: number;
  sources: Source[];
  exemplars_used?: ExemplarItem[];
  tone_applied?: string;
};

export type KBItem = {
  id: string;
  tenant_id: string;
  title?: string;
  content?: string;
  question?: string;
  answer?: string;
  category?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};

export interface KBSourceItem {
  id: string;
  tenant_id: string;
  name: string;
  source_type: "web_crawler" | "github_docs" | "cloud_storage" | "rfp_harvest" | string;
  config: Record<string, any>;
  schedule_frequency: "manual" | "hourly" | "daily" | "weekly" | string;
  status: "idle" | "syncing" | "success" | "error" | string;
  last_synced_at?: string | null;
  last_error?: string | null;
  metrics?: {
    documents_count?: number;
    chunks_count?: number;
    last_duration_sec?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface KBSyncLogItem {
  id: string;
  source_id: string;
  tenant_id: string;
  status: "running" | "completed" | "failed" | string;
  started_at: string;
  completed_at?: string | null;
  duration_seconds: number;
  documents_scanned: number;
  chunks_created: number;
  chunks_updated: number;
  chunks_pruned: number;
  error_details?: string | null;
}

export interface KBSourceCreatePayload {
  name: string;
  source_type: string;
  config: Record<string, any>;
  schedule_frequency: string;
  tenant_id?: string;
}


export type WorkspaceSettings = {
  tenant_id: string;
  company_name: string;
  industry: string;
  admin_email: string;
  company_context: string;
  default_model: string;
  default_top_k: number;
  response_tone: string;
  disclaimer: string;
  auto_promote_golden_qa: boolean;
  sme_roles_config: {
    security_sme_email: string;
    legal_reviewer_email: string;
    final_approver_email: string;
    [key: string]: any;
  };
  active_tuned_model_id?: string | null;
};

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  tenant_id: "acme-corp",
  company_name: "Acme Corporation",
  industry: "Enterprise Cloud & SaaS",
  admin_email: "security-team@acme.corp",
  company_context:
    "Acme Corporation is an enterprise security and workflow platform specializing in SOC 2 Type II, ISO 27001, and FedRAMP certified deployments.",
  default_model: "gemini-2.5-flash",
  default_top_k: 5,
  response_tone: "concise",
  disclaimer:
    "CONFIDENTIAL: The responses provided herein contain proprietary information intended solely for the recipient's evaluation.",
  auto_promote_golden_qa: true,
  sme_roles_config: {
    security_sme_email: "security-sme@acme.corp",
    legal_reviewer_email: "legal-review@acme.corp",
    final_approver_email: "vp-compliance@acme.corp",
  },
  active_tuned_model_id: null,
};

export type TuningJobItem = {
  id: string;
  tenant_id: string;
  job_name: string;
  base_model: string;
  tuned_model_name: string | null;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | string;
  training_dataset_uri: string;
  dataset_examples_count: number;
  epochs: number;
  learning_rate_multiplier: number;
  metrics: {
    train_loss?: number;
    eval_loss?: number;
    step?: number;
    total_examples?: number;
    [key: string]: any;
  };
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type TuningDatasetPreview = {
  total_pairs: number;
  golden_qa_count: number;
  approved_reviews_count: number;
  sample_pairs: Array<{
    messages: Array<{
      role: "system" | "user" | "model";
      content: string;
    }>;
  }>;
};

export type SourceMode = "url" | "upload" | "extension";

export type ReviewerRole =
  | "Proposal manager"
  | "Security SME"
  | "Legal reviewer"
  | "Final approver";

export interface RecentRFPItem {
  id: string;
  title: string;
  editedAt: string;
  color: "blue" | "orange" | "green";
  questionsCount?: number;
}

export interface WorkspaceSummaryItem {
  id: string;
  tenant_id: string;
  title: string;
  source_mode: "url" | "upload" | "extension";
  source_url?: string | null;
  total_questions: number;
  approved_count: number;
  in_review_count: number;
  changes_requested_count: number;
  draft_count: number;
  completion_percentage: number;
  status: "Draft" | "In Review" | "Changes Requested" | "Approved";
  assigned_roles: string[];
  created_at: string;
  updated_at: string;
  color?: string;
}

export interface WorkspaceQuestionItem {
  id?: string;
  question_index: number;
  question_text: string;
  suggested_answer?: string | null;
  final_answer?: string | null;
  review_status: string;
  assigned_role?: string | null;
  confidence_score?: number | null;
  sources?: any[] | null;
  is_promoted_to_kb?: boolean;
  promoted_kb_id?: string | null;
}

export interface WorkspaceDetailResponse {
  id: string;
  tenant_id: string;
  title: string;
  source_mode: SourceMode;
  source_url?: string | null;
  created_at: string;
  updated_at: string;
  questions: WorkspaceQuestionItem[];
}

export const DEFAULT_RECENT_RFPS: RecentRFPItem[] = [
  { id: "ws-northstar", title: "Northstar security review", editedAt: "8 min ago", color: "blue", questionsCount: 12 },
  { id: "grove-rfp", title: "Grove procurement RFP", editedAt: "Yesterday", color: "orange", questionsCount: 8 },
  { id: "meridian-form", title: "Meridian vendor form", editedAt: "Aug 18", color: "green", questionsCount: 15 },
];

export interface ActivityLogItem {
  id: string;
  user: string;
  action: string;
  details: string;
  timestamp: string;
  type: "approval" | "generation" | "kb" | "import" | "review" | "settings" | "export";
}

export const DEFAULT_ACTIVITY_LOGS: ActivityLogItem[] = [
  {
    id: "act-1",
    user: "Proposal Drafter",
    action: "Loaded questionnaire form",
    details: "Northstar security review (12 detected questions)",
    timestamp: "10 minutes ago",
    type: "import",
  },
  {
    id: "act-2",
    user: "Gemini 2.5 Flash",
    action: "Generated response draft",
    details: "Drafted answers for 12 questions grounded in knowledge base",
    timestamp: "8 minutes ago",
    type: "generation",
  },
  {
    id: "act-3",
    user: "Security SME",
    action: "Approved response item",
    details: "Approved Q01: 'Does the system support SAML 2.0 / Okta SSO?'",
    timestamp: "5 minutes ago",
    type: "approval",
  },
  {
    id: "act-4",
    user: "Security SME",
    action: "Promoted Golden Q&A to Knowledge Base",
    details: "Upserted approved SOC2 compliance response into Pinecone & Algolia index",
    timestamp: "3 minutes ago",
    type: "kb",
  },
];

export const playgroundStarterQueries = [
  "What encryption standards are enforced for databases at rest?",
  "What are our Recovery Point Objective (RPO) and Recovery Time Objective (RTO)?",
  "Are we compliant with SOC 2 Type II and ISO 27001?",
  "Who are our authorized subprocessors and where are they located?",
  "What is our policy for employee background checks?",
  "What are the rate limits and authentication methods for the REST API?",
];

export const starterQuestions = [
  "Describe your data retention and automated backup rotation policy.",
  "Explain how customer data is encrypted at rest and in transit.",
  "List your security certifications and compliance audit standards.",
  "What uptime SLA guarantee do you provide and what are your support hours?",
  "What is your typical implementation timeline and customer onboarding process?",
  "What authentication and Single Sign-On (SSO) integrations are supported?",
  "Describe your drone battery safety, thermal runaway mitigation, and charging protocols.",
  "What FAA waivers and Beyond Visual Line of Sight (BVLOS) authorizations are held?",
  "What is the guaranteed latency SLA and failover mechanism for remote pilot teleoperation?",
];

