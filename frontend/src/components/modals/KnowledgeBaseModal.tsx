import React, { useState, useEffect } from "react";
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
  Globe,
  GitBranch,
  Cloud,
  Award,
  Plus,
  Clock,
  Check,
  ExternalLink,
  Shield,
  Activity,
} from "lucide-react";
import {
  KBItem,
  KBSourceItem,
  KBSyncLogItem,
  KBSourceCreatePayload,
  SearchResponse,
  sampleDemoFiles,
  playgroundStarterQueries,
} from "../../types";

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: "upload" | "connectors" | "playground";
  setTab: (tab: "upload" | "connectors" | "playground") => void;
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
  apiBaseUrl?: string;
  tenantId?: string;
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
  apiBaseUrl = "",
  tenantId = "acme-corp",
}) => {
  // Automated Sync & Connectors state
  const [sources, setSources] = useState<KBSourceItem[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingSourceIds, setSyncingSourceIds] = useState<Set<string>>(new Set());
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSourceForLogs, setSelectedSourceForLogs] = useState<KBSourceItem | null>(null);
  const [sourceLogs, setSourceLogs] = useState<KBSyncLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  // New Source Form State
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<"web_crawler" | "github_docs" | "cloud_storage" | "rfp_harvest">("web_crawler");
  const [newSourceUrl, setNewSourceUrl] = useState("https://trust.acme.corp/security");
  const [newSourceRepo, setNewSourceRepo] = useState("acme-corp/compliance-docs");
  const [newSourceBranch, setNewSourceBranch] = useState("main");
  const [newSourceFiles, setNewSourceFiles] = useState("SECURITY.md, docs/soc2.md");
  const [newSourceFolder, setNewSourceFolder] = useState("/var/data/compliance");
  const [newSourceCategory, setNewSourceCategory] = useState("Compliance & Security");
  const [newSourceSchedule, setNewSourceSchedule] = useState("daily");
  const [isSubmittingSource, setIsSubmittingSource] = useState(false);

  // Fetch sources when connectors tab is activated
  useEffect(() => {
    if (isOpen && tab === "connectors") {
      fetchSources();
    }
  }, [isOpen, tab, apiBaseUrl, tenantId]);

  async function fetchSources() {
    setIsLoadingSources(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (err) {
      console.warn("Failed to fetch knowledge base sources:", err);
    } finally {
      setIsLoadingSources(false);
    }
  }

  async function handleCreateSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    setIsSubmittingSource(true);
    setSyncNotice(null);

    let config: Record<string, any> = {
      category: newSourceCategory,
    };

    if (newSourceType === "web_crawler") {
      const urls = newSourceUrl.split(",").map((u) => u.trim()).filter(Boolean);
      config.urls = urls;
    } else if (newSourceType === "github_docs") {
      config.repo = newSourceRepo.trim();
      config.branch = newSourceBranch.trim() || "main";
      config.files = newSourceFiles.split(",").map((f) => f.trim()).filter(Boolean);
    } else if (newSourceType === "cloud_storage") {
      config.folder_path = newSourceFolder.trim();
    } else if (newSourceType === "rfp_harvest") {
      config.auto_harvest_approved = true;
    }

    try {
      const payload: KBSourceCreatePayload = {
        name: newSourceName.trim(),
        source_type: newSourceType,
        config,
        schedule_frequency: newSourceSchedule,
        tenant_id: tenantId,
      };

      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      setSources((prev) => [created, ...prev]);
      setShowAddSourceModal(false);
      resetNewSourceForm();

      setSyncNotice({ text: `Source '${created.name}' created! Triggering initial sync...` });
      // Trigger initial sync automatically
      await handleSyncSource(created.id);
    } catch (err: any) {
      console.error("Failed to create source:", err);
      setSyncNotice({ text: `Failed to create source: ${err.message}`, isError: true });
    } finally {
      setIsSubmittingSource(false);
    }
  }

  function resetNewSourceForm() {
    setNewSourceName("");
    setNewSourceType("web_crawler");
    setNewSourceUrl("https://trust.acme.corp/security");
    setNewSourceRepo("acme-corp/compliance-docs");
    setNewSourceBranch("main");
    setNewSourceFiles("SECURITY.md, docs/soc2.md");
    setNewSourceFolder("/var/data/compliance");
    setNewSourceCategory("Compliance & Security");
    setNewSourceSchedule("daily");
  }

  async function handleSyncSource(sourceId: string) {
    setSyncingSourceIds((prev) => new Set(prev).add(sourceId));
    setSyncNotice(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/knowledge-base/sources/${sourceId}/sync?tenant_id=${tenantId}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const log = await res.json();
      setSyncNotice({
        text: `Synced ${log.chunks_created} new passage${log.chunks_created === 1 ? "" : "s"} (${log.chunks_pruned} pruned) in ${log.duration_seconds}s.`,
      });
      await fetchSources();
      fetchKBEntries();
    } catch (err: any) {
      console.error(`Sync error for ${sourceId}:`, err);
      setSyncNotice({ text: `Sync failed for source: ${err.message}`, isError: true });
    } finally {
      setSyncingSourceIds((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }

  async function handleSyncAllSources() {
    setIsSyncingAll(true);
    setSyncNotice(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sync-all?tenant_id=${tenantId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const logs: KBSyncLogItem[] = await res.json();
      const totalCreated = logs.reduce((acc, l) => acc + (l.chunks_created || 0), 0);
      const totalPruned = logs.reduce((acc, l) => acc + (l.chunks_pruned || 0), 0);
      setSyncNotice({
        text: `Continuous sync complete across ${logs.length} source${logs.length === 1 ? "" : "s"}: +${totalCreated} chunks indexed, ${totalPruned} obsolete pruned.`,
      });
      await fetchSources();
      fetchKBEntries();
    } catch (err: any) {
      console.error("Sync all error:", err);
      setSyncNotice({ text: `Sync All failed: ${err.message}`, isError: true });
    } finally {
      setIsSyncingAll(false);
    }
  }

  async function handleDeleteSource(sourceId: string) {
    if (!window.confirm("Delete this ingestion source? All associated passages will be pruned from PostgreSQL, Algolia, and Pinecone.")) return;
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/knowledge-base/sources/${sourceId}?tenant_id=${tenantId}&prune_chunks=true`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
        setSyncNotice({ text: "Source deleted and obsolete indexed passages pruned." });
        fetchKBEntries();
      }
    } catch (err) {
      console.error("Delete source error:", err);
    }
  }

  async function handleViewLogs(source: KBSourceItem) {
    setSelectedSourceForLogs(source);
    setShowLogsModal(true);
    setIsLoadingLogs(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/knowledge-base/sources/${source.id}/logs?tenant_id=${tenantId}&limit=20`
      );
      if (res.ok) {
        const logs = await res.json();
        setSourceLogs(logs);
      }
    } catch (err) {
      console.warn("Failed to fetch logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }

  function getSourceIcon(type: string) {
    switch (type) {
      case "web_crawler":
        return <Globe size={18} color="var(--blue)" />;
      case "github_docs":
        return <GitBranch size={18} color="#8b5cf6" />;
      case "cloud_storage":
        return <Cloud size={18} color="#0284c7" />;
      case "rfp_harvest":
        return <Award size={18} color="#f59e0b" />;
      default:
        return <Database size={18} color="var(--primary)" />;
    }
  }

  function getSourceTypeLabel(type: string) {
    switch (type) {
      case "web_crawler":
        return "Web Trust Portal";
      case "github_docs":
        return "GitHub Repository";
      case "cloud_storage":
        return "Cloud Storage";
      case "rfp_harvest":
        return "RFP SME Harvester";
      default:
        return type;
    }
  }

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
              className={`kb-tab-btn ${tab === "connectors" ? "active" : ""}`}
              onClick={() => setTab("connectors")}
            >
              <RefreshCw size={16} className={isSyncingAll ? "spin" : ""} /> Automated Sync & Connectors
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
          {/* TAB 1: UPLOAD */}
          {tab === "upload" && (
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
                    Synchronized across PostgreSQL, Algolia (lexical), and Pinecone (768-dim embeddings).
                  </p>
                </div>
                <button
                  className="icon-button"
                  onClick={fetchKBEntries}
                  title="Refresh knowledge entries"
                >
                  <RefreshCw size={14} className={isFetchingKB ? "spin" : ""} />
                </button>
              </div>

              {/* Entries Table */}
              <div className="kb-records-list">
                {isFetchingKB ? (
                  <div className="kb-empty-state">
                    <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px" }} />
                    <p>Loading indexed knowledge entries...</p>
                  </div>
                ) : kbEntries.length === 0 ? (
                  <div className="kb-empty-state">
                    <Database size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                    <p style={{ fontWeight: 600 }}>No knowledge entries found</p>
                    <small style={{ color: "var(--muted)" }}>
                      Upload a document above or configure an Automated Connector to populate the knowledge base.
                    </small>
                  </div>
                ) : (
                  kbEntries.map((entry) => (
                    <div key={entry.id} className="kb-record-card">
                      <div className="kb-record-body">
                        <div className="kb-record-top">
                          <span className="kb-record-title">
                            {entry.title || entry.question || "Untitled Entry"}
                          </span>
                          {entry.category && (
                            <span className="badge category-badge">
                              <Tag size={10} /> {entry.category}
                            </span>
                          )}
                        </div>
                        <p className="kb-record-content">
                          {entry.content || entry.answer || ""}
                        </p>
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div className="kb-record-meta">
                            {entry.metadata.source_file && (
                              <span>📄 {entry.metadata.source_file}</span>
                            )}
                            {entry.metadata.source_url && (
                              <span>🌐 {entry.metadata.source_url}</span>
                            )}
                            {entry.metadata.page_number && (
                              <span>p. {entry.metadata.page_number}</span>
                            )}
                            {entry.metadata.is_golden_qa && (
                              <span className="badge" style={{ background: "#fef3c7", color: "#92400e" }}>
                                🏆 Golden Q&A
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        className="icon-button kb-delete-btn"
                        onClick={() => handleDeleteKBEntry(entry.id)}
                        title="Delete entry from all indices"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* TAB 2: AUTOMATED SYNC & CONNECTORS */}
          {tab === "connectors" && (
            <div className="kb-connectors-studio">
              {/* Top Banner */}
              <div className="kb-connectors-banner">
                <div className="kb-connectors-banner-text">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Shield size={20} color="var(--blue)" />
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                      Continuous Knowledge Synchronization Engine
                    </h3>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "12px", lineHeight: 1.5 }}>
                    Automate ingestion from enterprise trust centers, Git repos, cloud buckets, and approved RFP responses.
                    The engine computes SHA-256 delta hashes, generates 300-500 token semantic passages, and synchronizes 
                    PostgreSQL, Algolia, and Pinecone with atomic pruning of obsolete passages.
                  </p>
                </div>
                <div className="kb-connectors-actions">
                  <button
                    className="button secondary"
                    onClick={handleSyncAllSources}
                    disabled={isSyncingAll || sources.length === 0}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <RefreshCw size={14} className={isSyncingAll ? "spin" : ""} />
                    {isSyncingAll ? "Syncing All Sources..." : "⚡ Sync All Sources"}
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      resetNewSourceForm();
                      setShowAddSourceModal(true);
                    }}
                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <Plus size={15} /> New Ingestion Source
                  </button>
                </div>
              </div>

              {/* Sync Alert Notice */}
              {syncNotice && (
                <div
                  className={`kb-alert ${
                    syncNotice.isError ? "kb-alert-error" : "kb-alert-success"
                  }`}
                  style={{ margin: "16px 0" }}
                >
                  {syncNotice.isError ? (
                    <AlertCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  <span>{syncNotice.text}</span>
                </div>
              )}

              {/* Connector Quick-Cards */}
              <div className="kb-connector-types-grid">
                <div
                  className="kb-connector-type-card"
                  onClick={() => {
                    resetNewSourceForm();
                    setNewSourceType("web_crawler");
                    setNewSourceName("Company Trust Center");
                    setShowAddSourceModal(true);
                  }}
                >
                  <div className="kb-connector-icon" style={{ background: "#eff6ff" }}>
                    <Globe size={22} color="#2563eb" />
                  </div>
                  <div className="kb-connector-info">
                    <h4>Web Trust Center Crawler</h4>
                    <p>Extract and synchronize public security portals, Notion, and compliance documentation.</p>
                  </div>
                  <span className="kb-connector-add-badge">+ Add</span>
                </div>

                <div
                  className="kb-connector-type-card"
                  onClick={() => {
                    resetNewSourceForm();
                    setNewSourceType("github_docs");
                    setNewSourceName("GitHub Architecture & Security Docs");
                    setShowAddSourceModal(true);
                  }}
                >
                  <div className="kb-connector-icon" style={{ background: "#f5f3ff" }}>
                    <GitBranch size={22} color="#7c3aed" />
                  </div>
                  <div className="kb-connector-info">
                    <h4>GitHub Documentation</h4>
                    <p>Pull markdown policies, RFCs, and security specifications directly from Git repos.</p>
                  </div>
                  <span className="kb-connector-add-badge">+ Add</span>
                </div>

                <div
                  className="kb-connector-type-card"
                  onClick={() => {
                    resetNewSourceForm();
                    setNewSourceType("cloud_storage");
                    setNewSourceName("S3 / Cloud Security Whitepapers");
                    setShowAddSourceModal(true);
                  }}
                >
                  <div className="kb-connector-icon" style={{ background: "#f0fdf4" }}>
                    <Cloud size={22} color="#16a34a" />
                  </div>
                  <div className="kb-connector-info">
                    <h4>Cloud Storage Watcher</h4>
                    <p>Watch S3/GCS buckets or directories for updated PDF/DOCX whitepapers with delta hashing.</p>
                  </div>
                  <span className="kb-connector-add-badge">+ Add</span>
                </div>

                <div
                  className="kb-connector-type-card"
                  onClick={() => {
                    resetNewSourceForm();
                    setNewSourceType("rfp_harvest");
                    setNewSourceName("Approved RFP SME Answer Harvester");
                    setNewSourceCategory("Golden Q&A");
                    setShowAddSourceModal(true);
                  }}
                >
                  <div className="kb-connector-icon" style={{ background: "#fffbeb" }}>
                    <Award size={22} color="#d97706" />
                  </div>
                  <div className="kb-connector-info">
                    <h4>RFP SME Auto-Harvester</h4>
                    <p>Harvest human-approved answers into Golden Q&A with 1.75x RRF authority weighting.</p>
                  </div>
                  <span className="kb-connector-add-badge">+ Add</span>
                </div>
              </div>

              {/* Configured Sources List */}
              <div className="kb-sources-section">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                      Configured Ingestion Sources ({sources.length})
                    </h4>
                    <p style={{ margin: "2px 0 0", color: "var(--muted)", fontSize: "11px" }}>
                      Active continuous connectors monitored by the background sync service.
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    onClick={fetchSources}
                    title="Refresh sources list"
                  >
                    <RefreshCw size={14} className={isLoadingSources ? "spin" : ""} />
                  </button>
                </div>

                {isLoadingSources ? (
                  <div className="kb-empty-state">
                    <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px" }} />
                    <p>Loading configured sources...</p>
                  </div>
                ) : sources.length === 0 ? (
                  <div className="kb-empty-state" style={{ padding: "36px 20px" }}>
                    <Activity size={36} style={{ margin: "0 auto 10px", opacity: 0.35 }} />
                    <p style={{ fontWeight: 600, fontSize: "14px" }}>No automated sources configured</p>
                    <p style={{ color: "var(--muted)", fontSize: "12px", maxWidth: "420px", margin: "6px auto 16px" }}>
                      Select a connector above to establish automated syncing from your trust portal, Git repository, or completed questionnaires.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => {
                        resetNewSourceForm();
                        setShowAddSourceModal(true);
                      }}
                    >
                      <Plus size={14} /> Add First Ingestion Source
                    </button>
                  </div>
                ) : (
                  <div className="kb-sources-list">
                    {sources.map((src) => {
                      const isSyncingThis = syncingSourceIds.has(src.id);
                      return (
                        <div key={src.id} className="kb-source-card">
                          <div className="kb-source-card-main">
                            <div className="kb-source-icon-wrapper">
                              {getSourceIcon(src.source_type)}
                            </div>
                            <div className="kb-source-meta-block">
                              <div className="kb-source-headline">
                                <span className="kb-source-name">{src.name}</span>
                                <span className="badge" style={{ fontSize: "10px", padding: "1px 6px" }}>
                                  {getSourceTypeLabel(src.source_type)}
                                </span>
                                <span
                                  className={`kb-source-status-pill status-${src.status}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    fontWeight: 600,
                                    background:
                                      src.status === "success"
                                        ? "#ecfdf5"
                                        : src.status === "syncing" || isSyncingThis
                                        ? "#eff6ff"
                                        : src.status === "error"
                                        ? "#fef2f2"
                                        : "#f3f4f6",
                                    color:
                                      src.status === "success"
                                        ? "#047857"
                                        : src.status === "syncing" || isSyncingThis
                                        ? "#1d4ed8"
                                        : src.status === "error"
                                        ? "#b91c1c"
                                        : "#4b5563",
                                  }}
                                >
                                  {src.status === "syncing" || isSyncingThis ? (
                                    <>
                                      <RefreshCw size={11} className="spin" /> Syncing...
                                    </>
                                  ) : src.status === "success" ? (
                                    <>
                                      <Check size={11} /> Synced
                                    </>
                                  ) : src.status === "error" ? (
                                    <>
                                      <AlertCircle size={11} /> Error
                                    </>
                                  ) : (
                                    <>
                                      <Clock size={11} /> Idle
                                    </>
                                  )}
                                </span>
                              </div>

                              <div className="kb-source-details-row">
                                <span className="kb-source-schedule">
                                  <Clock size={11} /> {src.schedule_frequency.toUpperCase()}
                                </span>
                                {src.metrics?.chunks_count !== undefined && (
                                  <span className="kb-source-passages">
                                    <Tag size={11} /> {src.metrics.chunks_count} passages indexed
                                  </span>
                                )}
                                {src.last_synced_at && (
                                  <span className="kb-source-time">
                                    Last sync: {new Date(src.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>

                              {src.last_error && (
                                <p className="kb-source-error-text">
                                  ⚠️ {src.last_error}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="kb-source-actions">
                            <button
                              className="button secondary sm"
                              onClick={() => handleSyncSource(src.id)}
                              disabled={isSyncingThis}
                              title="Trigger immediate synchronization"
                              style={{ display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <RefreshCw size={12} className={isSyncingThis ? "spin" : ""} />
                              {isSyncingThis ? "Syncing..." : "Sync Now"}
                            </button>
                            <button
                              className="button text sm"
                              onClick={() => handleViewLogs(src)}
                              title="View execution audit logs"
                            >
                              Logs
                            </button>
                            <button
                              className="icon-button kb-delete-btn"
                              onClick={() => handleDeleteSource(src.id)}
                              title="Delete source and prune chunks"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PLAYGROUND */}
          {tab === "playground" && (
            <div className="playground-container">
              {/* Starter Query Chips */}
              <div className="playground-starters">
                <span className="eyebrow" style={{ color: "var(--muted)" }}>
                  Try asking:
                </span>
                {playgroundStarterQueries.map((q) => (
                  <button
                    key={q}
                    className="starter-chip"
                    onClick={() => {
                      setPlaygroundQuery(q);
                      handlePlaygroundSearch(q);
                    }}
                  >
                    <Sparkles size={11} />
                    {q}
                  </button>
                ))}
              </div>

              {/* Query Input Box */}
              <div className="playground-input-card">
                <div className="playground-input-row">
                  <input
                    type="text"
                    className="playground-input"
                    placeholder="Enter compliance or security requirement to test hybrid retrieval..."
                    value={playgroundQuery}
                    onChange={(e) => setPlaygroundQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handlePlaygroundSearch();
                    }}
                  />
                  <div className="top-k-selector">
                    <label>Top K</label>
                    <select
                      value={playgroundTopK}
                      onChange={(e) => setPlaygroundTopK(Number(e.target.value))}
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => handlePlaygroundSearch()}
                    disabled={playgroundLoading || !playgroundQuery.trim()}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {playgroundLoading ? (
                      <>
                        <RefreshCw size={14} className="spin" /> Searching...
                      </>
                    ) : (
                      <>
                        <Play size={14} /> Search & Reason
                      </>
                    )}
                  </button>
                </div>
              </div>

              {playgroundError && (
                <div className="kb-alert kb-alert-error" style={{ margin: "16px 0" }}>
                  <AlertCircle size={16} />
                  <span>{playgroundError}</span>
                </div>
              )}

              {/* Playground Results */}
              {playgroundResult && (
                <div className="playground-results">
                  {/* Generated Answer Card */}
                  <div className="playground-answer-card">
                    <div className="answer-header">
                      <div className="answer-badge">
                        <Sparkles size={14} />
                        <span>Gemini 2.5 Flash Synthesis</span>
                      </div>
                      <div className="confidence-pill">
                        Confidence:{" "}
                        <strong>
                          {Math.round(playgroundResult.confidence_score * 100)}%
                        </strong>
                      </div>
                    </div>
                    <p className="answer-text">{playgroundResult.suggested_answer}</p>
                    {playgroundResult.tone_applied && (
                      <div className="answer-meta">
                        <span>Tone: {playgroundResult.tone_applied}</span>
                      </div>
                    )}
                  </div>

                  {/* Retrieved Sources Section */}
                  <div className="playground-sources-section">
                    <h4>
                      Retrieved Evidence Passages ({playgroundResult.sources.length})
                    </h4>
                    <div className="playground-sources-list">
                      {playgroundResult.sources.map((src, i) => (
                        <div key={src.id || i} className="playground-source-card">
                          <div className="source-card-header">
                            <span className="source-title">
                              {src.question || `Passage #${i + 1}`}
                            </span>
                            <span className="source-score">
                              RRF Score: {(src.score || 0).toFixed(4)}
                            </span>
                          </div>
                          <p className="source-answer">{src.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD INGESTION SOURCE */}
      {showAddSourceModal && (
        <div className="kb-submodal-backdrop" onClick={() => setShowAddSourceModal(false)}>
          <div className="kb-submodal-container" onClick={(e) => e.stopPropagation()}>
            <div className="kb-submodal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {getSourceIcon(newSourceType)}
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                  Configure New Ingestion Source
                </h3>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowAddSourceModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSource} className="kb-submodal-form">
              <div className="form-group">
                <label>Source Type</label>
                <div className="kb-type-selector-tabs">
                  <button
                    type="button"
                    className={`kb-type-btn ${newSourceType === "web_crawler" ? "active" : ""}`}
                    onClick={() => {
                      setNewSourceType("web_crawler");
                      if (!newSourceName) setNewSourceName("Company Trust Center");
                    }}
                  >
                    <Globe size={14} /> Web Crawler
                  </button>
                  <button
                    type="button"
                    className={`kb-type-btn ${newSourceType === "github_docs" ? "active" : ""}`}
                    onClick={() => {
                      setNewSourceType("github_docs");
                      if (!newSourceName) setNewSourceName("GitHub Security Specs");
                    }}
                  >
                    <GitBranch size={14} /> GitHub Docs
                  </button>
                  <button
                    type="button"
                    className={`kb-type-btn ${newSourceType === "cloud_storage" ? "active" : ""}`}
                    onClick={() => {
                      setNewSourceType("cloud_storage");
                      if (!newSourceName) setNewSourceName("S3 Security Policies");
                    }}
                  >
                    <Cloud size={14} /> Cloud Storage
                  </button>
                  <button
                    type="button"
                    className={`kb-type-btn ${newSourceType === "rfp_harvest" ? "active" : ""}`}
                    onClick={() => {
                      setNewSourceType("rfp_harvest");
                      if (!newSourceName) setNewSourceName("RFP SME Golden Q&A");
                      setNewSourceCategory("Golden Q&A");
                    }}
                  >
                    <Award size={14} /> RFP Harvester
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Source Name</label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="e.g. Acme Security Portal"
                />
              </div>

              {/* Dynamic Type Config */}
              {newSourceType === "web_crawler" && (
                <div className="form-group">
                  <label>Target URL(s)</label>
                  <input
                    type="text"
                    required
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://trust.acme.corp/security, https://docs.acme.corp/architecture"
                  />
                  <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                    Comma-separated list of web pages to continuously extract into structured passages.
                  </small>
                </div>
              )}

              {newSourceType === "github_docs" && (
                <>
                  <div className="form-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                    <div className="form-group">
                      <label>Repository (owner/repo)</label>
                      <input
                        type="text"
                        required
                        value={newSourceRepo}
                        onChange={(e) => setNewSourceRepo(e.target.value)}
                        placeholder="acme-corp/security-docs"
                      />
                    </div>
                    <div className="form-group">
                      <label>Branch</label>
                      <input
                        type="text"
                        value={newSourceBranch}
                        onChange={(e) => setNewSourceBranch(e.target.value)}
                        placeholder="main"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Documentation Files / Paths</label>
                    <input
                      type="text"
                      value={newSourceFiles}
                      onChange={(e) => setNewSourceFiles(e.target.value)}
                      placeholder="SECURITY.md, docs/compliance.md, architecture.md"
                    />
                  </div>
                </>
              )}

              {newSourceType === "cloud_storage" && (
                <div className="form-group">
                  <label>Bucket / Directory Path</label>
                  <input
                    type="text"
                    required
                    value={newSourceFolder}
                    onChange={(e) => setNewSourceFolder(e.target.value)}
                    placeholder="s3://acme-compliance-whitepapers/ or /var/data/security"
                  />
                </div>
              )}

              {newSourceType === "rfp_harvest" && (
                <div className="form-group" style={{ background: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#92400e", fontWeight: 600 }}>
                    <Award size={15} /> SME Authority Multiplier Active
                  </div>
                  <p style={{ margin: "4px 0 0", color: "#b45309", fontSize: "11px", lineHeight: 1.4 }}>
                    Approved answers from finalized RFP workspaces will be harvested into the Knowledge Base with the 
                    <strong> Golden Q&A</strong> tag, receiving a 1.75x boost in Reciprocal Rank Fusion retrieval.
                  </p>
                </div>
              )}

              <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div className="form-group">
                  <label>Default Category</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                  >
                    <option value="Compliance & Security">Compliance & Security</option>
                    <option value="Security & Cryptography">Security & Cryptography</option>
                    <option value="SLA & Operations">SLA & Operations</option>
                    <option value="Privacy & Legal">Privacy & Legal</option>
                    <option value="Product & Integrations">Product & Integrations</option>
                    <option value="HR & Corporate Policies">HR & Corporate Policies</option>
                    <option value="Golden Q&A">Golden Q&A</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Sync Frequency</label>
                  <select
                    value={newSourceSchedule}
                    onChange={(e) => setNewSourceSchedule(e.target.value)}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily (Recommended)</option>
                    <option value="weekly">Weekly</option>
                    <option value="manual">Manual Only</option>
                  </select>
                </div>
              </div>

              <div className="kb-submodal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowAddSourceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={isSubmittingSource}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {isSubmittingSource ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Registering...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Register & Start Initial Sync
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SYNC AUDIT LOGS */}
      {showLogsModal && selectedSourceForLogs && (
        <div className="kb-submodal-backdrop" onClick={() => setShowLogsModal(false)}>
          <div className="kb-submodal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className="kb-submodal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {getSourceIcon(selectedSourceForLogs.source_type)}
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                    Sync Audit History: {selectedSourceForLogs.name}
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Execution audit logs and delta passage metrics
                  </span>
                </div>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowLogsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="kb-logs-modal-body" style={{ maxHeight: "400px", overflowY: "auto", padding: "16px 20px" }}>
              {isLoadingLogs ? (
                <div className="kb-empty-state">
                  <RefreshCw size={24} className="spin" style={{ margin: "0 auto 8px" }} />
                  <p>Loading execution history...</p>
                </div>
              ) : sourceLogs.length === 0 ? (
                <div className="kb-empty-state">
                  <Clock size={28} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <p>No sync runs recorded yet.</p>
                  <small style={{ color: "var(--muted)" }}>Click "Sync Now" on the source to trigger the initial run.</small>
                </div>
              ) : (
                <div className="kb-logs-table-wrapper">
                  <table className="kb-logs-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--muted)" }}>
                        <th style={{ padding: "8px 6px" }}>Timestamp</th>
                        <th style={{ padding: "8px 6px" }}>Status</th>
                        <th style={{ padding: "8px 6px" }}>Duration</th>
                        <th style={{ padding: "8px 6px" }}>Passages Added</th>
                        <th style={{ padding: "8px 6px" }}>Pruned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                            {new Date(log.started_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: 600,
                                fontSize: "10px",
                                background: log.status === "completed" ? "#ecfdf5" : "#fef2f2",
                                color: log.status === "completed" ? "#047857" : "#b91c1c",
                              }}
                            >
                              {log.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "8px 6px" }}>{log.duration_seconds}s</td>
                          <td style={{ padding: "8px 6px", color: "#047857", fontWeight: 600 }}>
                            +{log.chunks_created}
                          </td>
                          <td style={{ padding: "8px 6px", color: log.chunks_pruned > 0 ? "#b91c1c" : "var(--muted)" }}>
                            {log.chunks_pruned}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
