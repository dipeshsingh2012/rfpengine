import React, { useState, useMemo, useEffect } from "react";
import {
  Link,
  Upload,
  Check,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  FileText,
  Trash2,
  Edit2,
  Plus,
  Search,
  CheckSquare,
  Square,
  ThumbsUp,
  ThumbsDown,
  X,
  ExternalLink,
  Download,
  Split,
  Maximize2,
  HelpCircle,
} from "lucide-react";
import { ExtractedQuestionItem } from "../../types";

interface ReviewImportPageProps {
  onNavigateHome: () => void;
  onNavigateResponses?: () => void;
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  sourceStatus: string;
  detectedQuestions: string[];
  parsedQuestions?: ExtractedQuestionItem[];
  uploadedFile?: File | null;
  uploadedFileContent?: string;
  onUpdateQuestions?: (questions: ExtractedQuestionItem[]) => void;
  onRephraseQuestion?: (questionText: string) => Promise<string>;
  onReparseWithGuidance?: (guidance: string) => Promise<void>;
  onSubmitFeedback?: (payload: {
    rating: string | null;
    edits: any[];
    deletions: any[];
    additions: any[];
  }) => Promise<void>;
  openWorkspace: () => void;
  onConfirmImport?: (selectedQuestions: ExtractedQuestionItem[]) => void;
}

export const ReviewImportPage: React.FC<ReviewImportPageProps> = ({
  onNavigateHome,
  onNavigateResponses,
  formUrl,
  setFormUrl,
  loadFormUrl,
  loadFormFile,
  sourceStatus,
  detectedQuestions,
  parsedQuestions,
  uploadedFile,
  uploadedFileContent,
  onUpdateQuestions,
  onRephraseQuestion,
  onReparseWithGuidance,
  onSubmitFeedback,
  openWorkspace,
  onConfirmImport,
}) => {
  // Initialize internal questions list from parsedQuestions or detectedQuestions
  const initialQuestions: ExtractedQuestionItem[] = useMemo(() => {
    if (parsedQuestions && parsedQuestions.length > 0) {
      return parsedQuestions.map((q, idx) => ({
        ...q,
        id: q.id || `Q-${idx + 1}`,
        selected: q.selected !== false,
      }));
    }
    return detectedQuestions.map((text, idx) => ({
      id: `Q-${idx + 1}`,
      question_text: text,
      original_text: text,
      section: "General",
      expected_type: "narrative",
      selected: true,
    }));
  }, [parsedQuestions, detectedQuestions]);

  const [questions, setQuestions] = useState<ExtractedQuestionItem[]>(initialQuestions);

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  // Document Reference Viewer state
  const [showDocViewer, setShowDocViewer] = useState<boolean>(false);
  const [docViewMode, setDocViewMode] = useState<"split" | "drawer">("split");

  // Create native object URL for PDF/document preview
  const documentBlobUrl = useMemo(() => {
    if (!uploadedFile) return null;
    try {
      return URL.createObjectURL(uploadedFile);
    } catch {
      return null;
    }
  }, [uploadedFile]);

  useEffect(() => {
    return () => {
      if (documentBlobUrl) {
        URL.revokeObjectURL(documentBlobUrl);
      }
    };
  }, [documentBlobUrl]);

  // Curation & Filtering state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    id: string;
    question_text: string;
    section: string;
    expected_type: string;
  }>({ id: "", question_text: "", section: "General", expected_type: "narrative" });

  // Add Question state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newQuestionText, setNewQuestionText] = useState<string>("");
  const [newQuestionSection, setNewQuestionSection] = useState<string>("General");
  const [newQuestionType, setNewQuestionType] = useState<string>("narrative");

  // AI Rephrase state
  const [rephraseModalData, setRephraseModalData] = useState<{
    index: number;
    original: string;
    rephrased: string;
  } | null>(null);
  const [isRephrasing, setIsRephrasing] = useState<boolean>(false);

  // AI Re-Parse with Guidance state
  const [showReparseModal, setShowReparseModal] = useState<boolean>(false);
  const [reparseGuidance, setReparseGuidance] = useState<string>("");
  const [isReparsing, setIsReparsing] = useState<boolean>(false);

  // Feedback Tracking state
  const [feedbackRating, setFeedbackRating] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string>("");
  const [deletionsQueue, setDeletionsQueue] = useState<
    Array<{ id?: string; rejected_text: string; section?: string; reason: string }>
  >([]);
  const [editsQueue, setEditsQueue] = useState<
    Array<{ id?: string; original_text: string; corrected_text: string; section?: string }>
  >([]);
  const [additionsQueue, setAdditionsQueue] = useState<
    Array<{ question_text: string; section?: string; expected_type?: string }>
  >([]);

  // Sections summary
  const sectionsList = useMemo(() => {
    const set = new Set<string>();
    questions.forEach((q) => {
      if (q.section) set.add(q.section);
    });
    return Array.from(set).sort();
  }, [questions]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !searchQuery.trim() ||
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.section && q.section.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSection =
        selectedSection === "all" ||
        (q.section || "General").toLowerCase() === selectedSection.toLowerCase();

      return matchesSearch && matchesSection;
    });
  }, [questions, searchQuery, selectedSection]);

  const selectedCount = useMemo(() => {
    return questions.filter((q) => q.selected).length;
  }, [questions]);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredQuestions.length === 0) return false;
    return filteredQuestions.every((q) => q.selected);
  }, [filteredQuestions]);

  // Bulk Selection Handlers
  function toggleSelectAllFiltered() {
    const nextVal = !isAllFilteredSelected;
    const filteredIds = new Set(filteredQuestions.map((q) => q.id));
    const nextQuestions = questions.map((q) => {
      if (filteredIds.has(q.id)) {
        return { ...q, selected: nextVal };
      }
      return q;
    });
    setQuestions(nextQuestions);
    if (onUpdateQuestions) onUpdateQuestions(nextQuestions);
  }

  function toggleQuestionSelection(id: string) {
    const next = questions.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q));
    setQuestions(next);
    if (onUpdateQuestions) onUpdateQuestions(next);
  }

  // Delete Question Handler
  function handleDeleteQuestion(id: string) {
    const target = questions.find((q) => q.id === id);
    if (!target) return;

    setDeletionsQueue((prev) => [
      ...prev,
      {
        id: target.id,
        rejected_text: target.question_text,
        section: target.section,
        reason: "user_deleted_review",
      },
    ]);

    const next = questions.filter((q) => q.id !== id);
    setQuestions(next);
    if (onUpdateQuestions) onUpdateQuestions(next);
  }

  // Inline Edit Handlers
  function startEditing(q: ExtractedQuestionItem) {
    setEditingId(q.id);
    setEditForm({
      id: q.id,
      question_text: q.question_text,
      section: q.section || "General",
      expected_type: q.expected_type || "narrative",
    });
  }

  function saveEdit(id: string) {
    const original = questions.find((q) => q.id === id);
    if (original && original.question_text !== editForm.question_text) {
      setEditsQueue((prev) => [
        ...prev,
        {
          id,
          original_text: original.question_text,
          corrected_text: editForm.question_text,
          section: editForm.section,
        },
      ]);
    }

    const next = questions.map((q) =>
      q.id === id
        ? {
            ...q,
            id: editForm.id.trim() || q.id,
            question_text: editForm.question_text.trim(),
            section: editForm.section.trim() || "General",
            expected_type: editForm.expected_type,
            is_edited: true,
          }
        : q
    );
    setQuestions(next);
    setEditingId(null);
    if (onUpdateQuestions) onUpdateQuestions(next);
  }

  // Add Question Handler
  function handleAddQuestion() {
    if (!newQuestionText.trim()) return;

    const newId = `Q-${questions.length + 1}`;
    const newItem: ExtractedQuestionItem = {
      id: newId,
      question_text: newQuestionText.trim(),
      section: newQuestionSection.trim() || "General",
      expected_type: newQuestionType,
      selected: true,
      is_user_added: true,
    };

    setAdditionsQueue((prev) => [
      ...prev,
      {
        question_text: newItem.question_text,
        section: newItem.section,
        expected_type: newItem.expected_type,
      },
    ]);

    const next = [newItem, ...questions];
    setQuestions(next);
    setNewQuestionText("");
    setShowAddForm(false);
    if (onUpdateQuestions) onUpdateQuestions(next);
  }

  // AI Rephrase Trigger
  async function handleTriggerRephrase(q: ExtractedQuestionItem, index: number) {
    if (!onRephraseQuestion) return;
    setIsRephrasing(true);
    try {
      const suggested = await onRephraseQuestion(q.question_text);
      setRephraseModalData({
        index,
        original: q.question_text,
        rephrased: suggested,
      });
    } catch {
      alert("AI rephrasing failed. Please verify API configuration.");
    } finally {
      setIsRephrasing(false);
    }
  }

  function applyRephrase() {
    if (!rephraseModalData) return;
    const { index, original, rephrased } = rephraseModalData;
    const target = questions[index];
    if (!target) return;

    setEditsQueue((prev) => [
      ...prev,
      {
        id: target.id,
        original_text: original,
        corrected_text: rephrased,
        section: target.section,
      },
    ]);

    const next = [...questions];
    next[index] = {
      ...next[index],
      question_text: rephrased,
      is_rephrased: true,
    };
    setQuestions(next);
    setRephraseModalData(null);
    if (onUpdateQuestions) onUpdateQuestions(next);
  }

  // Complete Document Re-Parse
  async function handleExecuteReparse() {
    if (!onReparseWithGuidance) return;
    setIsReparsing(true);
    try {
      await onReparseWithGuidance(reparseGuidance);
      setShowReparseModal(false);
      setFeedbackNotice("Document successfully re-parsed with Gemini 2.5 Flash!");
      setTimeout(() => setFeedbackNotice(""), 4000);
    } catch {
      alert("Re-parsing failed. Ensure document is valid.");
    } finally {
      setIsReparsing(false);
    }
  }

  // Rating Feedback
  function handleRateAccuracy(rating: "thumbs_up" | "thumbs_down") {
    setFeedbackRating(rating);
    setFeedbackNotice(
      rating === "thumbs_up"
        ? "Thanks! Feedback recorded: High accuracy extraction."
        : "Feedback noted: AI model tuning flagged for this document format."
    );
    setTimeout(() => setFeedbackNotice(""), 3500);
  }

  // Final Action: Continue to Workspace
  function handleContinueToWorkspace() {
    const selectedQuestions = questions.filter((q) => q.selected);
    if (selectedQuestions.length === 0) return;

    // Submit telemetry
    if (onSubmitFeedback) {
      onSubmitFeedback({
        rating: feedbackRating,
        edits: editsQueue,
        deletions: deletionsQueue,
        additions: additionsQueue,
      });
    }

    if (onConfirmImport) {
      onConfirmImport(selectedQuestions);
    } else {
      openWorkspace();
    }
  }

  return (
    <div className={`import-page ${showDocViewer && docViewMode === "split" ? "split-mode-active" : ""}`}>
      {/* Header */}
      <header className="import-header">
        <div className="brand-mark" style={{ cursor: "pointer" }} onClick={onNavigateHome}>
          <span>R</span>
        </div>
        <div className="brand-name" style={{ cursor: "pointer" }} onClick={onNavigateHome}>
          RFP<span>Engine</span>
        </div>
        <span className="import-header-label">Questionnaire Curation Studio</span>

        <div className="import-header-right" style={{ marginLeft: "auto", display: "flex", gap: "10px", alignItems: "center" }}>
          {uploadedFile && (
            <button
              className={`toolbar-btn ${showDocViewer ? "active" : ""}`}
              onClick={() => setShowDocViewer(!showDocViewer)}
              title="Inspect the original PDF or file alongside extracted questions"
            >
              <FileText size={15} />
              {showDocViewer ? "Hide Original Doc" : "View Original Doc"}
            </button>
          )}
          <button
            className="primary-button continue-button"
            onClick={handleContinueToWorkspace}
            disabled={selectedCount === 0}
            style={{ margin: 0, padding: "8px 18px", fontSize: "13px" }}
          >
            Continue to Workspace ({selectedCount}) <ArrowUpRight size={15} />
          </button>
        </div>
      </header>

      {/* Main Content Layout (Flex with optional Split View) */}
      <div className="curation-studio-layout">
        {/* Left Side: Original Document Reference Panel (when active in split mode) */}
        {showDocViewer && (
          <aside className={`doc-reference-panel ${docViewMode === "drawer" ? "drawer-mode" : ""}`}>
            <div className="doc-reference-header">
              <div className="doc-reference-title">
                <FileText size={16} />
                <span>{uploadedFile?.name || "Original Document"}</span>
                {uploadedFile?.size && (
                  <span className="doc-size-badge">
                    {(uploadedFile.size / 1024).toFixed(0)} KB
                  </span>
                )}
              </div>
              <div className="doc-reference-controls">
                <button
                  className={`icon-tool-btn ${docViewMode === "split" ? "active" : ""}`}
                  onClick={() => setDocViewMode("split")}
                  title="Side-by-Side Split View"
                >
                  <Split size={14} />
                </button>
                <button
                  className={`icon-tool-btn ${docViewMode === "drawer" ? "active" : ""}`}
                  onClick={() => setDocViewMode("drawer")}
                  title="Slide-over Drawer View"
                >
                  <Maximize2 size={14} />
                </button>
                {documentBlobUrl && (
                  <>
                    <a
                      href={documentBlobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="icon-tool-btn"
                      title="Open Original in New Tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <a
                      href={documentBlobUrl}
                      download={uploadedFile?.name || "document"}
                      className="icon-tool-btn"
                      title="Download Original File"
                    >
                      <Download size={14} />
                    </a>
                  </>
                )}
                <button
                  className="icon-tool-btn close-doc-btn"
                  onClick={() => setShowDocViewer(false)}
                  title="Close Document Viewer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="doc-reference-body">
              {uploadedFile?.name.toLowerCase().endsWith(".pdf") && documentBlobUrl ? (
                <iframe
                  src={documentBlobUrl}
                  title="RFP Document Preview"
                  className="doc-preview-frame"
                />
              ) : (
                <div className="doc-text-fallback">
                  <pre>{uploadedFileContent || "Document preview available in external viewer."}</pre>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* Right Side: Main Curation Studio */}
        <main className="curation-main-content">
          <p className="breadcrumb">
            <span style={{ cursor: "pointer" }} onClick={onNavigateResponses || onNavigateHome}>
              Responses
            </span>{" "}
            <span>/</span> Review & Curate Questionnaire
          </p>

          <div className="curation-header-row">
            <div>
              <h1>Review & Curate Questionnaire</h1>
              <p className="curation-subtitle">
                Inspect, refine, or selectively choose extracted prompts before generating grounded responses.
              </p>
            </div>
          </div>

          {/* AI Extraction Banner with Feedback & Re-Parse */}
          <section className="ai-feedback-banner panel">
            <div className="ai-banner-left">
              <div className="ai-engine-badge">
                <Sparkles size={16} />
                <span>Gemini 2.5 Flash Grounded Parser</span>
              </div>
              <p className="ai-banner-desc">
                {sourceStatus || "Document parsed into structured compliance requirements."}
              </p>
              {feedbackNotice && <p className="feedback-toast-inline">✓ {feedbackNotice}</p>}
            </div>

            <div className="ai-banner-actions">
              <div className="accuracy-rate-group">
                <span className="rate-label">Extraction Quality:</span>
                <button
                  className={`rate-btn ${feedbackRating === "thumbs_up" ? "active-up" : ""}`}
                  onClick={() => handleRateAccuracy("thumbs_up")}
                  title="Good extraction accuracy"
                >
                  <ThumbsUp size={14} /> Accurate
                </button>
                <button
                  className={`rate-btn ${feedbackRating === "thumbs_down" ? "active-down" : ""}`}
                  onClick={() => handleRateAccuracy("thumbs_down")}
                  title="Extraction missed items or included noise"
                >
                  <ThumbsDown size={14} /> Needs Tuning
                </button>
              </div>

              {uploadedFile && (
                <button
                  className="outline-button reparse-btn"
                  onClick={() => setShowReparseModal(true)}
                  title="Re-run full extraction with custom Gemini guidance"
                >
                  <RefreshCw size={14} /> Re-Parse with AI
                </button>
              )}
            </div>
          </section>

          {/* Quick Upload / Re-Upload Strip */}
          <section className="import-source-mini panel">
            <div className="source-input-row">
              <div className="source-url-field">
                <Link size={15} />
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
                <Upload size={14} /> Replace File (.pdf, .docx, .xlsx, .csv)
                <input
                  type="file"
                  accept=".xlsx,.xls,.docx,.pdf,.csv,.tsv"
                  onChange={loadFormFile}
                />
              </label>
            </div>
          </section>

          {/* Interactive Curation Panel */}
          <section className="import-questions panel">
            {/* Toolbar */}
            <div className="curation-toolbar">
              <div className="toolbar-search">
                <Search size={15} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by question text, ID (e.g. SEC-01), or keyword..."
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="toolbar-actions">
                <button
                  className="outline-button add-question-btn"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus size={14} /> Add Question
                </button>
                <button
                  className="toolbar-btn"
                  onClick={toggleSelectAllFiltered}
                  title={isAllFilteredSelected ? "Deselect All" : "Select All"}
                >
                  {isAllFilteredSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  {isAllFilteredSelected ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            {/* Section Filter Pills */}
            {sectionsList.length > 1 && (
              <div className="section-pills-bar">
                <button
                  className={`section-pill ${selectedSection === "all" ? "active" : ""}`}
                  onClick={() => setSelectedSection("all")}
                >
                  All Sections ({questions.length})
                </button>
                {sectionsList.map((sec) => {
                  const count = questions.filter((q) => (q.section || "General") === sec).length;
                  return (
                    <button
                      key={sec}
                      className={`section-pill ${selectedSection.toLowerCase() === sec.toLowerCase() ? "active" : ""}`}
                      onClick={() => setSelectedSection(sec)}
                    >
                      {sec} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Add Question Inline Form */}
            {showAddForm && (
              <div className="add-question-card panel">
                <h3>Add Missing Requirement / Question</h3>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="e.g. Describe your enterprise data retention and automated deletion procedures."
                  rows={2}
                />
                <div className="add-question-row">
                  <div className="form-group">
                    <label>Section / Category:</label>
                    <input
                      value={newQuestionSection}
                      onChange={(e) => setNewQuestionSection(e.target.value)}
                      placeholder="e.g. Data Protection"
                    />
                  </div>
                  <div className="form-group">
                    <label>Expected Answer Type:</label>
                    <select
                      value={newQuestionType}
                      onChange={(e) => setNewQuestionType(e.target.value)}
                    >
                      <option value="narrative">Narrative (Detailed response)</option>
                      <option value="choice">Choice (Yes / No / Comply)</option>
                      <option value="numeric">Numeric (SLA / Hours / Count)</option>
                    </select>
                  </div>
                  <div className="add-question-actions">
                    <button className="primary-button" onClick={handleAddQuestion} disabled={!newQuestionText.trim()}>
                      Add to Review List
                    </button>
                    <button className="outline-button" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Question List Header Info */}
            <div className="import-question-heading">
              <div>
                <p className="eyebrow">
                  Showing {filteredQuestions.length} of {questions.length} questions
                </p>
                <h2>{selectedCount} questions selected for workspace import</h2>
              </div>
              <span className="source-count">
                {questions.length - selectedCount > 0
                  ? `${questions.length - selectedCount} skipped`
                  : "All questions included"}
              </span>
            </div>

            {/* Question Cards */}
            {filteredQuestions.length ? (
              <div className="import-question-list">
                {filteredQuestions.map((q, index) => {
                  const isEditing = editingId === q.id;

                  return (
                    <div
                      className={`import-question-card ${q.selected ? "selected" : "deselected"}`}
                      key={q.id}
                    >
                      {/* Left: Checkbox & ID */}
                      <div className="q-card-left">
                        <button
                          className="checkbox-btn"
                          onClick={() => toggleQuestionSelection(q.id)}
                          title={q.selected ? "Exclude from workspace" : "Include in workspace"}
                        >
                          {q.selected ? (
                            <CheckSquare size={18} className="checked-icon" />
                          ) : (
                            <Square size={18} className="unchecked-icon" />
                          )}
                        </button>
                        <span className="source-rank">{q.id}</span>
                      </div>

                      {/* Center: Content or Edit Mode */}
                      <div className="q-card-center">
                        {isEditing ? (
                          <div className="inline-edit-box">
                            <textarea
                              value={editForm.question_text}
                              onChange={(e) =>
                                setEditForm({ ...editForm, question_text: e.target.value })
                              }
                              rows={2}
                            />
                            <div className="edit-meta-row">
                              <input
                                value={editForm.section}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, section: e.target.value })
                                }
                                placeholder="Section / Category"
                              />
                              <select
                                value={editForm.expected_type}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, expected_type: e.target.value })
                                }
                              >
                                <option value="narrative">Narrative</option>
                                <option value="choice">Choice (Yes/No)</option>
                                <option value="numeric">Numeric Metric</option>
                              </select>
                              <button
                                className="primary-button save-edit-btn"
                                onClick={() => saveEdit(q.id)}
                              >
                                Save
                              </button>
                              <button
                                className="outline-button cancel-edit-btn"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="q-text-line">
                              <span>{q.question_text}</span>
                              {q.is_user_added && <span className="pill-badge user-added">Added</span>}
                              {q.is_edited && <span className="pill-badge edited">Edited</span>}
                              {q.is_rephrased && <span className="pill-badge rephrased">✨ AI Rephrased</span>}
                            </div>
                            <div className="q-tags-line">
                              {q.section && (
                                <span className="section-tag" onClick={() => setSelectedSection(q.section || "all")}>
                                  📁 {q.section}
                                </span>
                              )}
                              <span className="type-tag">
                                {q.expected_type === "choice"
                                  ? "⚖️ Yes/No Choice"
                                  : q.expected_type === "numeric"
                                  ? "🔢 Metric SLA"
                                  : "📝 Narrative"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right: Actions */}
                      {!isEditing && (
                        <div className="q-card-right">
                          {onRephraseQuestion && (
                            <button
                              className="card-tool-btn rephrase-trigger"
                              onClick={() => handleTriggerRephrase(q, index)}
                              disabled={isRephrasing}
                              title="Rephrase and clean wording with Gemini 2.5 Flash"
                            >
                              <Sparkles size={14} /> Rephrase
                            </button>
                          )}
                          <button
                            className="card-tool-btn"
                            onClick={() => startEditing(q)}
                            title="Edit question text and section"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="card-tool-btn delete-btn"
                            onClick={() => handleDeleteQuestion(q.id)}
                            title="Remove false-positive question"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-import">
                {searchQuery || selectedSection !== "all"
                  ? "No questions match your current filter criteria."
                  : "Load a URL or upload a form file to see its questions here."}
              </p>
            )}

            {/* Bottom Primary CTA */}
            <div className="curation-footer-bar">
              <span className="footer-summary">
                Ready to draft answers for <strong>{selectedCount}</strong> curated questions
              </span>
              <button
                className="primary-button continue-button"
                onClick={handleContinueToWorkspace}
                disabled={selectedCount === 0}
              >
                Import {selectedCount} Questions to Workspace <ArrowUpRight size={15} />
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* AI Rephrase Modal */}
      {rephraseModalData && (
        <div className="modal-overlay">
          <div className="modal-card rephrase-diff-modal">
            <div className="modal-header">
              <div className="modal-title-row">
                <Sparkles size={18} style={{ color: "#d97706" }} />
                <h3>Question Rephrasing with Gemini 2.5 Flash</h3>
              </div>
              <button className="close-btn" onClick={() => setRephraseModalData(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="rephrase-diff-body">
              <div className="diff-panel original">
                <h4>Original Text</h4>
                <p>{rephraseModalData.original}</p>
              </div>
              <div className="diff-panel suggested">
                <h4>Suggested Rephrasing</h4>
                <p>{rephraseModalData.rephrased}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-button" onClick={applyRephrase}>
                Accept Rephrase
              </button>
              <button className="outline-button" onClick={() => setRephraseModalData(null)}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Re-Parse Modal */}
      {showReparseModal && (
        <div className="modal-overlay">
          <div className="modal-card reparse-modal">
            <div className="modal-header">
              <div className="modal-title-row">
                <RefreshCw size={18} style={{ color: "#2563eb" }} />
                <h3>Re-Parse Document with Gemini 2.5 Flash</h3>
              </div>
              <button className="close-btn" onClick={() => setShowReparseModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="reparse-modal-body">
              <p className="reparse-desc">
                Provide custom extraction guidance to tune how Gemini reads your RFP (e.g. split compound items or focus on specific technical sections).
              </p>
              <textarea
                value={reparseGuidance}
                onChange={(e) => setReparseGuidance(e.target.value)}
                placeholder="e.g. Focus exclusively on Section 3 Security Requirements and split multi-part questions into individual items."
                rows={3}
              />
              <div className="guidance-chips">
                <span className="chips-label">Quick Suggestions:</span>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setReparseGuidance("Focus on Technical Security and Data Protection requirements only.")}
                >
                  Security Only
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setReparseGuidance("Split all compound or multi-part questions into separate items.")}
                >
                  Split Compound Items
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setReparseGuidance("Extract every bullet point and sub-item as an individual question.")}
                >
                  Extract All Bullets
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={handleExecuteReparse}
                disabled={isReparsing}
              >
                {isReparsing ? "Re-Parsing..." : "Re-Parse Document 🔄"}
              </button>
              <button
                className="outline-button"
                onClick={() => setShowReparseModal(false)}
                disabled={isReparsing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
