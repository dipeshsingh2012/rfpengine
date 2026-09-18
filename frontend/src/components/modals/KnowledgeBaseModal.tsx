import React from "react";
import {
  FolderOpen,
  Zap,
  X,
  Upload,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Tag,
  FileText,
  Play,
  Sparkles,
  Database,
} from "lucide-react";
import { KBItem, SearchResponse, sampleDemoFiles, playgroundStarterQueries } from "../../types";

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: "upload" | "playground";
  setTab: (tab: "upload" | "playground") => void;
  isDragOver: boolean;
  setIsDragOver: (dragOver: boolean) => void;
  isUploadingKB: boolean;
  handleKBUpload: (file: File) => void;
  kbUploadMsg: { text: string; isError?: boolean } | null;
  isFetchingKB: boolean;
  kbEntries: KBItem[];
  fetchKBEntries: () => void;
  handleDeleteKBEntry: (id: string) => void;
  playgroundTopK: number;
  setPlaygroundTopK: (k: number) => void;
  playgroundQuery: string;
  setPlaygroundQuery: (q: string) => void;
  playgroundLoading: boolean;
  handlePlaygroundSearch: (queryOverride?: string) => void;
  playgroundError: string | null;
  playgroundResult: SearchResponse | null;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  tab,
  setTab,
  isDragOver,
  setIsDragOver,
  isUploadingKB,
  handleKBUpload,
  kbUploadMsg,
  isFetchingKB,
  kbEntries,
  fetchKBEntries,
  handleDeleteKBEntry,
  playgroundTopK,
  setPlaygroundTopK,
  playgroundQuery,
  setPlaygroundQuery,
  playgroundLoading,
  handlePlaygroundSearch,
  playgroundError,
  playgroundResult,
}) => {
  if (!isOpen) return null;

  return (
    <div className="kb-modal-backdrop" onClick={onClose}>
      <div className="kb-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal-header">
          <div className="kb-modal-tabs">
            <button
              className={`kb-tab-btn ${tab === "upload" ? "active" : ""}`}
              onClick={() => setTab("upload")}
            >
              <FolderOpen size={16} /> Documents & Ingestion
            </button>
            <button
              className={`kb-tab-btn ${tab === "playground" ? "active" : ""}`}
              onClick={() => setTab("playground")}
            >
              <Zap size={16} /> Retrieval Playground
            </button>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close Knowledge Base modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="kb-modal-body">
          {tab === "upload" ? (
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
                    Drag & drop or select files. Supported: <code>.xlsx</code>, <code>.xls</code>, <code>.docx</code>, <code>.pdf</code>, <code>.csv</code>, <code>.txt</code>, <code>.md</code>
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
                      accept=".xlsx,.xls,.docx,.pdf,.csv,.tsv,.txt,.md"
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
                  <span className="eyebrow" style={{ color: "var(--blue)" }}>
                    Demo Sample Knowledge Documents
                  </span>
                  <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Single-click to download sample files for live upload demonstration
                  </small>
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
              <div
                className="kb-records-header"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
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
                  onClick={fetchKBEntries}
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
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "var(--muted)",
                      fontSize: "12px",
                    }}
                  >
                    No knowledge records found. Upload a file above or click a sample document to get started.
                  </div>
                )}

                {isFetchingKB && kbEntries.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "30px",
                      color: "var(--muted)",
                      fontSize: "12px",
                    }}
                  >
                    <RefreshCw
                      size={16}
                      className="spin"
                      style={{ display: "inline-block", marginRight: "8px", verticalAlign: "middle" }}
                    />
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
                    <strong style={{ fontSize: "14px" }}>
                      Knowledge Retrieval & AI Answering Playground
                    </strong>
                    <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "11px" }}>
                      Test questions against your knowledge base with real-time AI answer generation and source retrieval
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px",
                      color: "var(--muted)",
                    }}
                  >
                    <span>Depth:</span>
                    <select
                      value={playgroundTopK}
                      onChange={(e) => setPlaygroundTopK(Number(e.target.value))}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid var(--line)",
                        background: "#fff",
                        fontSize: "12px",
                      }}
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
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
                    Try sample questions:
                  </span>
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
                      <strong
                        style={{
                          fontSize: "13px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Sparkles size={15} color="var(--blue)" /> Grounded AI Formulation
                      </strong>
                      <span
                        className={`kb-confidence-badge ${
                          playgroundResult.confidence_score >= 0.85
                            ? "confidence-high"
                            : "confidence-med"
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
                    <strong
                      style={{
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Database size={15} color="var(--navy)" /> Retrieved Source Chunks (
                      {playgroundResult.sources.length})
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
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            padding: "10px 0",
                          }}
                        >
                          No matching sources found in knowledge base for this query.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!playgroundResult && !playgroundLoading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "var(--muted)",
                    background: "#fff",
                    border: "1px solid var(--line)",
                  }}
                >
                  <Zap size={28} color="var(--blue)" style={{ marginBottom: "8px" }} />
                  <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>
                    Test Knowledge Base Answering
                  </div>
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
  );
};

