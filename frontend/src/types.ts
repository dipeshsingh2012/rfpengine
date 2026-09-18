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
  { id: "demo", title: "Northstar security review", editedAt: "8 min ago", color: "blue", questionsCount: 12 },
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

export const sampleDemoFiles = [
  { name: "Security Whitepaper", file: "01_Security_and_Compliance_Whitepaper.md", format: "MD" },
  { name: "SLA & Operations", file: "02_SLA_Disaster_Recovery_and_Operations.pdf", format: "PDF" },
  { name: "Privacy & Subprocessors", file: "03_Data_Privacy_GDPR_and_Subprocessors.xlsx", format: "XLSX" },
  { name: "Vendor Security Q&A", file: "04_Standard_Vendor_Security_Questionnaire.csv", format: "CSV" },
  { name: "API & Integrations", file: "05_Product_Features_and_API_Integrations.docx", format: "DOCX" },
  { name: "Code of Conduct / HR", file: "06_Employee_Code_of_Conduct_and_HR_Policies.txt", format: "TXT" },
  { name: "Drone Fleet Safety SOP", file: "07_Autonomous_Drone_Fleet_Logistics_and_Aviation_Safety.txt", format: "TXT" },
];

export const playgroundStarterQueries = [
  "What encryption standards are enforced for databases at rest?",
  "What are our Recovery Point Objective (RPO) and Recovery Time Objective (RTO)?",
  "Are we compliant with SOC 2 Type II and ISO 27001?",
  "Who are our authorized subprocessors and where are they located?",
  "What is our policy for employee background checks?",
  "What are the rate limits and authentication methods for the REST API?",
];

export const demoResponse: SearchResponse = {
  suggested_answer:
    "Acme retains customer data for the duration of the active subscription and for up to 30 days after termination to support recovery and orderly account closure. Backups are rotated on a 35-day schedule, after which data is permanently deleted unless a longer period is required by law.",
  confidence_score: 0.91,
  sources: [
    {
      id: "kb-2048",
      question: "How long is customer data retained after account termination?",
      answer:
        "Customer data is retained for 30 days after termination. Encrypted backups are rotated after 35 days.",
      score: 0.0323,
    },
    {
      id: "kb-1182",
      question: "What is your data deletion policy?",
      answer:
        "Customers may request deletion at any time. Production data is removed within 30 days and backup copies expire on their normal rotation schedule.",
      score: 0.0317,
    },
    {
      id: "kb-0751",
      question: "Where is customer information stored?",
      answer:
        "Customer information is stored in encrypted cloud infrastructure with access restricted to authorized personnel.",
      score: 0.0308,
    },
  ],
  exemplars_used: [
    {
      id: "kb-gold-101",
      question: "What is your automated backup retention schedule?",
      approved_answer:
        "Customer database backups are encrypted with AES-256 and rotated on a strict 35-day automated lifecycle schedule, ensuring zero orphaned records post-expiration.",
      category: "Golden Q&A",
      relevance_score: 0.96,
      source_file: "02_SLA_Disaster_Recovery_and_Operations.pdf",
    },
    {
      id: "kb-gold-102",
      question: "Are GDPR Right to Erasure requests honored within statutory timelines?",
      approved_answer:
        "Yes. Deletion requests are cryptographically purged across all active production clusters within 24 hours, followed by standard 35-day immutable backup rotation.",
      category: "Golden Q&A",
      relevance_score: 0.93,
      source_file: "03_Data_Privacy_GDPR_and_Subprocessors.xlsx",
    },
  ],
  tone_applied: "Authoritative & Direct",
};

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

