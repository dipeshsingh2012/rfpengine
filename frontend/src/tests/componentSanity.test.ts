import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

// Import layout components
import { AppShell } from "../components/layout/AppShell.js";
import { Topbar } from "../components/layout/Topbar.js";
import { TopbarRoleSelector } from "../components/layout/topbar/TopbarRoleSelector.js";
import { TopbarUserMenu } from "../components/layout/topbar/TopbarUserMenu.js";
import { Sidebar } from "../components/layout/Sidebar.js";
import { SidebarRecentRFPs } from "../components/layout/sidebar/SidebarRecentRFPs.js";

// Import workspace components
import { HomeWelcomeView } from "../components/workspace/HomeWelcomeView.js";
import { HomeUrlFeature } from "../components/workspace/home/HomeUrlFeature.js";
import { HomeUploadFeature } from "../components/workspace/home/HomeUploadFeature.js";
import { SingleQuestionInputPanel } from "../components/workspace/questionnaire/SingleQuestionInputPanel.js";
import { BatchQuestionsHeaderBar } from "../components/workspace/questionnaire/BatchQuestionsHeaderBar.js";
import { EvidenceSourcesPanel } from "../components/workspace/EvidenceSourcesPanel.js";
import { GovernanceBar } from "../components/workspace/GovernanceBar.js";
import { GovernanceWaterfallSteps } from "../components/workspace/governance/GovernanceWaterfallSteps.js";

// Import responses dashboard components
import { ResponsesDashboard } from "../components/responses/ResponsesDashboard.js";
import { DeleteConfirmModal } from "../components/responses/dashboard/DeleteConfirmModal.js";

// Import modal components
import { KnowledgeBaseModal } from "../components/modals/KnowledgeBaseModal.js";
import { WorkspaceSettingsModal } from "../components/modals/WorkspaceSettingsModal.js";
import { ExportPackageModal } from "../components/modals/ExportPackageModal.js";
import { ActivityLogModal } from "../components/modals/ActivityLogModal.js";
import { ReviewGovernanceModal } from "../components/modals/ReviewGovernanceModal.js";
import { KBUploadTab } from "../components/modals/knowledge-base/KBUploadTab.js";
import { KBConnectorsTab } from "../components/modals/knowledge-base/KBConnectorsTab.js";
import { KBPlaygroundTab } from "../components/modals/knowledge-base/KBPlaygroundTab.js";
import { ModalPortal } from "../components/common/ModalPortal.js";
import { TuningStudioModal } from "../components/modals/workspace-settings/tuning/TuningStudioModal.js";
import { NewTuningJobModal } from "../components/modals/workspace-settings/tuning/NewTuningJobModal.js";
import { RevisionFeedbackModal } from "../components/workspace/questionnaire/RevisionFeedbackModal.js";
import { AdminTabsNav } from "../components/admin/AdminTabsNav.js";
import { AdminMembersTable } from "../components/admin/tabs/team/AdminMembersTable.js";
import { AdminPermissionsMatrix } from "../components/admin/tabs/team/AdminPermissionsMatrix.js";
import { AdminGovernanceTab } from "../components/admin/tabs/AdminGovernanceTab.js";
import { LandingAuthGate } from "../components/workspace/home/LandingAuthGate.js";

import { DEFAULT_WORKSPACE_SETTINGS } from "../types.js";

test("Component Sanity: AppShell, Topbar, and Sidebar render without crashing", () => {
  const html = renderToString(
    React.createElement(
      AppShell,
      {
        mobileNavOpen: false,
        setMobileNavOpen: () => {},
        companyName: "Acme Corp",
        onOpenSettings: () => {},
        backendHealth: "ok",
        isOverviewActive: true,
        isResponsesActive: false,
        isKbActive: false,
        isPlaygroundActive: false,
        isActivityActive: false,
        recentRFPs: [
          { id: "rfp-1", title: "Security Questionnaire", date: "Today", count: 12, tone: "concise" },
        ],
        activeResponseId: "rfp-1",
        onNavigateHome: () => {},
        onNavigateResponses: () => {},
        onSelectRFP: () => {},
        onOpenKB: () => {},
        onOpenActivity: () => {},
        showSettingsModal: false,
        kbTotalRecords: 150,
        kbTotalSources: 8,
        tenantId: "acme-corp",
        toastNotice: null,
      },
      React.createElement("div", { className: "child-test" }, "Test Content")
    )
  );

  assert.ok(html.includes("app-shell"));
  assert.ok(html.includes("topbar"));
  assert.ok(html.includes("sidebar"));
  assert.ok(html.includes("Test Content"));

  // Verify graceful handling when recentRFPs is undefined or empty
  const emptyHtml = renderToString(
    React.createElement(
      AppShell,
      {
        mobileNavOpen: false,
        setMobileNavOpen: () => {},
        companyName: "Acme Corp",
        onOpenSettings: () => {},
        backendHealth: "ok",
        isOverviewActive: true,
        isResponsesActive: false,
        isKbActive: false,
        isPlaygroundActive: false,
        isActivityActive: false,
        recentRFPs: undefined as any,
        activeResponseId: "",
        onNavigateHome: () => {},
        onNavigateResponses: () => {},
        onSelectRFP: () => {},
        onOpenKB: () => {},
        onOpenActivity: () => {},
        showSettingsModal: false,
        kbTotalRecords: 0,
        kbTotalSources: 0,
        tenantId: "acme-corp",
        toastNotice: null,
      },
      React.createElement("div", null, "Homepage Content")
    )
  );
  assert.ok(emptyHtml.includes("Homepage Content"));
  assert.ok(emptyHtml.includes("No recent proposals"));
});

test("Component Sanity: SidebarRecentRFPs renders items, truncation, badges, and empty state", () => {
  const renderedList = renderToString(
    React.createElement(SidebarRecentRFPs, {
      recentRFPs: [
        { id: "ws-1", title: "Enterprise Vendor Security Questionnaire 2026.csv", editedAt: "5 min ago", color: "green", questionsCount: 24 },
        { id: "ws-2", title: "Meridian SOC2 Compliance Review", editedAt: "Yesterday", color: "blue", questionsCount: 10 },
      ],
      isResponsesActive: true,
      activeResponseId: "ws-1",
      currentRoute: "/response/workspace/ws-1",
      onSelectRFP: () => {},
      onNavigateHome: () => {},
      onCloseMobile: () => {},
    })
  );

  assert.ok(renderedList.includes("recent-section"));
  assert.ok(renderedList.includes("recent-header"));
  assert.ok(renderedList.includes("recent-item"));
  assert.ok(renderedList.includes("recent-item-info"));
  assert.ok(renderedList.includes("recent-q-badge"));
  assert.ok(renderedList.includes("24Q"));
  assert.ok(renderedList.includes("Enterprise Vendor Security Questionnaire 2026.csv"));
  assert.ok(renderedList.includes("selected"));

  // Test empty state
  const renderedEmpty = renderToString(
    React.createElement(SidebarRecentRFPs, {
      recentRFPs: [],
      isResponsesActive: false,
      activeResponseId: "",
      currentRoute: "/",
      onSelectRFP: () => {},
      onNavigateHome: () => {},
      onCloseMobile: () => {},
    })
  );

  assert.ok(renderedEmpty.includes("recent-empty"));
  assert.ok(renderedEmpty.includes("recent-empty-action"));
  assert.ok(renderedEmpty.includes("No recent proposals"));
});

test("Component Sanity: HomeWelcomeView and features render without crashing", () => {
  const html = renderToString(
    React.createElement(HomeWelcomeView, {
      formUrl: "https://example.com/form",
      setFormUrl: () => {},
      loadFormUrl: async () => {},
      loadFormFile: async () => {},
      openImport: () => {},
      isParsingDocument: false,
      parsingProgress: "",
    })
  );

  assert.ok(html.includes("home-screen"));
  assert.ok(html.includes("home-feature-grid"));
  assert.ok(html.includes("Paste a form URL"));
  assert.ok(html.includes("Upload questionnaire"));
  const uploadIdx = html.indexOf("Upload questionnaire");
  const urlIdx = html.indexOf("Paste a form URL");
  assert.ok(uploadIdx < urlIdx, "Upload questionnaire feature should come before Paste a form URL");
});

test("Component Sanity: ResponsesDashboard and DeleteConfirmModal render properly", () => {
  const html = renderToString(
    React.createElement(ResponsesDashboard, {
      workspaces: [
        {
          id: "ws-1",
          title: "SaaS Security Audit",
          created_at: new Date().toISOString(),
          total_questions: 10,
          approved_count: 8,
          in_review_count: 2,
          changes_requested_count: 0,
          source_label: "security_audit.pdf",
          source_mode: "upload",
        },
      ],
      isLoading: false,
      onSelectWorkspace: () => {},
      onDuplicateWorkspace: () => {},
      onDeleteWorkspace: () => {},
      onExportWorkspace: () => {},
      onNewQuestionnaire: () => {},
      onRefresh: () => {},
    })
  );

  assert.ok(html.includes("responses-dashboard"));
  assert.ok(html.includes("SaaS Security Audit"));

  const modalHtml = renderToString(
    React.createElement(DeleteConfirmModal, {
      workspaceId: "ws-1",
      actionLoadingId: null,
      onClose: () => {},
      onDelete: () => {},
    })
  );
  assert.ok(modalHtml.includes("modal-backdrop"));
  assert.ok(modalHtml.includes("modal-card") || modalHtml.includes("delete-confirm-modal"));
});

test("Component Sanity: SingleQuestionInputPanel, BatchQuestionsHeaderBar, and EvidenceSourcesPanel render", () => {
  const inputHtml = renderToString(
    React.createElement(SingleQuestionInputPanel, {
      question: "How is data protected?",
      setQuestion: () => {},
      tenantId: "acme-corp",
      setTenantId: () => {},
      generateAnswer: () => {},
      isGenerating: false,
    })
  );
  assert.ok(inputHtml.includes("question-panel"));

  const batchHtml = renderToString(
    React.createElement(BatchQuestionsHeaderBar, {
      questionsCount: 5,
      tenantId: "acme-corp",
      setTenantId: () => {},
      generateAllAnswers: () => {},
      isGenerating: false,
      isBatchApproved: false,
    })
  );
  assert.ok(batchHtml.includes("question-header-bar"));

  const evidenceHtml = renderToString(
    React.createElement(EvidenceSourcesPanel, {
      sources: [
        { id: "src-1", question: "Encryption details", answer: "All data encrypted with AES-256", score: 0.95 },
      ],
      activeSource: "src-1",
      setActiveSource: () => {},
    })
  );
  assert.ok(evidenceHtml.includes("sources-column"));
  assert.ok(evidenceHtml.includes("source-card"));

  // Verify disabled states when questionnaire is approved
  const approvedBatchHtml = renderToString(
    React.createElement(BatchQuestionsHeaderBar, {
      questionsCount: 45,
      tenantId: "acme-corp",
      setTenantId: () => {},
      generateAllAnswers: () => {},
      isGenerating: false,
      isBatchApproved: true,
    })
  );
  assert.ok(approvedBatchHtml.includes("disabled"), "Generate all answers button must be disabled when approved");

  const approvedInputHtml = renderToString(
    React.createElement(SingleQuestionInputPanel, {
      question: "How is data protected?",
      setQuestion: () => {},
      tenantId: "acme-corp",
      setTenantId: () => {},
      generateAnswer: () => {},
      isGenerating: false,
      isApproved: true,
    })
  );
  assert.ok(approvedInputHtml.includes("disabled"), "Generate single answer button must be disabled when approved");

  const govBarHtml = renderToString(
    React.createElement(GovernanceBar, {
      role: "Proposal manager",
      setRole: () => {},
      showToast: () => {},
      approvedCount: 45,
      allQuestionsCount: 45,
      inReviewCount: 0,
      changesRequestedCount: 0,
      isBatchApproved: false,
      handleBatchApproveAll: () => {},
      handleReviewReset: () => {},
    })
  );
  assert.ok(govBarHtml.includes("disabled"), "Approve all button must be disabled when 45/45 questions are approved");
  assert.ok(govBarHtml.includes("Approve All as") && govBarHtml.includes("Drafter"));
});

test("Component Sanity: KnowledgeBaseModal tabs render with correct design classes", () => {
  const uploadHtml = renderToString(
    React.createElement(KBUploadTab, {
      isDragOver: false,
      setIsDragOver: () => {},
      isUploading: false,
      onUpload: () => {},
      uploadMsg: null,
      entries: [
        { id: "kb-1", title: "SOC2 Compliance", content: "We maintain SOC2 Type II certification", category: "Security" },
      ],
      isFetching: false,
      onRefresh: () => {},
      onDelete: () => {},
    })
  );
  assert.ok(uploadHtml.includes("kb-upload-tab"));
  assert.ok(uploadHtml.includes("kb-dropzone"));
  assert.ok(uploadHtml.includes("kb-entries-section"));
  assert.ok(uploadHtml.includes("kb-entry-card"));

  const connectorsHtml = renderToString(
    React.createElement(KBConnectorsTab, {
      sources: [
        {
          id: "conn-1",
          tenant_id: "acme-corp",
          name: "Trust Portal",
          source_type: "web_crawler",
          target_url: "https://trust.acme.com",
          schedule_frequency: "daily",
          status: "active",
          metrics: { documents_count: 5, chunks_count: 50 },
        },
      ],
      isLoading: false,
      isSyncingAll: false,
      syncingSourceIds: new Set(),
      syncNotice: null,
      onOpenAddModal: () => {},
      onSyncAll: () => {},
      onTriggerSync: () => {},
      onViewLogs: () => {},
      onDelete: () => {},
    })
  );
  assert.ok(connectorsHtml.includes("kb-connectors-tab"));
  assert.ok(connectorsHtml.includes("kb-sources-grid"));
  assert.ok(connectorsHtml.includes("kb-source-card"));

  const playgroundHtml = renderToString(
    React.createElement(KBPlaygroundTab, {
      query: "GDPR compliance",
      setQuery: () => {},
      topK: 4,
      setTopK: () => {},
      isLoading: false,
      onSearch: () => {},
      error: null,
      result: null,
    })
  );
  assert.ok(playgroundHtml.includes("kb-playground-tab"));
  assert.ok(playgroundHtml.includes("playground-search-input"));
});

test("Component Sanity: WorkspaceSettingsModal, ExportPackageModal, and ActivityLogModal render", () => {
  const settingsHtml = renderToString(
    React.createElement(WorkspaceSettingsModal, {
      isOpen: true,
      onClose: () => {},
      settings: DEFAULT_WORKSPACE_SETTINGS,
      setSettings: () => {},
      onSave: async () => {},
      onExport: () => {},
      isSaving: false,
      saveNotice: null,
      tenantId: "acme-corp",
      kbRecordsCount: 42,
      kbDocumentsCount: 5,
      recentRfpsCount: 12,
      settingsTab: "profile",
      setSettingsTab: () => {},
    })
  );
  assert.ok(settingsHtml.includes("settings-modal-container"));
  assert.ok(settingsHtml.includes("settings-modal-body"));

  const exportHtml = renderToString(
    React.createElement(ExportPackageModal, {
      isOpen: true,
      onClose: () => {},
      title: "Quarterly Audit",
      totalQuestions: 20,
      approvedCount: 20,
      onExport: async () => {},
    })
  );
  assert.ok(exportHtml.includes("settings-modal-container"));
  assert.ok(exportHtml.includes("settings-modal-body"));

  const activityHtml = renderToString(
    React.createElement(ActivityLogModal, {
      isOpen: true,
      onClose: () => {},
      activityLogs: [
        {
          id: "act-1",
          timestamp: "Just now",
          action: "Approved Answer",
          user: "Security Lead",
          details: "Approved response for data encryption",
          type: "approval",
        },
      ],
    })
  );
  assert.ok(activityHtml.includes("activity-feed-list"));
  assert.ok(activityHtml.includes("activity-stats-bar"));
});

test("Component Sanity: ModalPortal renders children and backdrop with proper ARIA attributes", () => {
  const html = renderToString(
    React.createElement(
      ModalPortal,
      {
        isOpen: true,
        onClose: () => {},
        cardClassName: "modal-card test-modal",
        ariaLabel: "Sanity Modal",
      },
      React.createElement("p", null, "Hello Modal")
    )
  );
  assert.ok(html.includes('role="dialog"'));
  assert.ok(html.includes('aria-modal="true"'));
  assert.ok(html.includes("modal-backdrop"));
  assert.ok(html.includes("Hello Modal"));
});

test("Component Sanity: ReviewGovernanceModal and RevisionFeedbackModal render cleanly", () => {
  const govHtml = renderToString(
    React.createElement(ReviewGovernanceModal, {
      isOpen: true,
      onClose: () => {},
      reviewTargetRole: "Security SME",
      setReviewTargetRole: () => {},
      reviewSelectedQuestion: null,
      reviewModalScope: "all",
      setReviewModalScope: () => {},
      reviewInstructions: "Review technical architecture",
      setReviewInstructions: () => {},
      onSubmit: () => {},
      allQuestionsCount: 15,
      currentQuestionText: "What is your backup policy?",
    })
  );
  assert.ok(govHtml.includes("review-modal"));
  assert.ok(govHtml.includes("Security SME"));

  const revHtml = renderToString(
    React.createElement(RevisionFeedbackModal, {
      isOpen: true,
      questionText: "What encryption standards are supported?",
      initialNote: "Please clarify AES-256 vs AES-128",
      reviewerRole: "Security SME",
      onSave: () => {},
      onClose: () => {},
    })
  );
  assert.ok(revHtml.includes("revision-feedback-modal"));
  assert.ok(revHtml.includes("feedback-textarea"));
  assert.ok(revHtml.includes("Needs SME Review"));
});

test("Component Sanity: TuningStudioModal and NewTuningJobModal render cleanly", () => {
  const studioHtml = renderToString(
    React.createElement(TuningStudioModal, {
      isOpen: true,
      onClose: () => {},
      tenantId: "acme-corp",
      settings: DEFAULT_WORKSPACE_SETTINGS,
      setSettings: () => {},
    })
  );
  assert.ok(studioHtml.includes("tuning-studio-modal"));
  assert.ok(studioHtml.includes("Gemini Supervised Tuning Studio"));

  const jobHtml = renderToString(
    React.createElement(NewTuningJobModal, {
      isOpen: true,
      isStarting: false,
      totalPairs: 45,
      onClose: () => {},
      onSubmit: async () => true,
    })
  );
  assert.ok(jobHtml.includes("new-tuning-modal"));
  assert.ok(jobHtml.includes("Launch Gemini Tuning Job"));
});

test("Component Sanity: TopbarRoleSelector renders all roles cleanly", () => {
  const html = renderToString(
    React.createElement(TopbarRoleSelector, {
      role: "Proposal manager",
      setRole: () => {},
      showToast: () => {},
    })
  );
  assert.ok(html.includes("topbar-role-selector"));
  assert.ok(html.includes("Proposal Drafter"));
  assert.ok(html.includes("Security SME"));
  assert.ok(html.includes("Legal Reviewer"));
  assert.ok(html.includes("Final Approver"));
});

test("Component Sanity: GovernanceWaterfallSteps displays sequential stages and active role", () => {
  const html = renderToString(
    React.createElement(GovernanceWaterfallSteps, {
      role: "Security SME",
      approvedCount: 0,
      allQuestionsCount: 45,
      inReviewCount: 45,
      changesRequestedCount: 0,
    })
  );
  assert.ok(html.includes("governance-role-select"));
  assert.ok(html.includes("Drafting"));
  assert.ok(html.includes("Security SME"));
  assert.ok(html.includes("Legal Review"));
  assert.ok(html.includes("Final Sign-off"));
  assert.ok(html.includes("Active"));
});

test("Component Sanity: TopbarUserMenu renders signed-out and signed-in states", () => {
  const unauthedHtml = renderToString(
    React.createElement(TopbarUserMenu, {
      user: null,
      onLogout: () => {},
      role: "Proposal manager",
      googleClientId: "",
      onCredentialSuccess: () => {},
    })
  );
  assert.ok(unauthedHtml.includes("topbar-user-menu"));
  assert.ok(unauthedHtml.includes("Sign in"));

  const authedHtml = renderToString(
    React.createElement(TopbarUserMenu, {
      user: {
        id: "google-123",
        name: "Alex Chen",
        email: "alex.chen@acme-corp.com",
        picture: "https://lh3.googleusercontent.com/a/test",
      },
      onLogout: () => {},
      role: "Security SME",
      googleClientId: "test-client-id",
      onCredentialSuccess: () => {},
    })
  );
  assert.ok(authedHtml.includes("topbar-user-menu"));
  assert.ok(authedHtml.includes("avatar"));
  assert.ok(authedHtml.includes("avatar-img"));
});

test("Component Sanity: AdminTabsNav renders all 5 admin navigation tabs", () => {
  const html = renderToString(
    React.createElement(AdminTabsNav, {
      currentTab: "team",
      onSelectTab: () => {},
    })
  );
  assert.ok(html.includes("admin-tabs-nav"));
  assert.ok(html.includes("Team &amp; RBAC") || html.includes("Team & RBAC"));
  assert.ok(html.includes("Workflow &amp; Governance") || html.includes("Workflow & Governance"));
  assert.ok(html.includes("AI &amp; Models") || html.includes("AI & Models"));
  assert.ok(html.includes("Security &amp; SSO") || html.includes("Security & SSO"));
  assert.ok(html.includes("Data &amp; Storage") || html.includes("Data & Storage"));
});

test("Component Sanity: AdminMembersTable and AdminPermissionsMatrix render properly", () => {
  const mockRoles = [
    {
      id: "role-1",
      name: "Proposal Drafter",
      icon: "👤",
      description: "Default drafter",
      workflow_type: "sequential" as const,
      is_builtin: true,
      permissions: { create_rfp: true, edit_draft: true, ai_generate: true, stage_advance: false, manage_kb: false, reset_data: false },
    },
    {
      id: "role-2",
      name: "Security SME",
      icon: "🛡️",
      description: "Infosec approver",
      workflow_type: "sequential" as const,
      is_builtin: true,
      permissions: { create_rfp: false, edit_draft: true, ai_generate: true, stage_advance: true, manage_kb: true, reset_data: false },
    },
  ];

  const mockMembers = [
    {
      id: "mem-1",
      name: "Dipesh Singh",
      email: "dipesh@example.com",
      role: "Proposal Drafter",
      is_google_sso: true,
      last_active: "2026-09-19T10:00:00Z",
      tenant_id: "acme-corp",
    },
  ];

  const tableHtml = renderToString(
    React.createElement(AdminMembersTable, {
      members: mockMembers,
      roles: mockRoles,
      onRoleChange: () => {},
    })
  );
  assert.ok(tableHtml.includes("admin-table"));
  assert.ok(tableHtml.includes("Dipesh Singh"));
  assert.ok(tableHtml.includes("Google SSO"));

  const matrixHtml = renderToString(
    React.createElement(AdminPermissionsMatrix, {
      roles: mockRoles,
    })
  );
  assert.ok(matrixHtml.includes("permissions-matrix-card"));
  assert.ok(matrixHtml.includes("Role Capabilities Matrix"));
  assert.ok(matrixHtml.includes("Create RFPs &amp; Upload Specs") || matrixHtml.includes("Create RFPs & Upload Specs"));
});

test("Component Sanity: AdminGovernanceTab displays workflow modes and SME routing", () => {
  const html = renderToString(
    React.createElement(AdminGovernanceTab, {
      governance: {
        workflow_mode: "waterfall",
        security_sme_email: "sec@acme.com",
        legal_reviewer_email: "legal@acme.com",
        finance_sme_email: "finance@acme.com",
        auto_promote_golden_qa: true,
        continuous_learning_enabled: true,
        allowed_domains: "acme-corp.com",
        session_timeout_minutes: 120,
      },
      onSave: () => {},
      saveNotice: "Settings saved",
    })
  );
  assert.ok(html.includes("admin-tab-content"));
  assert.ok(html.includes("Strict Waterfall"));
  assert.ok(html.includes("Parallel Multi-SME"));
  assert.ok(html.includes("Hybrid Routing"));
  assert.ok(html.includes("Active Engine"));
  assert.ok(html.includes("Settings saved"));
});

test("Component Sanity: LandingAuthGate renders authentication gate when user is not logged in", () => {
  const html = renderToString(
    React.createElement(LandingAuthGate, {
      googleClientId: "test-client-id",
      onCredentialSuccess: () => {},
    })
  );
  assert.ok(html.includes("auth-gate-container"));
  assert.ok(html.includes("Sign in to RFPEngine"));
  assert.ok(html.includes("Enterprise Access Control"));
  assert.ok(html.includes("Grounded AI Synthesis"));
  assert.ok(html.includes("Enterprise RBAC Governance"));
});


