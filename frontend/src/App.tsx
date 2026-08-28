import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  FileText,
  FolderOpen,
  History,
  LayoutGrid,
  Link,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  X,
  Zap,
  Play,
} from "lucide-react";

type Source = {
  id: string;
  question: string;
  answer: string;
  score: number;
};

type SearchResponse = {
  suggested_answer: string;
  confidence_score: number;
  sources: Source[];
};

type KBItem = {
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

type SourceMode = "url" | "upload" | "extension";

const CLOUD_RUN_PROD_API = "https://rfpengine-api-714049712844.us-central1.run.app/api";

function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (!envUrl || envUrl === "/api") {
    // If running in browser in production (e.g. www.rfpengine.net), use absolute Cloud Run endpoint
    if (typeof window !== "undefined" && window.location.hostname && !window.location.hostname.includes("localhost") && window.location.hostname !== "127.0.0.1") {
      return CLOUD_RUN_PROD_API;
    }
    return "/api";
  }
  // If user provided a host without /api suffix (e.g. http://localhost:8000 or https://cloudrun.app)
  if (!envUrl.startsWith("/") && !envUrl.endsWith("/api")) {
    return `${envUrl}/api`;
  }
  return envUrl;
}

const apiBaseUrl = getApiBaseUrl();

const sampleDemoFiles = [
  { name: "Security Whitepaper", file: "01_Security_and_Compliance_Whitepaper.md", format: "MD" },
  { name: "SLA & Operations", file: "02_SLA_Disaster_Recovery_and_Operations.pdf", format: "PDF" },
  { name: "Privacy & Subprocessors", file: "03_Data_Privacy_GDPR_and_Subprocessors.json", format: "JSON" },
  { name: "Vendor Security Q&A", file: "04_Standard_Vendor_Security_Questionnaire.csv", format: "CSV" },
  { name: "API & Integrations", file: "05_Product_Features_and_API_Integrations.docx", format: "DOCX" },
  { name: "Code of Conduct / HR", file: "06_Employee_Code_of_Conduct_and_HR_Policies.txt", format: "TXT" },
  { name: "Drone Fleet Safety SOP", file: "07_Autonomous_Drone_Fleet_Logistics_and_Aviation_Safety.txt", format: "TXT" },
];

const playgroundStarterQueries = [
  "What encryption standards are enforced for databases at rest?",
  "What are our Recovery Point Objective (RPO) and Recovery Time Objective (RTO)?",
  "Are we compliant with SOC 2 Type II and ISO 27001?",
  "Who are our authorized subprocessors and where are they located?",
  "What is our policy for employee background checks?",
  "What are the rate limits and authentication methods for the REST API?",
];

const demoResponse: SearchResponse = {
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
};

const starterQuestions = [
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

function demoAnswerFor(question: string): SearchResponse {
  const normalized = question.toLowerCase();
  const answer = normalized.includes("encrypt")
    ? "Customer data is encrypted in transit using TLS 1.2 or higher and at rest using AES-256. Encryption keys are managed through a restricted key-management service."
    : normalized.includes("certif") || normalized.includes("compliance")
      ? "Our security program is aligned with industry best practices, and we maintain current SOC 2 Type II and ISO 27001 certifications. Current reports are available under NDA."
      : normalized.includes("implement") || normalized.includes("timeline")
        ? "A standard implementation typically takes 4 to 8 weeks, depending on integrations, data preparation, and stakeholder availability. A dedicated implementation manager coordinates the rollout."
        : normalized.includes("support")
          ? "The platform includes email support, a searchable help center, and an assigned customer success contact. Premium plans add priority response times and dedicated support."
          : demoResponse.suggested_answer;
  return { ...demoResponse, suggested_answer: answer, confidence_score: 0.84 };
}

function extractFormQuestions(text: string, fileName: string) {
  if (fileName.endsWith(".json")) {
    const parsed = JSON.parse(text);
    const records = Array.isArray(parsed) ? parsed : parsed.questions || [];
    return records
      .map(
        (record: { question?: string; text?: string }) =>
          record.question || record.text || "",
      )
      .filter(Boolean);
  }
  if (fileName.endsWith(".csv")) {
    return text
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.split(",")[2] || line.split(",")[0])
      .filter(Boolean);
  }
  const document = new DOMParser().parseFromString(text, "text/html");
  return [
    ...document.querySelectorAll(
      'textarea, input:not([type="hidden"]), [contenteditable="true"]',
    ),
  ]
    .map(
      (field) =>
        document
          .querySelector(`label[for="${CSS.escape(field.id)}"]`)
          ?.textContent?.trim() ||
        field.getAttribute("aria-label") ||
        field.getAttribute("placeholder") ||
        "",
    )
    .filter(Boolean);
}

function formatScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

function responseIdFromPath(path: string) {
  return path.match(/^\/response\/workspace\/([^/]+)$/)?.[1] || "";
}

function reviewIdFromPath(path: string) {
  return path.match(/^\/review\/([^/]+)$/)?.[1] || "";
}

function App() {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [tenantId, setTenantId] = useState("acme-corp");
  const [topK, setTopK] = useState(5);
  const [response, setResponse] = useState<SearchResponse>(demoResponse);
  const [answer, setAnswer] = useState(demoResponse.suggested_answer);
  const [answersByQuestion, setAnswersByQuestion] = useState<
    Record<string, string>
  >({ [starterQuestions[0]]: demoResponse.suggested_answer });
  const [reviewStatusByQuestion, setReviewStatusByQuestion] = useState<Record<string, string>>({});
  const [activeSource, setActiveSource] = useState(demoResponse.sources[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [answerStatus, setAnswerStatus] = useState<
    "Draft" | "Approved" | "Rejected"
  >("Draft");
  const [role, setRole] = useState<
    "Proposal manager" | "Security SME" | "Legal reviewer" | "Final approver"
  >("Proposal manager");
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

  // Environment & Health State
  const [backendEnv, setBackendEnv] = useState<string>(() => import.meta.env.VITE_APP_ENV || "local");
  const [backendHealth, setBackendHealth] = useState<"ok" | "degraded" | "checking">("checking");
  const [activeApiBase, setActiveApiBase] = useState<string>(() => {
    const saved = localStorage.getItem("rfpengine.custom_api_url");
    if (saved) {
      // If user is on a production web host (like rfpengine.net) and saved is /api, override with Cloud Run API
      if ((saved === "/api" || saved.includes("rfpengine.net")) && typeof window !== "undefined" && window.location.hostname && !window.location.hostname.includes("localhost") && window.location.hostname !== "127.0.0.1") {
        return CLOUD_RUN_PROD_API;
      }
      return saved;
    }
    return apiBaseUrl;
  });

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${activeApiBase}/health`);
        if (res.ok) {
          const data = await res.json();
          setBackendEnv(data.environment || (activeApiBase.includes("run.app") ? "prod" : "local"));
          setBackendHealth(data.status || "ok");
        } else {
          setBackendHealth("degraded");
        }
      } catch {
        setBackendHealth("degraded");
      }
    }
    checkHealth();
  }, [activeApiBase]);

  // Knowledge Base State
  const [showKBModal, setShowKBModal] = useState(false);
  const [kbModalTab, setKbModalTab] = useState<"upload" | "playground">("upload");
  const [kbEntries, setKbEntries] = useState<KBItem[]>([]);
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

  async function handlePlaygroundSearch(queryText?: string) {
    const query = (queryText || playgroundQuery).trim();
    if (!query) return;
    if (queryText) {
      setPlaygroundQuery(queryText);
    }
    setPlaygroundLoading(true);
    setPlaygroundError(null);
    try {
      const res = await fetch(`${activeApiBase}/v1/search`, {
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

  async function fetchKBEntries() {
    setIsFetchingKB(true);
    try {
      const res = await fetch(`${activeApiBase}/v1/knowledge-base?tenant_id=${tenantId}&limit=100`);
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
    fetchKBEntries();
  }, [tenantId, activeApiBase]);

  useEffect(() => {
    if (showKBModal) {
      fetchKBEntries();
    }
  }, [showKBModal, activeApiBase]);

  async function handleKBUpload(file: File) {
    if (!file) return;
    setIsUploadingKB(true);
    setKbUploadMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", tenantId);
      const res = await fetch(`${activeApiBase}/v1/knowledge-base/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const countMsg = data.records_created ? ` (${data.records_created} passages indexed)` : "";
        setKbUploadMsg({ text: `Successfully uploaded "${file.name}"${countMsg}.` });
        fetchKBEntries();
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

  async function handleFileUpload(files: FileList | null) {
    if (files && files.length > 0) {
      handleKBUpload(files[0]);
    }
  }

  async function handleDeleteKBEntry(id: string) {
    try {
      await fetch(`${activeApiBase}/v1/knowledge-base/${id}`, { method: "DELETE" });
      setKbEntries((prev) => prev.filter((item) => item.id !== id));
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

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const approveButton =
      document.querySelector<HTMLButtonElement>(".approve-button");
    const rejectButton =
      document.querySelector<HTMLButtonElement>(".reject-button");
    if (!approveButton || !rejectButton) return;
    const approve = () => {
      const nextStatus =
        role === "Proposal manager"
          ? "SME review"
          : role === "Final approver"
            ? "Final approved"
            : "Approved by SME";
      setAnswerStatus(nextStatus as "Approved");
      setNotice(`${nextStatus} · ${role}`);
    };
    const reject = () => {
      setAnswerStatus("Rejected");
      setNotice("Answer rejected and needs revision");
    };
    approveButton.addEventListener("click", approve);
    rejectButton.addEventListener("click", reject);
    return () => {
      approveButton.removeEventListener("click", approve);
      rejectButton.removeEventListener("click", reject);
    };
  }, [route, answerStatus, role]);

  useEffect(() => {
    if (route === "/knowledge-base") {
      setKbModalTab("upload");
      setShowKBModal(true);
      fetchKBEntries();
      return;
    }
    if (route === "/playground") {
      setKbModalTab("playground");
      setShowKBModal(true);
      return;
    }

    const id = responseIdFromPath(route) || reviewIdFromPath(route);
    if (!id) return;
    const saved = localStorage.getItem(`rfpengine.response.${id}`);
    if (!saved) return;
    const stored = JSON.parse(saved) as {
      questions: string[];
      sourceMode: SourceMode;
      sourceLabel: string;
      sourceUrl?: string;
      answers: Record<string, string>;
      reviewStatuses?: Record<string, string>;
    };
    setResponseId(id);
    setDetectedQuestions(stored.questions);
    setSourceMode(stored.sourceMode);
    setSourceLabel(stored.sourceLabel);
    setFormUrl(stored.sourceUrl || "");
    setAnswersByQuestion(stored.answers);
    setReviewStatusByQuestion(stored.reviewStatuses || {});
    if (stored.questions[0]) {
      setQuestion(stored.questions[0]);
      setAnswer(stored.answers[stored.questions[0]] || "");
    }
  }, [route]);

  function loadQuestions(
    questions: string[],
    source: string,
    mode: SourceMode,
  ) {
    const id = `${mode}-${Date.now().toString(36)}`;
    localStorage.setItem(
      `rfpengine.response.${id}`,
      JSON.stringify({
        id,
        questions,
        sourceMode: mode,
        sourceLabel: source,
        sourceUrl: mode === "url" ? formUrl : "",
        answers: {},
        reviewStatuses: {},
      }),
    );
    localStorage.setItem("rfpengine.latest", id);
    setResponseId(id);
    setDetectedQuestions(questions);
    setSourceMode(mode);
    setSourceLabel(source);
    if (questions[0]) setQuestion(questions[0]);
    setSourceStatus(
      `${source} · ${questions.length} question${questions.length === 1 ? "" : "s"} detected`,
    );
    setNotice(
      questions.length ? "Form questions loaded" : "No questions found",
    );
    return id;
  }

  async function loadFormUrl() {
    try {
      const url = new URL(formUrl);
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error("Use an http or https URL.");
      setSourceStatus("Fetching form...");
      const result = await fetch(url.href);
      if (!result.ok)
        throw new Error(`Could not fetch form (${result.status})`);
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
    try {
      return loadQuestions(
        extractFormQuestions(await file.text(), file.name.toLowerCase()),
        file.name,
        "upload",
      );
    } catch (error) {
      setSourceStatus(`Could not read form: ${(error as Error).message}`);
      return undefined;
    }
  }

  function navigate(path: string) {
    window.history.pushState({}, "", path);
    setRoute(path);
  }

  const [toastNotice, setToastNotice] = useState<string | null>(null);

  function showToast(text: string) {
    setToastNotice(text);
    setTimeout(() => setToastNotice(null), 3500);
  }

  function openImport(id?: string) {
    navigate(
      `/review/${id || responseId || localStorage.getItem("rfpengine.latest") || "demo"}`,
    );
  }

  function openWorkspace() {
    navigate(`/response/workspace/${responseId || "demo"}`);
  }

  function handleSendForReview() {
    const currentQ = question;
    const nextStatus = "SME review";
    const updatedStatus = { ...reviewStatusByQuestion, [currentQ]: nextStatus };
    setReviewStatusByQuestion(updatedStatus);
    saveReviewStatuses(updatedStatus);

    showToast(`Draft for question sent to SME Review queue!`);

    // Advance to next question in list if available
    const currentIndex = detectedQuestions.indexOf(currentQ);
    if (currentIndex >= 0 && currentIndex < detectedQuestions.length - 1) {
      setQuestion(detectedQuestions[currentIndex + 1]);
    }
  }

  async function openOriginalForm() {
    const baseTargetUrl = formUrl || `${window.location.origin}/mock-questionnaire.html`;
    const allQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
    const currentAnswers = { ...answersByQuestion };
    
    // Ensure current question is set
    if (question && answer && !currentAnswers[question]) {
      currentAnswers[question] = answer;
    }

    const missing = allQuestions.filter((q) => !currentAnswers[q] || !currentAnswers[q].trim());

    if (missing.length > 0) {
      showToast(`Generating answers for ${missing.length} questions...`);
      await Promise.all(
        missing.map(async (item) => {
          try {
            const result = await fetch(`${activeApiBase}/v1/search`, {
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
        })
      );
      setAnswersByQuestion(currentAnswers);
      saveAnswers(currentAnswers);
    }

    const payloadAnswers = Object.fromEntries(
      allQuestions.map((item) => [item, currentAnswers[item] || ""])
    );

    // 1. Sync directly to Chrome Extension Service Worker via DOM postMessage
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

    // 2. Also keep URL fragment as universal fallback
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

  function exportAnswers() {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      "question,answer",
      ...detectedQuestions.map(
        (item) =>
          `${escapeCsv(item)},${escapeCsv(answersByQuestion[item] || "")}`,
      ),
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv" }),
    );
    link.download = `${sourceLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "rfpengine-response"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function saveAnswers(nextAnswers: Record<string, string>) {
    if (!responseId) return;
    const key = `rfpengine.response.${responseId}`;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(
      key,
      JSON.stringify({ ...saved, answers: nextAnswers }),
    );
  }

  function saveReviewStatuses(nextStatuses: Record<string, string>) {
    if (!responseId) return;
    const key = `rfpengine.response.${responseId}`;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    localStorage.setItem(key, JSON.stringify({ ...saved, reviewStatuses: nextStatuses }));
  }

  async function generateAnswer() {
    if (!question.trim()) return;
    setIsGenerating(true);
    setNotice("Searching approved knowledge...");
    try {
      const result = await fetch(`${activeApiBase}/v1/search`, {
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
          const result = await fetch(`${activeApiBase}/v1/search`, {
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
      })
    );

    setAnswersByQuestion(generated);
    saveAnswers(generated);
    setAnswer(generated[question] || generated[detectedQuestions[0]] || "");
    setNotice("All answers ready for human review");
    showToast(`Generated answers for all ${detectedQuestions.length} questions!`);
    setIsGenerating(false);
  }

  if (route.startsWith("/review/")) {
    return (
      <div className="import-page">
        <header className="import-header">
          <div className="brand-mark">
            <span>R</span>
          </div>
          <div className="brand-name">
            RFP<span>Engine</span>
          </div>
          <span className="import-header-label">Response assistant</span>
        </header>
        <main className="import-main">
          <p className="breadcrumb">
            Responses <span>/</span> New response
          </p>
          <h1>Review your questionnaire</h1>
          <p className="subtitle">
            Confirm the questions found before drafting answers.
          </p>
          <section className="import-source panel">
            <div className="panel-label">
              <span className="step-number">01</span>
              <div>
                <p className="eyebrow">Form source</p>
                <span className="label-hint">
                  Load a hosted questionnaire or upload form data
                </span>
              </div>
            </div>
            <div className="source-input-row">
              <div className="source-url-field">
                <Link size={16} />
                <input
                  value={formUrl}
                  onChange={(event) => setFormUrl(event.target.value)}
                  placeholder="https://buyer.example/questionnaire"
                />
                <button
                  className="source-button"
                  onClick={loadFormUrl}
                  disabled={!formUrl.trim()}
                >
                  Load URL
                </button>
              </div>
              <label className="upload-form-button">
                <Upload size={15} /> Upload HTML, JSON, or CSV
                <input
                  type="file"
                  accept=".html,.htm,.json,.csv,text/html,application/json,text/csv"
                  onChange={loadFormFile}
                />
              </label>
            </div>
            <p className="source-status">
              <span className="status-dot" /> {sourceStatus}
            </p>
          </section>
          <section className="import-questions panel">
            <div className="import-question-heading">
              <div>
                <p className="eyebrow">02 / Detected questions</p>
                <h2>
                  {detectedQuestions.length
                    ? `${detectedQuestions.length} questions ready`
                    : "No questions detected"}
                </h2>
              </div>
              <span className="source-count">Review before continuing</span>
            </div>
            {detectedQuestions.length ? (
              <div className="import-question-list">
                {detectedQuestions.map((detectedQuestion, index) => (
                  <div
                    className="import-question"
                    key={`${detectedQuestion}-${index}`}
                  >
                    <span className="source-rank">
                      Q{String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{detectedQuestion}</span>
                    <Check size={15} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-import">
                Load a URL or upload a form file to see its questions here.
              </p>
            )}
            <button
              className="primary-button continue-button"
              onClick={openWorkspace}
              disabled={!detectedQuestions.length}
            >
              Continue to workspace <ArrowUpRight size={15} />
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="mobile-menu"
          aria-label="Open navigation"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <button className="brand-mark" onClick={() => navigate("/")} aria-label="Go to home">
          <span>R</span>
        </button>
        <div className="brand-name">
          RFP<span>Engine</span>
        </div>
        <div className="workspace-switcher">
          <span className="workspace-dot" /> Acme Corporation{" "}
          <ChevronDown size={15} />
        </div>
        <div
          className="env-indicator"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "9999px",
            backgroundColor: backendEnv === "prod" || backendEnv === "production" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
            color: backendEnv === "prod" || backendEnv === "production" ? "#10b981" : "#f59e0b",
            border: `1px solid ${backendEnv === "prod" || backendEnv === "production" ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
            cursor: "pointer",
            marginLeft: "8px",
          }}
          onClick={() => {
            const nextUrl = activeApiBase.includes("localhost") || activeApiBase.startsWith("/api")
              ? "https://rfpengine-api-714049712844.us-central1.run.app/api"
              : "/api";
            localStorage.setItem("rfpengine.custom_api_url", nextUrl);
            setActiveApiBase(nextUrl);
          }}
          title={`Active API: ${activeApiBase}\nStatus: ${backendHealth.toUpperCase()}\nClick to toggle Local / Cloud Prod target`}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: backendHealth === "ok" ? (backendEnv === "prod" || backendEnv === "production" ? "#10b981" : "#f59e0b") : "#ef4444",
            }}
          />
          {backendEnv === "prod" || backendEnv === "production" ? "PROD CLOUD" : "LOCAL DEV"}
        </div>
        <div className="topbar-spacer" />
        <button className="icon-button" title="Open notifications">
          <AlertCircle size={18} />
        </button>
        <button className="avatar" title="Account menu">
          JD
        </button>
      </header>

      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-section">
          <p className="eyebrow">Workspace</p>
          <nav>
            <button className="nav-item active" onClick={() => navigate("/")}>
              <LayoutGrid size={17} /> Overview
            </button>
            <button className="nav-item" onClick={() => navigate(`/response/workspace/${responseId || "demo"}`)}>
              <FileText size={17} /> Responses{" "}
              <span className="nav-count">12</span>
            </button>
            <button
              className={`nav-item ${route === "/knowledge-base" && showKBModal && kbModalTab === "upload" ? "active" : ""}`}
              onClick={() => {
                setKbModalTab("upload");
                navigate("/knowledge-base");
              }}
            >
              <FolderOpen size={17} /> Knowledge base
            </button>
            <button
              className={`nav-item ${route === "/playground" || (showKBModal && kbModalTab === "playground") ? "active" : ""}`}
              onClick={() => {
                setKbModalTab("playground");
                navigate("/playground");
              }}
            >
              <Zap size={17} /> KB Playground
            </button>
            <button className="nav-item">
              <History size={17} /> Activity
            </button>
          </nav>
        </div>
        <div className="sidebar-section recent-section">
          <p className="eyebrow">
            Recent RFPs{" "}
            <button className="tiny-action" title="Add RFP" onClick={() => navigate("/")}>
              <Plus size={14} />
            </button>
          </p>
          <button className="recent-item selected" onClick={() => navigate(`/response/workspace/${responseId || "demo"}`)}>
            <span className="file-icon blue">
              <FileText size={15} />
            </span>
            <span>
              <strong>Northstar security review</strong>
              <small>Edited 8 min ago</small>
            </span>
          </button>
          <button className="recent-item" onClick={() => navigate(`/response/workspace/${responseId || "demo"}`)}>
            <span className="file-icon orange">
              <FileText size={15} />
            </span>
            <span>
              <strong>Grove procurement RFP</strong>
              <small>Edited yesterday</small>
            </span>
          </button>
          <button className="recent-item" onClick={() => navigate(`/response/workspace/${responseId || "demo"}`)}>
            <span className="file-icon green">
              <FileText size={15} />
            </span>
            <span>
              <strong>Meridian vendor form</strong>
              <small>Edited Aug 18</small>
            </span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setNotice("Workspace settings are coming soon") }>
            <Settings size={17} /> Workspace settings
          </button>
          <div className="plan-meter">
            <div>
              <span>Knowledge base</span>
              <strong>68%</strong>
            </div>
            <div className="meter">
              <span />
            </div>
            <small>6,842 of 10,000 records</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {route.startsWith("/response/workspace/") && (
          <div className="role-bar">
            <div className="role-selector">
              <span className="eyebrow">Viewing as</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as typeof role)}
              >
                <option>Proposal manager</option>
                <option>Security SME</option>
                <option>Legal reviewer</option>
                <option>Final approver</option>
              </select>
            </div>
            <div className="queue-summary">
              <span>
                <strong>12</strong> total
              </span>
              <span>
                <strong>8</strong> approved
              </span>
              <span className="queue-warning">
                <strong>2</strong> SME review
              </span>
              <span>
                <strong>1</strong> revision
              </span>
            </div>
            <span className="workflow-status">
              {answerStatus === "Draft" ? "Draft in progress" : answerStatus}
            </span>
          </div>
        )}
        {route === "/" ? (
          <section className="home-screen">
            <p className="eyebrow">Start a response</p>
            <h1>Bring in your questionnaire</h1>
            <p className="home-subtitle">
              Choose how you want to load the seller form.
            </p>
            <div className="home-feature-grid">
              <div className="home-feature">
                <span className="home-feature-number">01</span>
                <div className="home-feature-icon">
                  <Link size={22} />
                </div>
                <h2>Paste a form URL</h2>
                <p>
                  Load a hosted questionnaire and extract its questions for
                  review.
                </p>
                <div className="home-url-row">
                  <input
                    value={formUrl}
                    onChange={(event) => setFormUrl(event.target.value)}
                    placeholder="https://buyer.example/form"
                  />
                  <button
                    className="primary-button"
                    onClick={async () => {
                      const id = await loadFormUrl();
                      if (id) openImport(id);
                    }}
                    disabled={!formUrl.trim()}
                  >
                    Load URL <ArrowUpRight size={15} />
                  </button>
                </div>
                <small>Works when the page permits browser access.</small>
              </div>
              <div className="home-feature">
                <span className="home-feature-number">02</span>
                <div className="home-feature-icon upload-icon">
                  <Upload size={22} />
                </div>
                <h2>Upload form data</h2>
                <p>
                  Import an HTML, JSON, or CSV questionnaire from your computer.
                </p>
                <label className="home-upload-button">
                  <Upload size={16} /> Choose a form file
                  <input
                    type="file"
                    accept=".html,.htm,.json,.csv,text/html,application/json,text/csv"
                    onChange={async (event) => {
                      const id = await loadFormFile(event);
                      if (id) openImport(id);
                    }}
                  />
                </label>
                <small>Questions are extracted locally in your browser.</small>
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <p className="breadcrumb">
                  Responses <span>/</span> Northstar security review
                </p>
                <h1>Response workspace</h1>
                <p className="subtitle">
                  Draft accurate answers from your approved knowledge base.
                </p>
              </div>
              <button className="outline-button" onClick={() => navigate("/")}>
                <Upload size={16} /> Import RFP
              </button>
            </div>

            <section className="source-panel panel">
              <div className="panel-label">
                <span className="step-number">00</span>
                <div>
                  <p className="eyebrow">Form source</p>
                  <span className="label-hint">
                    Load a hosted questionnaire or upload form data
                  </span>
                </div>
              </div>
              <div className="source-input-row">
                <div className="source-url-field">
                  <Link size={16} />
                  <input
                    value={formUrl}
                    onChange={(event) => setFormUrl(event.target.value)}
                    placeholder="Paste form URL, e.g. https://buyer.example/questionnaire"
                  />
                  <button
                    className="source-button"
                    onClick={loadFormUrl}
                    disabled={!formUrl.trim()}
                  >
                    Load URL
                  </button>
                </div>
                <label className="upload-form-button">
                  <Upload size={15} /> Upload HTML, JSON, or CSV
                  <input
                    type="file"
                    accept=".html,.htm,.json,.csv,text/html,application/json,text/csv"
                    onChange={loadFormFile}
                  />
                </label>
              </div>
              <div className="source-status-row">
                <p className="source-status">
                  <span className="status-dot" /> {sourceStatus}
                </p>
                {route.startsWith("/review/") && detectedQuestions.length > 0 && (
                  <button className="source-button" onClick={openWorkspace}>
                    Continue to workspace <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </section>

            <div className="source-actions">
              <span className="source-badge">
                {sourceMode === "url"
                  ? "Hosted form"
                  : sourceMode === "upload"
                    ? "Uploaded form"
                    : "Live page"}{" "}
                · {sourceLabel}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="outline-button" onClick={openOriginalForm} title="Launch buyer form with pre-approved answers">
                  <Link size={15} /> Open original form
                </button>
                <button className="outline-button" onClick={exportAnswers} title="Download answers as CSV">
                  <Download size={15} /> Export CSV
                </button>
              </div>
            </div>
            <section className="question-panel panel">
              <div className="panel-label">
                <span className="step-number">01</span>
                <div>
                  <p className="eyebrow">Question to answer</p>
                  <span className="label-hint">
                    Ask a question or paste one from your RFP
                  </span>
                </div>
              </div>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
              />
              {detectedQuestions.length > 1 && (
                <div className="detected-list">
                  {detectedQuestions.map((detectedQuestion, index) => (
                    <button
                      key={`${detectedQuestion}-${index}`}
                      className={
                        detectedQuestion === question ? "detected-active" : ""
                      }
                      onClick={() => setQuestion(detectedQuestion)}
                    >
                      Q{String(index + 1).padStart(2, "0")} {detectedQuestion}
                    </button>
                  ))}
                </div>
              )}
              <div className="question-footer">
                <div className="question-meta">
                  <span className="status-dot" /> Knowledge base connected{" "}
                  <span className="divider" /> Tenant:{" "}
                  <select
                    value={tenantId}
                    onChange={(event) => setTenantId(event.target.value)}
                  >
                    <option value="acme-corp">acme-corp</option>
                    <option value="demo-tenant">demo-tenant</option>
                  </select>
                </div>
                <button
                  className="primary-button"
                  onClick={detectedQuestions.length ? generateAllAnswers : generateAnswer}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <RefreshCw className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  {isGenerating ? "Generating" : detectedQuestions.length ? "Generate all answers" : "Generate answer"}{" "}
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </section>

            <div className="workspace-grid">
              <section className={`answer-column ${detectedQuestions.length ? "has-question-list" : ""}`}>
                {detectedQuestions.length > 0 && <div className="question-review-list">{detectedQuestions.map((item, index) => <article className="question-review-card panel" key={`${item}-${index}`}><div className="question-review-header"><span className="source-rank">Q{String(index + 1).padStart(2, "0")}</span><span className="review-status">{reviewStatusByQuestion[item] || (answersByQuestion[item] ? "DRAFT READY" : "NOT GENERATED")}</span></div><h2>{item}</h2><textarea className="question-review-answer" value={answersByQuestion[item] || ""} placeholder="Generate all answers to populate this response." onChange={(event) => { const nextAnswers = { ...answersByQuestion, [item]: event.target.value }; setAnswersByQuestion(nextAnswers); saveAnswers(nextAnswers); }} /><div className="question-review-actions"><button className="reject-button" onClick={() => { const nextStatuses = { ...reviewStatusByQuestion, [item]: "Changes requested" }; setReviewStatusByQuestion(nextStatuses); saveReviewStatuses(nextStatuses); }}><ThumbsDown size={14} /> Request changes</button><button className="approve-button" onClick={() => { const nextStatuses = { ...reviewStatusByQuestion, [item]: "Approved" }; setReviewStatusByQuestion(nextStatuses); saveReviewStatuses(nextStatuses); }}><Check size={14} /> Approve</button></div></article>)}</div>}
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">02 / Draft response</p>
                    <h2>Suggested answer</h2>
                  </div>
                  <span className="live-badge">
                    <span /> {notice.includes("live") ? "Live" : "Preview"}
                  </span>
                </div>
                <div className="answer-panel panel">
                  <div className="answer-toolbar">
                    <span className="source-label">
                      <Sparkles size={15} /> AI draft
                    </span>
                    <button className="ghost-button" onClick={generateAnswer}>
                      <RefreshCw size={14} /> Regenerate
                    </button>
                  </div>
                  <textarea
                    className="answer-editor"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                  />
                  <div className="answer-footer">
                    <span>{answer.length} characters</span>
                    <div className="answer-actions">
                      <button className="reject-button">
                        <ThumbsDown size={15} /> Reject
                      </button>
                      <button className="approve-button">
                        <Check size={15} /> Approve answer
                      </button>
                    </div>
                  </div>
                </div>
                <div className="review-note">
                  <span className="note-icon">
                    <BookOpen size={15} />
                  </span>
                  <p>
                    <strong>Review before approving.</strong> This draft is
                    grounded in {response.sources.length} retrieved sources.
                    Check that the language matches your current policy.
                  </p>
                </div>
              </section>

              <aside className="sources-column">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">03 / Evidence</p>
                    <h2>Retrieved sources</h2>
                  </div>
                  <span className="source-count">
                    {response.sources.length} sources
                  </span>
                </div>
                <div className="source-list">
                  {response.sources.map((source, index) => (
                    <button
                      key={source.id}
                      className={`source-card ${activeSource === source.id ? "source-active" : ""}`}
                      onClick={() => setActiveSource(source.id)}
                    >
                      <div className="source-card-top">
                        <span className="source-rank">0{index + 1}</span>
                        <span className="match-score">
                          {formatScore(Math.min(source.score * 30, 0.99))} match
                        </span>
                      </div>
                      <strong>{source.question}</strong>
                      <p>{source.answer}</p>
                      <div className="source-id">
                        <span>{source.id}</span>
                        <ArrowUpRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            </div>

            <div className="bottom-strip">
              <div className="confidence">
                <div className="confidence-ring">
                  <span>{Math.round(response.confidence_score * 100)}</span>
                </div>
                <div>
                  <p className="eyebrow">Confidence score</p>
                  <strong>Strong source alignment</strong>
                  <small>Based on semantic and keyword retrieval</small>
                </div>
              </div>
              <div className="shortcut-hint">
                <span className="key">⌘</span>
                <span className="key">↵</span> Generate answer
              </div>
              <button
                className="send-button"
                title="Send current draft for SME review"
                onClick={handleSendForReview}
              >
                <Send size={16} /> Send for review
              </button>
            </div>
          </>
        )}
      </main>

      {/* Knowledge Base Modal */}
      {showKBModal && (
        <div className="kb-modal-backdrop" onClick={closeKBModal}>
          <div className="kb-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="kb-modal-header">
              <div className="kb-modal-tabs">
                <button
                  className={`kb-tab-btn ${kbModalTab === "upload" ? "active" : ""}`}
                  onClick={() => {
                    setKbModalTab("upload");
                    navigate("/knowledge-base");
                  }}
                >
                  <FolderOpen size={16} /> Documents & Ingestion
                </button>
                <button
                  className={`kb-tab-btn ${kbModalTab === "playground" ? "active" : ""}`}
                  onClick={() => {
                    setKbModalTab("playground");
                    navigate("/playground");
                  }}
                >
                  <Zap size={16} /> Retrieval Playground
                </button>
              </div>
              <button
                className="icon-button"
                onClick={closeKBModal}
                aria-label="Close Knowledge Base modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="kb-modal-body">
              {kbModalTab === "upload" ? (
                <>
                  {/* Upload Card */}
                  <div
                    className={`kb-upload-card ${isDragOver ? "drag-over" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleKBUpload(file);
                    }}
                  >
                    <div className="kb-upload-icon">
                      <Upload size={24} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "14px" }}>
                        Upload Knowledge Base Files
                      </strong>
                      <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "11px" }}>
                        Drag & drop or select files. Supported: <code>.csv</code>, <code>.json</code>, <code>.pdf</code>, <code>.docx</code>, <code>.txt</code>, <code>.md</code>
                      </p>
                    </div>

                    <div className="kb-upload-action">
                      <label className="kb-upload-btn">
                        {isUploadingKB ? (
                          <>
                            <RefreshCw size={14} className="spin" /> Ingesting & Categorizing...
                          </>
                        ) : (
                          <>
                            <Upload size={14} /> Browse & Ingest Document
                          </>
                        )}
                        <input
                          type="file"
                          accept=".csv,.tsv,.json,.jsonl,.pdf,.docx,.txt,.md"
                          disabled={isUploadingKB}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleKBUpload(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Sample Files Download Bar for Live Demo */}
                  <div className="kb-samples-card">
                    <div className="kb-samples-header">
                      <span className="eyebrow" style={{ color: "var(--blue)" }}>Demo Sample Knowledge Documents</span>
                      <small style={{ color: "var(--muted)", fontSize: "11px" }}>Single-click to download sample files for live upload demonstration</small>
                    </div>
                    <div className="kb-samples-grid">
                      {sampleDemoFiles.map((sample) => (
                        <a
                          key={sample.file}
                          href={`/sample_docs/${sample.file}`}
                          download={sample.file}
                          className="kb-sample-pill"
                          title={`Download ${sample.file}`}
                        >
                          <Download size={13} />
                          <span className="kb-sample-name">{sample.name}</span>
                          <span className="kb-sample-badge">{sample.format}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Status Alert */}
                  {kbUploadMsg && (
                    <div
                      className={`kb-alert ${
                        kbUploadMsg.isError ? "kb-alert-error" : "kb-alert-success"
                      }`}
                    >
                      {kbUploadMsg.isError ? (
                        <AlertCircle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      <span>{kbUploadMsg.text}</span>
                    </div>
                  )}

                  {/* Records Section */}
                  <div className="kb-records-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px" }}>Indexed Knowledge Records</h3>
                      <p style={{ margin: "3px 0 0", color: "var(--muted)", fontSize: "11px" }}>
                        {isFetchingKB
                          ? "Fetching indexed passages from storage..."
                          : `${kbEntries.length} record${kbEntries.length === 1 ? "" : "s"} stored in knowledge base`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        padding: "6px 12px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        height: "auto",
                      }}
                      onClick={() => fetchKBEntries()}
                      disabled={isFetchingKB}
                      title="Refresh indexed records"
                    >
                      <RefreshCw size={13} className={isFetchingKB ? "spin" : ""} />
                      {isFetchingKB ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <div className="kb-records-grid">
                    {kbEntries.map((entry) => {
                      const entryTitle = entry.title || entry.question || "Untitled Passage";
                      const entryBody = entry.content || entry.answer || "";
                      const sourceFile = entry.metadata?.source_file;
                      const pageNum = entry.metadata?.page_number;

                      return (
                        <div key={entry.id} className="kb-record-card">
                          <div className="kb-record-top">
                            <div className="kb-record-title">{entryTitle}</div>
                            <button
                              className="kb-delete-btn"
                              title="Delete knowledge entry"
                              onClick={() => handleDeleteKBEntry(entry.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="kb-record-answer">{entryBody}</div>
                          <div className="kb-record-tags">
                            {entry.category && (
                              <span className="kb-tag">
                                <Tag size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                {entry.category}
                              </span>
                            )}
                            {sourceFile && (
                              <span className="kb-tag kb-tag-file">
                                <FileText size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                {sourceFile}
                                {pageNum ? ` (p.${pageNum})` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {kbEntries.length === 0 && !isFetchingKB && (
                      <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)", fontSize: "12px" }}>
                        No knowledge records found. Upload a file above or click a sample document to get started.
                      </div>
                    )}

                    {isFetchingKB && kbEntries.length === 0 && (
                      <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)", fontSize: "12px" }}>
                        <RefreshCw size={16} className="spin" style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }} />
                        Loading indexed knowledge records from cloud storage...
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Playground Tab */
                <div className="kb-playground-container">
                  <div className="kb-playground-input-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ fontSize: "14px" }}>Knowledge Retrieval & AI Answering Playground</strong>
                        <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "11px" }}>
                          Test questions against your knowledge base with real-time AI answer generation and source retrieval
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted)" }}>
                        <span>Depth:</span>
                        <select
                          value={playgroundTopK}
                          onChange={(e) => setPlaygroundTopK(Number(e.target.value))}
                          style={{ padding: "4px 8px", border: "1px solid var(--line)", background: "#fff", fontSize: "12px" }}
                        >
                          <option value={3}>Top 3</option>
                          <option value={5}>Top 5</option>
                          <option value={8}>Top 8</option>
                          <option value={10}>Top 10</option>
                        </select>
                      </div>
                    </div>

                    <form
                      className="kb-playground-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handlePlaygroundSearch();
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Type any question to test retrieval (e.g. Describe your encryption and key rotation policy)..."
                        value={playgroundQuery}
                        onChange={(e) => setPlaygroundQuery(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="kb-playground-run-btn"
                        disabled={playgroundLoading || !playgroundQuery.trim()}
                      >
                        {playgroundLoading ? (
                          <>
                            <RefreshCw size={14} className="spin" /> Searching...
                          </>
                        ) : (
                          <>
                            <Play size={14} /> Run Search
                          </>
                        )}
                      </button>
                    </form>

                    <div className="kb-playground-starters">
                      <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>Try sample questions:</span>
                      {playgroundStarterQueries.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="kb-starter-chip"
                          onClick={() => {
                            setPlaygroundQuery(q);
                            handlePlaygroundSearch(q);
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {playgroundError && (
                    <div className="kb-alert kb-alert-error">
                      <AlertCircle size={16} />
                      <span>{playgroundError}</span>
                    </div>
                  )}

                  {playgroundResult && (
                    <div className="kb-playground-output">
                      <div className="kb-answer-card">
                        <div className="kb-answer-header">
                          <strong style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Sparkles size={15} color="var(--blue)" /> Grounded AI Formulation
                          </strong>
                          <span
                            className={`kb-confidence-badge ${
                              playgroundResult.confidence_score >= 0.85 ? "confidence-high" : "confidence-med"
                            }`}
                          >
                            {Math.round(playgroundResult.confidence_score * 100)}% Confidence
                          </span>
                        </div>
                        <div className="kb-answer-text">
                          {playgroundResult.suggested_answer}
                        </div>
                      </div>

                      <div className="kb-sources-card">
                        <strong style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Database size={15} color="var(--navy)" /> Retrieved Source Chunks ({playgroundResult.sources.length})
                        </strong>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {playgroundResult.sources.map((src, idx) => (
                            <div key={src.id || idx} className="kb-source-item">
                              <div className="kb-source-top">
                                <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--ink)" }}>
                                  #{idx + 1} {src.question || src.id}
                                </span>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span className="kb-source-method">
                                    Source #{idx + 1}
                                  </span>
                                  <span className="kb-source-score">
                                    Match Score: {(src.score || 0).toFixed(4)}
                                  </span>
                                </div>
                              </div>
                              <div className="kb-source-passage">{src.answer}</div>
                            </div>
                          ))}
                          {playgroundResult.sources.length === 0 && (
                            <div style={{ fontSize: "12px", color: "var(--muted)", padding: "10px 0" }}>
                              No matching sources found in knowledge base for this query.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!playgroundResult && !playgroundLoading && (
                    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)", background: "#fff", border: "1px solid var(--line)" }}>
                      <Zap size={28} color="var(--blue)" style={{ marginBottom: "8px" }} />
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>Test Knowledge Base Answering</div>
                      <p style={{ margin: "4px auto 0", maxWidth: "450px", fontSize: "12px" }}>
                        Click any starter question above or type a custom inquiry to test answer retrieval and citations.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastNotice && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#18243b",
            color: "#ffffff",
            padding: "14px 20px",
            borderRadius: "8px",
            boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 999999,
            borderLeft: "4px solid var(--lime)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--lime)" }} />
          <span style={{ fontWeight: 500 }}>{toastNotice}</span>
        </div>
      )}
    </div>
  );
}

export default App;
