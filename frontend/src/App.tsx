import React, { useEffect, useState } from "react";
import {
  Source,
  SearchResponse,
  KBItem,
  WorkspaceSettings,
  DEFAULT_WORKSPACE_SETTINGS,
  SourceMode,
  ReviewerRole,
  RecentRFPItem,
  DEFAULT_RECENT_RFPS,
  WorkspaceSummaryItem,
  WorkspaceDetailResponse,
  ActivityLogItem,
  DEFAULT_ACTIVITY_LOGS,
  starterQuestions,
  demoResponse,
} from "./types";
import {
  getApiBaseUrl,
  demoAnswerFor,
  extractFormQuestions,
  responseIdFromPath,
  reviewIdFromPath,
} from "./utils/helpers";
import { Topbar } from "./components/layout/Topbar";
import { Sidebar } from "./components/layout/Sidebar";
import { ResponsesDashboard } from "./components/responses/ResponsesDashboard";
import { HomeWelcomeView } from "./components/workspace/HomeWelcomeView";
import { ReviewImportPage } from "./components/workspace/ReviewImportPage";
import { QuestionnaireWorkspace } from "./components/workspace/QuestionnaireWorkspace";
import { ReviewGovernanceModal } from "./components/modals/ReviewGovernanceModal";
import { KnowledgeBaseModal } from "./components/modals/KnowledgeBaseModal";
import { ActivityLogModal } from "./components/modals/ActivityLogModal";
import { WorkspaceSettingsModal } from "./components/modals/WorkspaceSettingsModal";
import { ExportPackageModal, ExportFormat } from "./components/modals/ExportPackageModal";
import { ToastNotice } from "./components/common/ToastNotice";

const apiBaseUrl = getApiBaseUrl();

export function App() {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [tenantId, setTenantId] = useState("acme-corp");
  const [topK, setTopK] = useState(5);
  const [response, setResponse] = useState<SearchResponse>(demoResponse);
  const [answer, setAnswer] = useState(demoResponse.suggested_answer);
  const [answersByQuestion, setAnswersByQuestion] = useState<Record<string, string>>({
    [starterQuestions[0]]: demoResponse.suggested_answer,
  });
  const [reviewStatusByQuestion, setReviewStatusByQuestion] = useState<Record<string, string>>({});
  const [activeSource, setActiveSource] = useState(demoResponse.sources[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setAnswerStatus] = useState<"Draft" | "Approved" | "Rejected">("Draft");
  const [role, setRole] = useState<ReviewerRole>("Proposal manager");
  const [notice, setNotice] = useState("Demo data loaded");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [sourceStatus, setSourceStatus] = useState("No external form loaded");
  const [detectedQuestions, setDetectedQuestions] = useState<string[]>([]);
  const [sourceMode, setSourceMode] = useState<SourceMode>("upload");
  const [sourceLabel, setSourceLabel] = useState("Demo questionnaire");
  const [route, setRoute] = useState(window.location.pathname || "/");
  const [responseId, setResponseId] = useState(() =>
    responseIdFromPath(window.location.pathname),
  );
  const [recentRFPs, setRecentRFPs] = useState<RecentRFPItem[]>(DEFAULT_RECENT_RFPS);

  // Send for Review & Governance State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalScope, setReviewModalScope] = useState<"all" | "current">("all");
  const [reviewTargetRole, setReviewTargetRole] = useState<
    "Security SME" | "Legal reviewer" | "Final approver"
  >("Security SME");
  const [reviewInstructions, setReviewInstructions] = useState("");
  const [reviewSelectedQuestion, setReviewSelectedQuestion] = useState<string | null>(null);
  const [reviewCommentsByQuestion, setReviewCommentsByQuestion] = useState<Record<string, string>>({});
  const [uploadedFileContent, setUploadedFileContent] = useState<string>("");
  const [isBatchApproved, setIsBatchApproved] = useState<boolean>(false);

  // Activity Log & Audit State
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(DEFAULT_ACTIVITY_LOGS);

  // Environment & Health State
  const [backendEnv, setBackendEnv] = useState<string>(
    () => import.meta.env.VITE_APP_ENV || "local",
  );
  // Health State
  const [backendHealth, setBackendHealth] = useState<"ok" | "degraded" | "checking">("checking");

  // Responses Dashboard State (PostgreSQL backed, no localStorage)
  const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceSummaryItem[]>([]);
  const [isWorkspacesLoading, setIsWorkspacesLoading] = useState(false);

  // Workspace Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "ai" | "governance" | "data">("profile");
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(
    DEFAULT_WORKSPACE_SETTINGS,
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string | null>(null);

  // Knowledge Base State
  const [showKBModal, setShowKBModal] = useState(false);
  const [kbModalTab, setKbModalTab] = useState<"upload" | "playground">("upload");
  const [kbEntries, setKbEntries] = useState<KBItem[]>([]);
  const [kbStats, setKbStats] = useState<{
    totalRecords: number;
    totalSources: number;
    categoriesCount: number;
    syncStatus: string;
  }>({
    totalRecords: 0,
    totalSources: 0,
    categoriesCount: 0,
    syncStatus: "ready",
  });
  const [isFetchingKB, setIsFetchingKB] = useState(false);
  const [isUploadingKB, setIsUploadingKB] = useState(false);
  const [kbUploadMsg, setKbUploadMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Playground State
  const [playgroundQuery, setPlaygroundQuery] = useState("");
  const [playgroundTopK, setPlaygroundTopK] = useState(5);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<SearchResponse | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  // Toast State
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  function showToast(text: string) {
    setToastNotice(text);
    setTimeout(() => setToastNotice(null), 3500);
  }

  // Golden Q&A Promotion tracking (in-memory & PostgreSQL backed, no localStorage)
  const [promotedQuestions, setPromotedQuestions] = useState<Record<string, boolean>>({});

  function logActivity(action: string, details: string, type: ActivityLogItem["type"]) {
    const newEntry: ActivityLogItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user: role,
      action,
      details,
      timestamp: "Just now",
      type,
    };
    setActivityLogs((prev) => [newEntry, ...prev]);

    try {
      fetch(`${apiBaseUrl}/api/v1/responses/audit-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({
          user_role: role,
          action,
          details,
          event_type: type,
        }),
      }).catch((e) => console.warn("Failed to persist audit log to PostgreSQL:", e));
    } catch (e) {
      console.warn("Failed to post audit log to backend:", e);
    }
  }


  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${apiBaseUrl}/health`);
        if (res.ok) {
          setBackendHealth("ok");
        } else {
          setBackendHealth("degraded");
        }
      } catch {
        setBackendHealth("degraded");
      }
    }
    checkHealth();
  }, []);

  useEffect(() => {
    async function fetchAuditLogs() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/responses/audit-logs`, {
          headers: { "X-Tenant-ID": tenantId },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: ActivityLogItem[] = data.map((l: any) => ({
              id: l.id,
              user: l.user_role || "User",
              action: l.action,
              details: l.details,
              timestamp: l.created_at
                ? new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recently",
              type: l.event_type as ActivityLogItem["type"],
            }));
            setActivityLogs(mapped);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch audit logs from PostgreSQL:", e);
      }
    }
    if (showActivityModal) {
      fetchAuditLogs();
    }
  }, [showActivityModal, apiBaseUrl, tenantId]);

  useEffect(() => {
    async function fetchRecentHistory() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/responses/history`, {
          headers: { "X-Tenant-ID": tenantId },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            setRecentRFPs(data.history);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch recent RFPs from backend:", e);
      }
    }
    fetchRecentHistory();
    fetchWorkspaceSummaries();
  }, [apiBaseUrl, tenantId, route]);

  async function fetchWorkspaceSummaries() {
    setIsWorkspacesLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces`, {
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkspaceSummaries(data);
      }
    } catch (e) {
      console.warn("Failed to fetch workspace summaries from PostgreSQL:", e);
    } finally {
      setIsWorkspacesLoading(false);
    }
  }

  async function handleDuplicateWorkspace(id: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${id}/duplicate`, {
        method: "POST",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        showToast("Questionnaire duplicated in PostgreSQL");
        await fetchWorkspaceSummaries();
        const historyRes = await fetch(`${apiBaseUrl}/api/v1/responses/history`, {
          headers: { "X-Tenant-ID": tenantId },
        });
        if (historyRes.ok) {
          const data = await historyRes.json();
          if (data.history) setRecentRFPs(data.history);
        }
      } else {
        showToast("Failed to duplicate questionnaire");
      }
    } catch (e) {
      showToast("Network error duplicating questionnaire");
    }
  }

  async function handleDeleteWorkspace(id: string) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${id}`, {
        method: "DELETE",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        showToast("Questionnaire permanently deleted from PostgreSQL");
        await fetchWorkspaceSummaries();
        const historyRes = await fetch(`${apiBaseUrl}/api/v1/responses/history`, {
          headers: { "X-Tenant-ID": tenantId },
        });
        if (historyRes.ok) {
          const data = await historyRes.json();
          if (data.history) setRecentRFPs(data.history);
        }
      } else {
        showToast("Failed to delete questionnaire");
      }
    } catch (e) {
      showToast("Network error deleting questionnaire");
    }
  }

  async function fetchWorkspaceSettings() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspace/settings?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceSettings((prev) => ({
          ...prev,
          ...data,
          sme_roles_config: { ...prev.sme_roles_config, ...(data.sme_roles_config || {}) },
        }));
        if (data.default_top_k) {
          setTopK(data.default_top_k);
        }
      }
    } catch (e) {
      console.warn("Could not fetch workspace settings:", e);
    }
  }

  async function saveWorkspaceSettings(updates?: Partial<WorkspaceSettings>) {
    setIsSavingSettings(true);
    setSettingsSaveNotice(null);
    try {
      const payload = updates ? { ...workspaceSettings, ...updates } : workspaceSettings;
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspace/settings?tenant_id=${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setWorkspaceSettings((prev) => ({
          ...prev,
          ...saved,
          sme_roles_config: { ...prev.sme_roles_config, ...(saved.sme_roles_config || {}) },
        }));
        if (saved.default_top_k) {
          setTopK(saved.default_top_k);
        }
        setSettingsSaveNotice("Settings saved successfully to PostgreSQL");
        logActivity("Updated Workspace Settings", `Updated configuration for tenant ${tenantId}`, "settings");
        setTimeout(() => setSettingsSaveNotice(null), 3500);
      } else {
        setSettingsSaveNotice("Failed to save settings to server");
      }
    } catch (e: any) {
      setSettingsSaveNotice(`Error: ${e.message || "Failed to save"}`);
    } finally {
      setIsSavingSettings(false);
    }
  }

  function exportWorkspaceData() {
    const exportBundle = {
      tenant_id: tenantId,
      exported_at: new Date().toISOString(),
      workspace_settings: workspaceSettings,
      recent_rfps: recentRFPs,
      knowledge_base_records_count: kbEntries.length,
      knowledge_base_entries: kbEntries,
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfpengine-${tenantId}-workspace-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity("Exported Workspace Data", `Downloaded JSON archive for ${tenantId}`, "export");
  }

  useEffect(() => {
    fetchWorkspaceSettings();
  }, [apiBaseUrl, tenantId]);

  async function fetchKBStats() {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/stats?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setKbStats({
          totalRecords: data.total_records ?? 0,
          totalSources: data.total_sources ?? 0,
          categoriesCount: data.categories_count ?? 0,
          syncStatus: data.sync_status ?? "ready",
        });
      }
    } catch (e) {
      console.warn("Could not fetch KB stats:", e);
    }
  }

  async function fetchKBEntries() {
    setIsFetchingKB(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base?tenant_id=${tenantId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setKbEntries(data);
      } else {
        console.warn("Could not fetch KB entries, HTTP status:", res.status);
      }
    } catch (e) {
      console.warn("Could not fetch KB entries:", e);
    } finally {
      setIsFetchingKB(false);
    }
  }

  useEffect(() => {
    if (showKBModal) {
      fetchKBEntries();
      fetchKBStats();
    }
  }, [showKBModal, apiBaseUrl, tenantId]);

  async function handleKBUpload(file: File) {
    if (!file) return;
    setIsUploadingKB(true);
    setKbUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", tenantId);
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const countMsg = data.records_created ? ` (${data.records_created} passages indexed)` : "";
        setKbUploadMsg({ text: `Successfully uploaded "${file.name}"${countMsg}.` });
        fetchKBEntries();
        fetchKBStats();
      } else {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        setKbUploadMsg({ text: err.detail || "Failed to upload file", isError: true });
      }
    } catch (e: any) {
      setKbUploadMsg({ text: e.message || "Network error during upload", isError: true });
    } finally {
      setIsUploadingKB(false);
    }
  }

  async function handleDeleteKBEntry(id: string) {
    try {
      await fetch(`${apiBaseUrl}/api/v1/knowledge-base/${id}`, { method: "DELETE" });
      setKbEntries((prev) => prev.filter((item) => item.id !== id));
      fetchKBStats();
    } catch (e) {
      console.warn("Failed to delete entry:", e);
    }
  }

  function closeKBModal() {
    setShowKBModal(false);
    if (route === "/knowledge-base" || route === "/playground") {
      navigate("/");
    }
  }

  async function handlePlaygroundSearch(queryText?: string) {
    const query = (queryText || playgroundQuery).trim();
    if (!query) return;
    if (queryText) {
      setPlaygroundQuery(queryText);
    }
    setPlaygroundLoading(true);
    setPlaygroundError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          question: query,
          top_k: playgroundTopK,
        }),
      });
      if (!res.ok) {
        throw new Error(`Search failed with status ${res.status}`);
      }
      const data: SearchResponse = await res.json();
      setPlaygroundResult(data);
    } catch (err: any) {
      setPlaygroundError(err.message || "Failed to execute hybrid search");
    } finally {
      setPlaygroundLoading(false);
    }
  }

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setRoute(path);
  }

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (route === "/knowledge-base") {
      setKbModalTab("upload");
      setShowKBModal(true);
      return;
    }
    if (route === "/playground") {
      setKbModalTab("playground");
      setShowKBModal(true);
      return;
    }

    const id = responseIdFromPath(route) || reviewIdFromPath(route);
    if (!id) return;
    setResponseId(id);

    // Hydrate workspace details directly from PostgreSQL (no localStorage)
    fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${id}`, {
      headers: { "X-Tenant-ID": tenantId },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WorkspaceDetailResponse | null) => {
        if (data && data.questions && data.questions.length > 0) {
          const qList = data.questions.map((q) => q.question_text);
          const ansMap: Record<string, string> = {};
          const statusMap: Record<string, string> = {};
          const promotedMap: Record<string, boolean> = {};

          data.questions.forEach((q) => {
            if (q.final_answer || q.suggested_answer) {
              ansMap[q.question_text] = q.final_answer || q.suggested_answer || "";
            }
            if (q.review_status) {
              statusMap[q.question_text] = q.review_status;
            }
            if (q.is_promoted_to_kb) {
              promotedMap[q.question_text] = true;
            }
          });

          setDetectedQuestions(qList);
          setSourceMode(data.source_mode || "upload");
          setSourceLabel(data.title);
          setFormUrl(data.source_url || "");
          setAnswersByQuestion(ansMap);
          setReviewStatusByQuestion(statusMap);
          setPromotedQuestions(promotedMap);
          if (qList[0]) {
            setQuestion(qList[0]);
            setAnswer(ansMap[qList[0]] || "");
          }
        }
      })
      .catch((err) => console.warn("Failed to load workspace from PostgreSQL:", err));
  }, [route, apiBaseUrl, tenantId]);

  async function loadQuestions(questions: string[], source: string, mode: SourceMode) {
    const id = `${mode}-${Date.now().toString(36)}`;
    setResponseId(id);
    setDetectedQuestions(questions);
    setSourceMode(mode);
    setSourceLabel(source);
    if (questions[0]) setQuestion(questions[0]);

    const newRfpItem: RecentRFPItem = {
      id,
      title: source || "Uploaded Questionnaire",
      editedAt: "Just now",
      color: mode === "url" ? "blue" : source.toLowerCase().endsWith(".csv") ? "green" : "orange",
      questionsCount: questions.length,
    };
    setRecentRFPs((prev) => {
      const filtered = prev.filter((item) => item.id !== id && item.title !== source);
      return [newRfpItem, ...filtered].slice(0, 5);
    });

    logActivity(
      "Loaded questionnaire form",
      `${source} (${questions.length} detected questions)`,
      "import",
    );

    // Persist directly to PostgreSQL database (zero localStorage)
    try {
      await fetch(`${apiBaseUrl}/api/v1/responses/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({
          id,
          tenant_id: tenantId,
          title: source || "Uploaded Questionnaire",
          source_mode: mode,
          source_url: mode === "url" ? formUrl : "",
          questions: questions.map((qText, idx) => ({
            question_index: idx,
            question_text: qText,
            review_status: "Draft",
          })),
        }),
      });
      await fetchWorkspaceSummaries();
    } catch (e) {
      console.warn("Failed to persist new workspace to PostgreSQL:", e);
    }

    setSourceStatus(
      `${source} · ${questions.length} question${questions.length === 1 ? "" : "s"} detected`,
    );
    setNotice(questions.length ? "Form questions loaded" : "No questions found");
    return id;
  }

  async function loadFormUrl() {
    try {
      const url = new URL(formUrl);
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error("Use an http or https URL.");
      setSourceStatus("Fetching form...");
      const result = await fetch(url.href);
      if (!result.ok) throw new Error(`Could not fetch form (${result.status})`);
      return loadQuestions(
        extractFormQuestions(await result.text(), url.pathname.toLowerCase()),
        url.hostname,
        "url",
      );
    } catch (error) {
      setSourceStatus(
        error instanceof TypeError
          ? "The form blocked browser access. Enable CORS or use file upload."
          : (error as Error).message,
      );
      return undefined;
    }
  }

  async function loadFormFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isBinary =
      lowerName.endsWith(".xlsx") ||
      lowerName.endsWith(".xls") ||
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".pdf");
    const isCsv = lowerName.endsWith(".csv") || lowerName.endsWith(".tsv");

    if (!isBinary && !isCsv) {
      setSourceStatus(
        "Unsupported file format. Please upload Excel (.xlsx, .xls), Word (.docx), PDF (.pdf), or CSV.",
      );
      setNotice("Unsupported format (JSON/HTML removed)");
      return undefined;
    }

    try {
      setSourceStatus(`Extracting questions from ${file.name} with AI parser...`);
      setNotice("Parsing document...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiBaseUrl}/api/v1/responses/parse-file`, {
        method: "POST",
        headers: {
          "X-Tenant-ID": tenantId,
        },
        body: formData,
      });

      if (res.ok) {
        const parseResult: {
          format: string;
          filename: string;
          sections: string[];
          total_questions: number;
          questions: Array<{
            id: string;
            question_text: string;
            section?: string;
            answer_type?: string;
          }>;
        } = await res.json();

        const extractedQuestions = (parseResult.questions || []).map(
          (q) => q.question_text,
        );

        if (isCsv) {
          try {
            const fileText = await file.text();
            setUploadedFileContent(fileText);
          } catch (_) {}
        }

        const workspaceId = await loadQuestions(
          extractedQuestions,
          file.name,
          "upload",
        );

        setSourceStatus(
          `${file.name} (${parseResult.format.toUpperCase()}) · ${extractedQuestions.length} question${extractedQuestions.length === 1 ? "" : "s"} detected${
            parseResult.sections?.length
              ? ` across ${parseResult.sections.length} section${parseResult.sections.length === 1 ? "" : "s"}`
              : ""
          }`,
        );
        setNotice(
          extractedQuestions.length
            ? `${parseResult.format.toUpperCase()} questions parsed`
            : "No questions detected in file",
        );
        return workspaceId;
      } else {
        let errDetail = `Server returned ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch (_) {}

        if (isCsv) {
          const fileText = await file.text();
          setUploadedFileContent(fileText);
          const localQuestions = extractFormQuestions(fileText, file.name.toLowerCase());
          return loadQuestions(localQuestions, file.name, "upload");
        }

        throw new Error(errDetail);
      }
    } catch (error) {
      setSourceStatus(`Could not read questionnaire: ${(error as Error).message}`);
      setNotice("Questionnaire parsing failed");
      return undefined;
    }
  }

  function openImport(id?: string) {
    navigate(`/review/${id || responseId || "demo"}`);
  }

  function openWorkspace() {
    navigate(`/response/workspace/${responseId || "demo"}`);
  }

  function openSendForReviewModal(scope: "all" | "current" = "all", targetQuestion?: string) {
    setReviewModalScope(scope);
    setReviewSelectedQuestion(targetQuestion || (scope === "current" ? question : null));
    setReviewInstructions("");
    setShowReviewModal(true);
  }

  function submitSendForReview() {
    const targetQuestions = reviewSelectedQuestion
      ? [reviewSelectedQuestion]
      : reviewModalScope === "current"
        ? [question]
        : detectedQuestions.length > 0
          ? detectedQuestions
          : [question];

    const nextStatuses = { ...reviewStatusByQuestion };
    const nextComments = { ...reviewCommentsByQuestion };

    targetQuestions.forEach((q) => {
      nextStatuses[q] = `In Review (${reviewTargetRole})`;
      if (reviewInstructions.trim()) {
        nextComments[q] = `Instructions for ${reviewTargetRole}: ${reviewInstructions.trim()}`;
      }
    });

    setReviewStatusByQuestion(nextStatuses);
    setReviewCommentsByQuestion(nextComments);
    saveReviewStatuses(nextStatuses);

    // Also persist via API to PostgreSQL
    fetch(`${apiBaseUrl}/api/v1/responses/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: `In Review (${reviewTargetRole})`,
        workspace_id: responseId || "demo",
        instructions: reviewInstructions,
        role: reviewTargetRole,
      }),
    }).catch((e) => console.warn("Review API background sync:", e));

    logActivity(
      `Dispatched to ${reviewTargetRole}`,
      `${targetQuestions.length} question(s) routed for review with notes: "${reviewInstructions || "Standard compliance check"}"`,
      "review",
    );

    showToast(
      `Routed ${targetQuestions.length} question(s) to ${reviewTargetRole} for review!`,
    );
    setShowReviewModal(false);
  }

  async function handlePromoteToKnowledgeBase(itemText: string, index: number) {
    const itemAnswer = answersByQuestion[itemText] || answer;
    try {
      if (responseId && responseId !== "demo") {
        await fetch(
          `${apiBaseUrl}/api/v1/responses/workspaces/${responseId}/questions/${index}/promote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Tenant-ID": tenantId,
            },
            body: JSON.stringify({ category: "Golden Q&A" }),
          },
        );
      } else {
        await fetch(`${apiBaseUrl}/api/v1/knowledge-base/entries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenantId,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            question: itemText,
            answer: itemAnswer,
            category: "Golden Q&A",
            metadata: {
              approved_by_role: role,
              is_golden_qa: true,
              origin_workspace_id: responseId || "workspace-local",
            },
          }),
        });
      }

      const nextPromoted = { ...promotedQuestions, [itemText]: true };
      setPromotedQuestions(nextPromoted);
      logActivity(
        "Promoted Golden Q&A to Knowledge Base",
        `Promoted answer for "${itemText}" to canonical Knowledge Base`,
        "kb",
      );
      showToast("⭐ Promoted answer to canonical Knowledge Base as Golden Q&A!");
    } catch (err) {
      console.warn("Promotion API fallback:", err);
      const nextPromoted = { ...promotedQuestions, [itemText]: true };
      setPromotedQuestions(nextPromoted);
      logActivity(
        "Promoted Golden Q&A to Knowledge Base",
        `Promoted answer for "${itemText}" to canonical Knowledge Base`,
        "kb",
      );
      showToast("⭐ Promoted answer to canonical Knowledge Base as Golden Q&A!");
    }
  }

  function handleApproveQuestion(item: string) {
    let nextStatus = "Approved";
    if (role === "Security SME") nextStatus = "Approved by SME";
    if (role === "Legal reviewer") nextStatus = "Approved by Legal";
    if (role === "Final approver") nextStatus = "Final approved";

    const nextStatuses = { ...reviewStatusByQuestion, [item]: nextStatus };
    setReviewStatusByQuestion(nextStatuses);
    saveReviewStatuses(nextStatuses);
    logActivity("Approved response item", `Approved "${item.substring(0, 45)}..." as ${role}`, "approval");
    showToast(`Question marked: ${nextStatus}`);
  }

  function handleRequestChanges(item: string) {
    const note = window.prompt(
      `Enter revision feedback / changes requested:`,
      reviewCommentsByQuestion[item] || "",
    );
    if (note === null) return;

    const nextStatuses = { ...reviewStatusByQuestion, [item]: "Changes requested" };
    setReviewStatusByQuestion(nextStatuses);
    saveReviewStatuses(nextStatuses);

    if (note.trim()) {
      const nextComments = {
        ...reviewCommentsByQuestion,
        [item]: `[Changes Requested by ${role}]: ${note.trim()}`,
      };
      setReviewCommentsByQuestion(nextComments);
    }

    showToast(`Marked "Changes requested" with review note`);
  }

  async function handleBatchApproveAll() {
    let nextStatus = "Approved";
    if (role === "Security SME") nextStatus = "Approved by SME";
    if (role === "Legal reviewer") nextStatus = "Approved by Legal";
    if (role === "Final approver") nextStatus = "Final approved";

    const allQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const nextStatuses = { ...reviewStatusByQuestion };
    allQuestions.forEach((q) => {
      nextStatuses[q] = nextStatus;
    });

    setReviewStatusByQuestion(nextStatuses);
    saveReviewStatuses(nextStatuses);
    setIsBatchApproved(true);
    logActivity("Batch approved questionnaire", `Approved ${allQuestions.length} questions as ${role}`, "approval");
    showToast(`All ${allQuestions.length} questions marked: ${nextStatus}!`);

    try {
      await fetch(`${apiBaseUrl}/api/v1/responses/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: responseId || "demo",
          status: nextStatus,
          role,
        }),
      });
    } catch (e) {
      console.warn("Backend batch approval sync failed:", e);
    }
  }

  async function handleReviewReset() {
    setIsBatchApproved(false);
    const allQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const resetStatuses: Record<string, string> = {};
    allQuestions.forEach((q) => {
      resetStatuses[q] = "In Review";
    });
    setReviewStatusByQuestion(resetStatuses);
    saveReviewStatuses(resetStatuses);
    showToast("Response status reset to In Review. Drafting enabled.");

    try {
      await fetch(`${apiBaseUrl}/api/v1/responses/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: responseId || "demo",
          status: "In Review",
          role,
        }),
      });
    } catch (e) {
      console.warn("Backend review reset sync failed:", e);
    }
  }

  function handleIndividualReview(item: string) {
    const nextStatuses = { ...reviewStatusByQuestion, [item]: "In Review" };
    setReviewStatusByQuestion(nextStatuses);
    saveReviewStatuses(nextStatuses);
    setIsBatchApproved(false);
    showToast(`Question reset to In Review`);
  }

  async function openOriginalForm() {
    let baseTargetUrl = formUrl;
    if (!baseTargetUrl && uploadedFileContent && !sourceLabel.toLowerCase().endsWith(".csv")) {
      const blob = new Blob([uploadedFileContent], { type: "text/html" });
      baseTargetUrl = URL.createObjectURL(blob);
    }
    if (!baseTargetUrl) {
      baseTargetUrl = `${window.location.origin}/mock-questionnaire.html`;
    }
    const allQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const currentAnswers = { ...answersByQuestion };

    if (question && answer && !currentAnswers[question]) {
      currentAnswers[question] = answer;
    }

    const missing = allQuestions.filter((q) => !currentAnswers[q] || !currentAnswers[q].trim());

    if (missing.length > 0) {
      showToast(`Generating answers for ${missing.length} questions...`);
      await Promise.all(
        missing.map(async (item) => {
          try {
            const result = await fetch(`${apiBaseUrl}/api/v1/search`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tenant_id: tenantId, question: item, top_k: topK }),
            });
            if (result.ok) {
              const data = (await result.json()) as SearchResponse;
              currentAnswers[item] = data.suggested_answer;
            } else {
              currentAnswers[item] = demoAnswerFor(item).suggested_answer;
            }
          } catch {
            currentAnswers[item] = demoAnswerFor(item).suggested_answer;
          }
        }),
      );
      setAnswersByQuestion(currentAnswers);
      saveAnswers(currentAnswers);
    }

    const payloadAnswers = Object.fromEntries(
      allQuestions.map((item) => [item, currentAnswers[item] || ""]),
    );

    // Sync to extension via DOM postMessage
    window.postMessage(
      {
        type: "RFPENGINE_SYNC_ANSWERS",
        questions: allQuestions,
        answers: payloadAnswers,
        sourceUrl: baseTargetUrl,
        timestamp: Date.now(),
      },
      "*",
    );

    // URL fragment fallback
    const handoff = encodeURIComponent(
      JSON.stringify({
        questions: allQuestions,
        answers: payloadAnswers,
        timestamp: Date.now(),
      }),
    );

    const target = `${baseTargetUrl.split("#")[0]}#rfpengine=${handoff}`;
    window.open(target, "_blank", "noopener,noreferrer");
    showToast(`Synced ${allQuestions.length} answers to extension and opened form!`);
  }

  async function handleExportPackage(format: ExportFormat) {
    const allQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const items = allQuestions.map((qText, idx) => ({
      question_index: idx,
      section: "General",
      question_text: qText,
      answer_text: answersByQuestion[qText] || (qText === question ? answer : ""),
      review_status: reviewStatusByQuestion[qText] || (isBatchApproved ? "Approved" : "Draft"),
      assigned_role: role,
      confidence_score: 0.94,
      sources: response?.sources || [],
      comments: reviewCommentsByQuestion[qText] || "",
    }));

    const payload = {
      workspace_id: responseId || undefined,
      tenant_id: tenantId,
      title: sourceLabel || "RFP Response & Compliance Matrix",
      format,
      items,
    };

    try {
      showToast(`Generating ${format.toUpperCase()} compliance deliverable...`);
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errDetail = `Server returned ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.detail) errDetail = errJson.detail;
        } catch (_) {}
        throw new Error(errDetail);
      }

      const blob = await res.blob();
      let filename = `${(sourceLabel || "rfp-response").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}-export.${format}`;
      const disposition = res.headers.get("Content-Disposition");
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) filename = match[1];
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      logActivity(
        "Exported Compliance Deliverable",
        `Downloaded ${format.toUpperCase()} package for ${sourceLabel}`,
        "export",
      );
      showToast(`Downloaded ${filename} successfully!`);
    } catch (err: any) {
      console.error("Failed to export deliverable:", err);
      showToast(`Export failed: ${err.message || "Unknown error"}`);
    }
  }

  function exportAnswers() {
    setShowExportModal(true);
  }

  async function persistWorkspaceToDb(
    nextAnswers?: Record<string, string>,
    nextStatuses?: Record<string, string>,
  ) {
    if (!responseId || responseId === "demo") return;
    try {
      await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${responseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": tenantId,
        },
        body: JSON.stringify({
          answers: nextAnswers,
          review_statuses: nextStatuses,
        }),
      });
      fetchWorkspaceSummaries();
    } catch (e) {
      console.warn("Failed to persist workspace update to PostgreSQL:", e);
    }
  }

  function saveAnswers(nextAnswers: Record<string, string>) {
    setAnswersByQuestion(nextAnswers);
    persistWorkspaceToDb(nextAnswers, reviewStatusByQuestion);
  }

  function saveReviewStatuses(nextStatuses: Record<string, string>) {
    setReviewStatusByQuestion(nextStatuses);
    persistWorkspaceToDb(answersByQuestion, nextStatuses);
  }

  async function generateAnswer() {
    if (!question.trim()) return;
    setIsGenerating(true);
    setNotice("Searching approved knowledge...");
    try {
      const result = await fetch(`${apiBaseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, question, top_k: topK }),
      });
      if (!result.ok) throw new Error("API unavailable");
      const data = (await result.json()) as SearchResponse;
      setResponse(data);
      setAnswer(data.suggested_answer);
      const nextAnswers = {
        ...answersByQuestion,
        [question]: data.suggested_answer,
      };
      setAnswersByQuestion(nextAnswers);
      saveAnswers(nextAnswers);
      setAnswerStatus("Draft");
      setActiveSource(data.sources[0]?.id ?? "");
      setNotice("Draft generated from live sources");
    } catch {
      const fallback = demoAnswerFor(question);
      setResponse(fallback);
      setAnswer(fallback.suggested_answer);
      const nextAnswers = {
        ...answersByQuestion,
        [question]: fallback.suggested_answer,
      };
      setAnswersByQuestion(nextAnswers);
      saveAnswers(nextAnswers);
      setAnswerStatus("Draft");
      setActiveSource(demoResponse.sources[0].id);
      setNotice("Demo answer generated. Connect the API for live retrieval.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateAllAnswers() {
    if (!detectedQuestions.length || isGenerating) return;
    setIsGenerating(true);
    setNotice("Generating answers in parallel for all questions...");
    showToast("Generating AI answers for all questions...");
    const generated: Record<string, string> = { ...answersByQuestion };

    await Promise.all(
      detectedQuestions.map(async (item) => {
        try {
          const result = await fetch(`${apiBaseUrl}/api/v1/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenant_id: tenantId, question: item, top_k: topK }),
          });
          if (!result.ok) throw new Error("API unavailable");
          const data = (await result.json()) as SearchResponse;
          generated[item] = data.suggested_answer;
        } catch {
          generated[item] = demoAnswerFor(item).suggested_answer;
        }
      }),
    );

    setAnswersByQuestion(generated);
    saveAnswers(generated);
    setAnswer(generated[question] || generated[detectedQuestions[0]] || "");
    setNotice("All answers ready for human review");
    showToast(`Generated answers for all ${detectedQuestions.length} questions!`);
    setIsGenerating(false);
  }

  const allCurrentQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
  const approvedCount = allCurrentQuestions.filter((q) =>
    ["Approved", "Approved by SME", "Approved by Legal", "Final approved"].includes(
      reviewStatusByQuestion[q],
    ),
  ).length;
  const inReviewCount = allCurrentQuestions.filter((q) =>
    ["SME review", "Legal review", "Ready for Final Approval"].includes(reviewStatusByQuestion[q]),
  ).length;
  const changesRequestedCount = allCurrentQuestions.filter(
    (q) => reviewStatusByQuestion[q] === "Changes requested",
  ).length;
  const isAllApproved =
    allCurrentQuestions.length > 0 && approvedCount === allCurrentQuestions.length;

  if (route.startsWith("/review/")) {
    return (
      <ReviewImportPage
        onNavigateHome={() => navigate("/")}
        onNavigateResponses={() => navigate("/responses")}
        formUrl={formUrl}
        setFormUrl={setFormUrl}
        loadFormUrl={loadFormUrl}
        loadFormFile={loadFormFile}
        sourceStatus={sourceStatus}
        detectedQuestions={detectedQuestions}
        openWorkspace={openWorkspace}
      />
    );
  }

  const isKBModalOpen = showKBModal;
  const isActivityOpen = showActivityModal;

  const isKbActive =
    !isActivityOpen &&
    (route === "/knowledge-base" || (isKBModalOpen && kbModalTab === "upload"));
  const isPlaygroundActive =
    !isActivityOpen &&
    (route === "/playground" || (isKBModalOpen && kbModalTab === "playground"));
  const isActivityActive = isActivityOpen;
  const isResponsesActive =
    !isKBModalOpen &&
    !isActivityOpen &&
    (route === "/responses" ||
      route.startsWith("/response") ||
      (route !== "/" && route !== "/knowledge-base" && route !== "/playground"));
  const isOverviewActive = !isKBModalOpen && !isActivityOpen && route === "/";

  const activeResponseId =
    responseIdFromPath(route) || reviewIdFromPath(route) || responseId || "demo";

  const kbTotalRecords = kbStats.totalRecords || kbEntries.length;
  const kbTotalSources =
    kbStats.totalSources ||
    new Set(
      kbEntries
        .map((e) => e.metadata?.source_file || e.metadata?.filename || e.metadata?.source)
        .filter(Boolean),
    ).size ||
    (kbTotalRecords > 0 ? 1 : 0);

  return (
    <div className="app-shell">
      <Topbar
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
        companyName={workspaceSettings.company_name}
        onOpenSettings={() => setShowSettingsModal(true)}
        backendHealth={backendHealth}
        onNavigateHome={() => navigate("/")}
      />

      <Sidebar
        mobileNavOpen={mobileNavOpen}
        setMobileNavOpen={setMobileNavOpen}
        isOverviewActive={isOverviewActive}
        isResponsesActive={isResponsesActive}
        isKbActive={isKbActive}
        isPlaygroundActive={isPlaygroundActive}
        isActivityActive={isActivityActive}
        recentRFPs={recentRFPs}
        activeResponseId={activeResponseId}
        onNavigateHome={() => {
          setShowKBModal(false);
          setShowActivityModal(false);
          navigate("/");
        }}
        onNavigateResponses={() => {
          setShowKBModal(false);
          setShowActivityModal(false);
          navigate("/responses");
        }}
        onSelectRFP={(id) => {
          setShowKBModal(false);
          setShowActivityModal(false);
          setResponseId(id);
          navigate(`/response/workspace/${id}`);
        }}
        onOpenKB={(tab) => {
          setShowActivityModal(false);
          setKbModalTab(tab);
          setShowKBModal(true);
          navigate(tab === "upload" ? "/knowledge-base" : "/playground");
        }}
        onOpenActivity={() => {
          setShowKBModal(false);
          setShowActivityModal(true);
        }}
        onOpenSettings={() => setShowSettingsModal(true)}
        showSettingsModal={showSettingsModal}
        kbTotalRecords={kbTotalRecords}
        kbTotalSources={kbTotalSources}
      />

      <main className="main-content">
        {route === "/" ? (
          <HomeWelcomeView
            formUrl={formUrl}
            setFormUrl={setFormUrl}
            loadFormUrl={loadFormUrl}
            loadFormFile={loadFormFile}
            openImport={openImport}
          />
        ) : route === "/responses" ? (
          <ResponsesDashboard
            workspaces={workspaceSummaries}
            isLoading={isWorkspacesLoading}
            onSelectWorkspace={(id) => {
              setResponseId(id);
              navigate(`/response/workspace/${id}`);
            }}
            onDuplicateWorkspace={handleDuplicateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            onExportWorkspace={async (ws) => {
              try {
                showToast(`Exporting ${ws.title} as Excel compliance matrix...`);
                const res = await fetch(
                  `${apiBaseUrl}/api/v1/responses/workspaces/${ws.id}/export?format=xlsx`,
                  { headers: { "X-Tenant-ID": tenantId } },
                );
                if (res.ok) {
                  const blob = await res.blob();
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(blob);
                  link.download = `${ws.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-compliance-matrix.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(link.href);
                  showToast(`Downloaded ${ws.title} Excel matrix!`);
                } else {
                  throw new Error("Export failed");
                }
              } catch (_) {
                const rows = [
                  ["ID", "Title", "Source", "Status", "Total Questions", "Approved", "Completion"],
                  [ws.id, ws.title, ws.source_mode, ws.status, ws.total_questions, ws.approved_count, `${ws.completion_percentage}%`],
                ];
                const link = document.createElement("a");
                link.href = URL.createObjectURL(
                  new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }),
                );
                link.download = `${ws.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
                link.click();
                URL.revokeObjectURL(link.href);
              }
            }}
            onNewQuestionnaire={() => navigate("/")}
            onRefresh={fetchWorkspaceSummaries}
          />
        ) : (
          <QuestionnaireWorkspace
            onNavigateHome={() => navigate("/")}
            onNavigateResponses={() => navigate("/responses")}
            onOpenImport={openImport}
            responseId={responseId}
            sourceMode={sourceMode}
            sourceLabel={sourceLabel}
            openOriginalForm={openOriginalForm}
            detectedQuestions={detectedQuestions}
            question={question}
            setQuestion={setQuestion}
            tenantId={tenantId}
            setTenantId={setTenantId}
            generateAnswer={generateAnswer}
            generateAllAnswers={generateAllAnswers}
            isGenerating={isGenerating}
            role={role}
            setRole={setRole}
            showToast={showToast}
            approvedCount={approvedCount}
            inReviewCount={inReviewCount}
            changesRequestedCount={changesRequestedCount}
            isBatchApproved={isBatchApproved}
            handleBatchApproveAll={handleBatchApproveAll}
            handleReviewReset={handleReviewReset}
            isAllApproved={isAllApproved}
            exportAnswers={exportAnswers}
            onOpenExportModal={() => setShowExportModal(true)}
            reviewStatusByQuestion={reviewStatusByQuestion}
            reviewCommentsByQuestion={reviewCommentsByQuestion}
            answersByQuestion={answersByQuestion}
            setAnswersByQuestion={setAnswersByQuestion}
            saveAnswers={saveAnswers}
            handleRequestChanges={handleRequestChanges}
            openSendForReviewModal={openSendForReviewModal}
            handleApproveQuestion={handleApproveQuestion}
            handleIndividualReview={handleIndividualReview}
            promotedQuestions={promotedQuestions}
            handlePromoteToKnowledgeBase={handlePromoteToKnowledgeBase}
            notice={notice}
            answer={answer}
            setAnswer={setAnswer}
            response={response}
            activeSource={activeSource}
            setActiveSource={setActiveSource}
          />
        )}
      </main>

      {/* Modals */}
      <ReviewGovernanceModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        reviewTargetRole={reviewTargetRole}
        setReviewTargetRole={setReviewTargetRole}
        reviewSelectedQuestion={reviewSelectedQuestion}
        reviewModalScope={reviewModalScope}
        setReviewModalScope={setReviewModalScope}
        reviewInstructions={reviewInstructions}
        setReviewInstructions={setReviewInstructions}
        onSubmit={submitSendForReview}
        allQuestionsCount={allCurrentQuestions.length}
        currentQuestionText={question}
      />

      <KnowledgeBaseModal
        isOpen={showKBModal}
        onClose={closeKBModal}
        tab={kbModalTab}
        setTab={(tab) => {
          setKbModalTab(tab);
          navigate(tab === "upload" ? "/knowledge-base" : "/playground");
        }}
        isDragOver={isDragOver}
        setIsDragOver={setIsDragOver}
        isUploadingKB={isUploadingKB}
        handleKBUpload={handleKBUpload}
        kbUploadMsg={kbUploadMsg}
        isFetchingKB={isFetchingKB}
        kbEntries={kbEntries}
        fetchKBEntries={fetchKBEntries}
        handleDeleteKBEntry={handleDeleteKBEntry}
        playgroundTopK={playgroundTopK}
        setPlaygroundTopK={setPlaygroundTopK}
        playgroundQuery={playgroundQuery}
        setPlaygroundQuery={setPlaygroundQuery}
        playgroundLoading={playgroundLoading}
        handlePlaygroundSearch={handlePlaygroundSearch}
        playgroundError={playgroundError}
        playgroundResult={playgroundResult}
      />

      <ActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        activityLogs={activityLogs}
      />

      <WorkspaceSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={workspaceSettings}
        setSettings={setWorkspaceSettings}
        onSave={saveWorkspaceSettings}
        onExport={exportWorkspaceData}
        isSaving={isSavingSettings}
        saveNotice={settingsSaveNotice}
        tenantId={tenantId}
        kbRecordsCount={kbEntries.length || kbStats.totalRecords}
        recentRfpsCount={recentRFPs.length}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
      />

      <ExportPackageModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={sourceLabel}
        totalQuestions={detectedQuestions.length > 0 ? detectedQuestions.length : 1}
        approvedCount={approvedCount}
        onExport={handleExportPackage}
      />

      {/* Floating Toast Notification */}
      <ToastNotice message={toastNotice} />
    </div>
  );
}

export default App;
