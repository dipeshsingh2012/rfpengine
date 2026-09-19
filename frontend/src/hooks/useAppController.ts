import { useEffect, useState } from "react";
import { SourceMode, ExtractedQuestionItem, WorkspaceDetailResponse, RecentRFPItem } from "../types";
import { getApiBaseUrl, responseIdFromPath, reviewIdFromPath } from "../utils/helpers";
import { ExportFormat } from "../components/modals/ExportPackageModal";
import { useNavigationRouter } from "./useNavigationRouter";
import { useActivityAndAudit } from "./useActivityAndAudit";
import { useWorkspaceSettingsManager } from "./useWorkspaceSettingsManager";
import { useKnowledgeBaseManager } from "./useKnowledgeBaseManager";
import { useWorkspaceListManager } from "./useWorkspaceListManager";
import { useReviewGovernanceState } from "./useReviewGovernanceState";
import { useQuestionnaireWorkflow } from "./useQuestionnaireWorkflow";
import { useAiAnswerGenerator } from "./useAiAnswerGenerator";
import { useDocumentIngestion } from "./useDocumentIngestion";
import { useGoogleAuth } from "./useGoogleAuth";
import { assembleAppProps } from "./useAppPropsAssembler";

const apiBaseUrl = getApiBaseUrl();

export function useAppController() {
  const [tenantId, setTenantId] = useState("acme-corp");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [revisionItem, setRevisionItem] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [toastNotice, setToastNotice] = useState<string | null>(null);
  function showToast(text: string) {
    setToastNotice(text);
    setTimeout(() => setToastNotice(null), 3500);
  }

  const auth = useGoogleAuth(showToast);
  const isAuthed = Boolean(auth.user);

  const navigation = useNavigationRouter();
  const review = useReviewGovernanceState();
  const workflow = useQuestionnaireWorkflow(tenantId, navigation.activeResponseId);
  const activity = useActivityAndAudit(tenantId, workflow.role, isAuthed);
  const settings = useWorkspaceSettingsManager(tenantId, isAuthed);
  const kb = useKnowledgeBaseManager(tenantId, isAuthed);
  const workspaces = useWorkspaceListManager(tenantId);
  const ai = useAiAnswerGenerator();

  async function onQuestionsLoaded(questions: string[], sourceName: string, mode: SourceMode) {
    const id = `${mode}-${Date.now().toString(36)}`;
    workflow.setResponseId(id);
    workflow.setDetectedQuestions(questions);
    workflow.setSourceMode(mode);
    workflow.setSourceLabel(sourceName);
    if (questions[0]) workflow.setQuestion(questions[0]);

    const newRfpItem: RecentRFPItem = {
      id,
      title: sourceName || "Uploaded Questionnaire",
      editedAt: "Just now",
      color: mode === "url" ? "blue" : sourceName.toLowerCase().endsWith(".csv") ? "green" : "orange",
      questionsCount: questions.length,
    };
    workspaces.setRecentRFPs((prev) => [newRfpItem, ...(prev || []).filter((i) => i.id !== id && i.title !== sourceName)].slice(0, 3));
    activity.logActivity("Loaded questionnaire form", `${sourceName} (${questions.length} detected questions)`, "import");

    try {
      await fetch(`${apiBaseUrl}/api/v1/responses/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({
          id,
          tenant_id: tenantId,
          title: sourceName || "Uploaded Questionnaire",
          source_mode: mode,
          source_url: mode === "url" ? ingestion.formUrl : "",
          questions: questions.map((qText, idx) => ({ question_index: idx, question_text: qText, review_status: "Draft" })),
        }),
      });
      workspaces.fetchWorkspaceSummaries();
    } catch {}
    setNotice(questions.length ? "Form questions loaded" : "No questions found");
    return id;
  }

  const ingestion = useDocumentIngestion(tenantId, onQuestionsLoaded);

  useEffect(() => {
    if (!isAuthed) return;
    fetch(`${apiBaseUrl}/api/v1/responses/history`, { headers: { "X-Tenant-ID": tenantId } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data?.history)) workspaces.setRecentRFPs(data.history.slice(0, 3)); })
      .catch(() => {});
    workspaces.fetchWorkspaceSummaries();
  }, [tenantId, navigation.route, isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    if (navigation.route === "/knowledge-base") { kb.setKbModalTab("upload"); kb.setShowKBModal(true); return; }
    if (navigation.route === "/playground") { kb.setKbModalTab("playground"); kb.setShowKBModal(true); return; }
    const id = responseIdFromPath(navigation.route) || reviewIdFromPath(navigation.route);
    if (!id) return;
    workflow.setResponseId(id);
    fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${id}`, { headers: { "X-Tenant-ID": tenantId } })
      .then((r) => {
        if (!r.ok) {
          navigation.navigate("/");
          return null;
        }
        return r.json();
      })
      .then((data: WorkspaceDetailResponse | null) => {
        if (data?.questions?.length) {
          const qList = data.questions.map((q) => q.question_text);
          const ansMap: Record<string, string> = {};
          const statusMap: Record<string, string> = {};
          const promotedMap: Record<string, boolean> = {};
          data.questions.forEach((q) => {
            if (q.final_answer || q.suggested_answer) ansMap[q.question_text] = q.final_answer || q.suggested_answer || "";
            if (q.review_status) statusMap[q.question_text] = q.review_status;
            if (q.is_promoted_to_kb) promotedMap[q.question_text] = true;
          });
          workflow.setDetectedQuestions(qList);
          workflow.setSourceMode(data.source_mode || "upload");
          workflow.setSourceLabel(data.title);
          ingestion.setFormUrl(data.source_url || "");
          workflow.setAnswersByQuestion(ansMap);
          workflow.setReviewStatusByQuestion(statusMap);
          workflow.setPromotedQuestions(promotedMap);
          if (qList[0]) { workflow.setQuestion(qList[0]); ai.setAnswer(ansMap[qList[0]] || ""); }
        }
      })
      .catch(() => {});
  }, [navigation.route, tenantId, isAuthed]);

  function submitSendForReview() {
    const targets = review.reviewSelectedQuestion
      ? [review.reviewSelectedQuestion]
      : review.reviewModalScope === "current"
      ? [workflow.question]
      : workflow.detectedQuestions.length > 0
      ? workflow.detectedQuestions
      : [workflow.question];
    const nextStatuses = { ...workflow.reviewStatusByQuestion };
    const nextComments = { ...review.reviewCommentsByQuestion };
    targets.forEach((q) => {
      nextStatuses[q] = `In Review (${review.reviewTargetRole})`;
      if (review.reviewInstructions.trim()) nextComments[q] = `Instructions: ${review.reviewInstructions.trim()}`;
    });
    workflow.saveReviewStatuses(nextStatuses);
    review.setReviewCommentsByQuestion(nextComments);
    activity.logActivity(`Dispatched to ${review.reviewTargetRole}`, `${targets.length} question(s) routed`, "review");
    activity.showToast(`Routed ${targets.length} question(s) to ${review.reviewTargetRole}!`);
    review.setShowReviewModal(false);
  }

  function handleConfirmImport(curatedQuestions: ExtractedQuestionItem[]) {
    const selected = curatedQuestions.filter((q) => q.selected).map((q) => q.question_text);
    if (!selected.length) return;
    workflow.setDetectedQuestions(selected);
    workflow.setQuestion(selected[0]);
    if (workflow.responseId) {
      fetch(`${apiBaseUrl}/api/v1/responses/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({
          id: workflow.responseId,
          tenant_id: tenantId,
          title: workflow.sourceLabel || "Uploaded Questionnaire",
          source_mode: workflow.sourceMode,
          source_url: ingestion.formUrl,
          questions: selected.map((qText, idx) => ({ question_index: idx, question_text: qText, review_status: "Draft" })),
        }),
      }).then(() => workspaces.fetchWorkspaceSummaries()).catch(() => {});
    }
    if (workflow.responseId) {
      navigation.navigate(`/response/workspace/${workflow.responseId}`);
    } else {
      navigation.navigate("/");
    }
  }

  function handleRequestChanges(item: string) {
    setRevisionItem(item);
  }

  function onSaveRevisionFeedback(note: string) {
    if (!revisionItem) return;
    workflow.saveReviewStatuses({ ...workflow.reviewStatusByQuestion, [revisionItem]: "Changes requested" });
    if (note.trim()) {
      review.setReviewCommentsByQuestion((prev) => ({
        ...prev,
        [revisionItem]: `[Changes Requested by ${workflow.role}]: ${note.trim()}`,
      }));
    }
    activity.showToast(`Marked "Changes requested"`);
    setRevisionItem(null);
  }

  async function handleExportPackage(format: ExportFormat) {
    const all = workflow.detectedQuestions.length > 0 ? workflow.detectedQuestions : [workflow.question];
    const items = all.map((qText, idx) => ({
      question_index: idx,
      section: "General",
      question_text: qText,
      answer_text: workflow.answersByQuestion[qText] || (qText === workflow.question ? ai.answer : ""),
      review_status: workflow.reviewStatusByQuestion[qText] || (workflow.isBatchApproved ? "Approved" : "Draft"),
      assigned_role: workflow.role,
      confidence_score: 0.94,
      sources: ai.response?.sources || [],
      comments: review.reviewCommentsByQuestion[qText] || "",
    }));
    await workspaces.handleExportPackage(format, {
      responseId: workflow.responseId || "",
      sourceLabel: workflow.sourceLabel,
      items,
      showToast: activity.showToast,
    });
  }

  async function openOriginalForm() {
    const all = workflow.detectedQuestions.length > 0 ? workflow.detectedQuestions : [workflow.question];
    const baseTargetUrl = ingestion.formUrl || `${window.location.origin}/mock-questionnaire.html`;
    const handoff = encodeURIComponent(JSON.stringify({ questions: all, answers: workflow.answersByQuestion, timestamp: Date.now() }));
    window.open(`${baseTargetUrl.split("#")[0]}#rfpengine=${handoff}`, "_blank", "noopener,noreferrer");
    activity.showToast(`Synced ${all.length} answers and opened form!`);
  }

  const isKbActive = !activity.showActivityModal && (navigation.route === "/knowledge-base" || (kb.showKBModal && kb.kbModalTab === "upload"));
  const isPlaygroundActive = !activity.showActivityModal && (navigation.route === "/playground" || (kb.showKBModal && kb.kbModalTab === "playground"));
  const isActivityActive = activity.showActivityModal;
  const isResponsesActive = !kb.showKBModal && !activity.showActivityModal && (navigation.route === "/responses" || navigation.route.startsWith("/response"));
  const isOverviewActive = !kb.showKBModal && !activity.showActivityModal && navigation.route === "/";
  const isSettingsActive = !kb.showKBModal && !activity.showActivityModal && (navigation.route === "/settings" || navigation.route === "/admin");
  const isAdminActive = isSettingsActive;

  const appProps = assembleAppProps({
    navigate: navigation.navigate,
    route: navigation.route,
    activeResponseId: navigation.activeResponseId,
    tenantId,
    setTenantId,
    mobileNavOpen,
    setMobileNavOpen,
    notice,
    isOverviewActive,
    isResponsesActive,
    isKbActive,
    isPlaygroundActive,
    isAdminActive,
    isActivityActive,
    showExportModal,
    setShowExportModal,
    revisionItem,
    setRevisionItem,
    onSaveRevisionFeedback,
    openOriginalForm,
    submitSendForReview,
    handleConfirmImport,
    handleRequestChanges,
    handleExportPackage,
    handleApproveQuestion: (item: string) => {
      workflow.handleApproveQuestion(item);
      activity.logActivity("Approved response item", `Approved as ${workflow.role}`, "approval");
      activity.showToast(`Question marked approved`);
    },
    handleBatchApproveAll: () => {
      workflow.handleBatchApproveAll();
      activity.logActivity("Batch approved questionnaire", `Approved as ${workflow.role}`, "approval");
      activity.showToast("All questions marked approved!");
    },
    handlePromoteToKnowledgeBase: async (itemText: string, index: number) => {
      await workflow.handlePromoteToKnowledgeBase(itemText, index, workflow.answersByQuestion[itemText] || ai.answer);
      activity.logActivity("Promoted Golden Q&A to Knowledge Base", `Promoted answer for "${itemText}"`, "kb");
      activity.showToast("⭐ Promoted answer to canonical Knowledge Base as Golden Q&A!");
    },
    openSendForReviewModal: (scope: any) => review.openSendForReviewModal(scope, workflow.question),
    generateAnswer: () => {
      if (workflow.isAllApproved || workflow.isBatchApproved) {
        activity.showToast("Cannot generate: response is already approved.");
        return;
      }
      const opts = {
        model: settings.workspaceSettings.active_tuned_model_id || settings.workspaceSettings.default_model,
        tone: settings.workspaceSettings.response_tone,
        topK: settings.workspaceSettings.default_top_k,
      };
      return ai.generateAnswer(workflow.question, tenantId, workflow.answersByQuestion, workflow.saveAnswers, opts);
    },
    generateAllAnswers: () => {
      if (workflow.isAllApproved || workflow.isBatchApproved) {
        activity.showToast("Cannot generate answers: questionnaire is already approved.");
        return;
      }
      const opts = {
        model: settings.workspaceSettings.active_tuned_model_id || settings.workspaceSettings.default_model,
        tone: settings.workspaceSettings.response_tone,
        topK: settings.workspaceSettings.default_top_k,
      };
      return ai.generateAllAnswers(workflow.detectedQuestions, workflow.question, tenantId, workflow.answersByQuestion, workflow.saveAnswers, activity.showToast, opts);
    },
    handleExportWorkspace: async (ws: any) => {
      activity.showToast(`Exporting ${ws.title} as Excel compliance matrix...`);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${ws.id}/export?format=xlsx`, { headers: { "X-Tenant-ID": tenantId } });
        if (res.ok) {
          const blob = await res.blob();
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `${ws.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-compliance-matrix.xlsx`;
          link.click();
          URL.revokeObjectURL(link.href);
          activity.showToast(`Downloaded ${ws.title} Excel matrix!`);
        }
      } catch { activity.showToast("Export failed."); }
    },
    workflow,
    ingestion,
    activity,
    settings,
    kb,
    workspaces,
    ai,
    review,
    auth,
    apiBaseUrl,
  });

  return {
    ...appProps,
    auth,
    isReviewRoute: navigation.isReviewRoute,
    route: navigation.route,
    tenantId,
    setTenantId,
    mobileNavOpen,
    setMobileNavOpen,
    role: workflow.role,
    setRole: workflow.setRole,
    workspaceSettings: settings.workspaceSettings,
    setWorkspaceSettings: settings.setWorkspaceSettings,
    backendHealth: activity.backendHealth,
    recentRFPs: workspaces.recentRFPs,
    activeResponseId: navigation.activeResponseId,
    kbTotalRecords: kb.kbTotalRecords,
    kbTotalSources: kb.kbTotalSources,
    toastNotice: activity.toastNotice,
    showToast: activity.showToast,
    detectedQuestions: workflow.detectedQuestions,
    question: workflow.question,
    setQuestion: workflow.setQuestion,
    approvedCount: workflow.approvedCount,
    inReviewCount: workflow.inReviewCount,
    changesRequestedCount: workflow.changesRequestedCount,
    isBatchApproved: workflow.isBatchApproved,
    isAllApproved: workflow.isAllApproved,
    answersByQuestion: workflow.answersByQuestion,
    answer: ai.answer,
    setAnswer: ai.setAnswer,
    response: ai.response,
    parsedQuestions: ingestion.parsedQuestions,
    formUrl: ingestion.formUrl,
  };
}
