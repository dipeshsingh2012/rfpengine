import React from "react";
import {
  Settings,
  X,
  Building2,
  Cpu,
  ShieldCheck,
  Database,
  FileText,
  Sliders,
  Sparkles,
  Download,
  AlertCircle,
  Save,
} from "lucide-react";
import { WorkspaceSettings, DEFAULT_WORKSPACE_SETTINGS } from "../../types";

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
  onSave: (updates?: Partial<WorkspaceSettings>) => Promise<void>;
  onExport: () => void;
  isSaving: boolean;
  saveNotice: string | null;
  tenantId: string;
  kbRecordsCount: number;
  kbDocumentsCount?: number;
  recentRfpsCount: number;
  settingsTab: "profile" | "ai" | "governance" | "data";
  setSettingsTab: (tab: "profile" | "ai" | "governance" | "data") => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onSave,
  onExport,
  isSaving,
  saveNotice,
  tenantId,
  kbRecordsCount,
  kbDocumentsCount = 0,
  recentRfpsCount,
  settingsTab,
  setSettingsTab,
}) => {
  if (!isOpen) return null;

  return (
    <div className="kb-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-header-title">
            <Settings size={20} color="var(--navy)" />
            <h2 style={{ margin: 0 }}>Workspace Settings</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="settings-tabs-nav">
          <button
            className={`settings-tab-item ${settingsTab === "profile" ? "active" : ""}`}
            onClick={() => setSettingsTab("profile")}
          >
            <Building2 size={14} /> Profile & Identity
          </button>
          <button
            className={`settings-tab-item ${settingsTab === "ai" ? "active" : ""}`}
            onClick={() => setSettingsTab("ai")}
          >
            <Cpu size={14} /> AI & Model Tuning
          </button>
          <button
            className={`settings-tab-item ${settingsTab === "governance" ? "active" : ""}`}
            onClick={() => setSettingsTab("governance")}
          >
            <ShieldCheck size={14} /> SME Governance
          </button>
          <button
            className={`settings-tab-item ${settingsTab === "data" ? "active" : ""}`}
            onClick={() => setSettingsTab("data")}
          >
            <Database size={14} /> Data & Export
          </button>
        </div>

        {/* Content Area */}
        <div className="settings-modal-content">
          {/* TAB 1: Profile & Identity */}
          {settingsTab === "profile" && (
            <>
              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <Building2 size={16} color="var(--blue)" /> Organization Identity
                  </div>
                  <p className="settings-group-subtitle">
                    Configure baseline tenant profile information and administrator contact details.
                  </p>
                </div>

                <div className="settings-grid-2">
                  <div className="settings-field">
                    <label>Company Name</label>
                    <input
                      type="text"
                      value={settings.company_name}
                      onChange={(e) =>
                        setSettings({ ...settings, company_name: e.target.value })
                      }
                      placeholder="e.g. Acme Corporation"
                    />
                  </div>
                  <div className="settings-field">
                    <label>Industry / Vertical</label>
                    <input
                      type="text"
                      value={settings.industry}
                      onChange={(e) =>
                        setSettings({ ...settings, industry: e.target.value })
                      }
                      placeholder="e.g. Enterprise Cloud & SaaS"
                    />
                  </div>
                </div>

                <div className="settings-grid-2">
                  <div className="settings-field">
                    <label>Tenant ID (Immutable)</label>
                    <input
                      type="text"
                      value={settings.tenant_id}
                      disabled
                      style={{ opacity: 0.7, cursor: "not-allowed", background: "#f1f5f9" }}
                    />
                    <span className="settings-field-hint">
                      Tenant isolation scope for PostgreSQL and vector collections
                    </span>
                  </div>
                  <div className="settings-field">
                    <label>Admin Notification Email</label>
                    <input
                      type="email"
                      value={settings.admin_email}
                      onChange={(e) =>
                        setSettings({ ...settings, admin_email: e.target.value })
                      }
                      placeholder="e.g. admin@company.com"
                    />
                    <span className="settings-field-hint">
                      Primary recipient for compliance alerts and export notifications
                    </span>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <FileText size={16} color="var(--navy)" /> Company Context & Grounding Facts
                  </div>
                  <p className="settings-group-subtitle">
                    Provide background on security certifications (SOC 2 Type II, ISO 27001), infrastructure hosting, data privacy commitments, and standard product terminology. This context grounds every answer formulation.
                  </p>
                </div>

                <div className="settings-field">
                  <textarea
                    rows={4}
                    value={settings.company_context}
                    onChange={(e) =>
                      setSettings({ ...settings, company_context: e.target.value })
                    }
                    placeholder="e.g. Acme Corp provides an enterprise AI platform hosted in AWS us-east-1 and eu-central-1. All customer data is encrypted at rest (AES-256) and in transit (TLS 1.3). We hold SOC 2 Type II, ISO 27001, and HIPAA compliance certifications."
                  />
                  <span className="settings-field-hint">
                    Injected into system instructions for high-fidelity compliance grounding.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: AI & Model Tuning */}
          {settingsTab === "ai" && (
            <>
              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <Cpu size={16} color="var(--blue)" /> Model Selection & Generation
                  </div>
                  <p className="settings-group-subtitle">
                    Select the primary LLM engine for response generation and customize response formatting.
                  </p>
                </div>

                <div className="settings-grid-2">
                  <div className="settings-field">
                    <label>Default AI Model</label>
                    <select
                      value={settings.default_model}
                      onChange={(e) =>
                        setSettings({ ...settings, default_model: e.target.value })
                      }
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fast & Accurate)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning & Analysis)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
                    </select>
                    <span className="settings-field-hint">
                      Gemini 2.5 Flash is tuned for sub-second RAG generation with high factual precision.
                    </span>
                  </div>

                  <div className="settings-field">
                    <label>Response Tone</label>
                    <select
                      value={settings.response_tone}
                      onChange={(e) =>
                        setSettings({ ...settings, response_tone: e.target.value })
                      }
                    >
                      <option value="concise">Concise & Direct (Audit / RFP Style)</option>
                      <option value="detailed">Comprehensive & Detailed</option>
                      <option value="technical">Technical & Architecture-focused</option>
                      <option value="executive">Executive & Commercial</option>
                    </select>
                    <span className="settings-field-hint">
                      Governs sentence brevity and factual density in generated answers.
                    </span>
                  </div>
                </div>

                <div className="settings-field" style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ margin: 0 }}>
                      Top-K Retrieved Context Chunks:{" "}
                      <span style={{ color: "var(--blue)", fontWeight: 700 }}>{settings.default_top_k}</span>
                    </label>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                      Range: 3 – 10 passages
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={10}
                    step={1}
                    value={settings.default_top_k}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        default_top_k: parseInt(e.target.value, 10) || 5,
                      })
                    }
                    style={{ padding: 0, marginTop: "6px" }}
                  />
                  <span className="settings-field-hint">
                    Number of high-similarity vector chunks retrieved from ChromaDB/PostgreSQL during synthesis.
                  </span>
                </div>
              </div>

              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <Sliders size={16} color="var(--navy)" /> Default Legal Disclaimer
                  </div>
                  <p className="settings-group-subtitle">
                    Standard legal confidentiality statement appended to exported RFP response packages.
                  </p>
                </div>

                <div className="settings-field">
                  <textarea
                    rows={3}
                    value={settings.disclaimer}
                    onChange={(e) =>
                      setSettings({ ...settings, disclaimer: e.target.value })
                    }
                    placeholder="CONFIDENTIAL: The information provided herein is proprietary..."
                  />
                  <span className="settings-field-hint">
                    Included in exported Word, Excel, and JSON questionnaire deliverables.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* TAB 3: SME Governance */}
          {settingsTab === "governance" && (
            <>
              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <ShieldCheck size={16} color="var(--blue)" /> SME Reviewer Routing
                  </div>
                  <p className="settings-group-subtitle">
                    Configure default Subject Matter Expert email routing for section triage and multi-stage compliance approvals.
                  </p>
                </div>

                <div className="settings-grid-2">
                  <div className="settings-field">
                    <label>Security & Infrastructure SME</label>
                    <input
                      type="email"
                      value={settings.sme_roles_config?.security_sme_email || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sme_roles_config: {
                            ...settings.sme_roles_config,
                            security_sme_email: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. infosec@company.com"
                    />
                    <span className="settings-field-hint">Routes questions tagged #Security or #Infra</span>
                  </div>

                  <div className="settings-field">
                    <label>Legal & Compliance SME</label>
                    <input
                      type="email"
                      value={settings.sme_roles_config?.legal_reviewer_email || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sme_roles_config: {
                            ...settings.sme_roles_config,
                            legal_reviewer_email: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. legal-review@company.com"
                    />
                    <span className="settings-field-hint">Routes questions tagged #Legal or #Compliance</span>
                  </div>
                </div>

                <div className="settings-field">
                  <label>Final Authority Approver</label>
                  <input
                    type="email"
                    value={settings.sme_roles_config?.final_approver_email || ""}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sme_roles_config: {
                          ...settings.sme_roles_config,
                          final_approver_email: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. vp-compliance@company.com"
                  />
                  <span className="settings-field-hint">Authorizes final release lock before export</span>
                </div>
              </div>

              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <Sparkles size={16} color="#d97706" /> Continuous Learning & Golden Q&A
                  </div>
                  <p className="settings-group-subtitle">
                    Control how finalized answers flow back into the company knowledge graph.
                  </p>
                </div>

                <div className="settings-toggle-box">
                  <div className="settings-toggle-info">
                    <strong>Auto-promote 100% Approved Responses to Knowledge Base</strong>
                    <small>
                      When active, answers given full 5-star or verified human approval automatically index into the tenant's vector collection for future RFPs.
                    </small>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={settings.auto_promote_golden_qa}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          auto_promote_golden_qa: e.target.checked,
                        })
                      }
                    />
                    <span className="settings-slider-thumb" />
                  </label>
                </div>
              </div>
            </>
          )}

          {/* TAB 4: Data & Export */}
          {settingsTab === "data" && (
            <>
              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <Database size={16} color="var(--blue)" /> Workspace Snapshot & Metrics
                  </div>
                  <p className="settings-group-subtitle">
                    Overview of tenant-partitioned storage resources and records in PostgreSQL.
                  </p>
                </div>

                <div className="activity-stats-bar" style={{ display: "flex", gap: "12px", margin: "4px 0" }}>
                  <div style={{ flex: 1, background: "#f8fafc", padding: "12px 14px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <span className="eyebrow" style={{ color: "var(--muted)" }}>Tenant ID</span>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)", fontFamily: "'DM Mono', monospace" }}>
                      {settings.tenant_id}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "#f0fdf4", padding: "12px 14px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                    <span className="eyebrow" style={{ color: "#166534" }}>Indexed KB Records</span>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#15803d" }}>
                      {kbRecordsCount}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "#f5f3ff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #ddd6fe" }}>
                    <span className="eyebrow" style={{ color: "#6d28d9" }}>Indexed Documents</span>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#7c3aed" }}>
                      {kbDocumentsCount}
                    </div>
                  </div>
                  <div style={{ flex: 1, background: "#eff6ff", padding: "12px 14px", borderRadius: "6px", border: "1px solid #bfdbfe" }}>
                    <span className="eyebrow" style={{ color: "#1e40af" }}>Recent Questionnaires</span>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#1d4ed8" }}>
                      {recentRfpsCount}
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-group-card">
                <div>
                  <div className="settings-group-title">
                    <Download size={16} color="var(--navy)" /> Tenant Data Portability
                  </div>
                  <p className="settings-group-subtitle">
                    Download a complete JSON archive of this workspace, including configuration, recent questionnaire outputs, and indexed knowledge base pairs.
                  </p>
                </div>

                <div>
                  <button
                    className="secondary-button"
                    onClick={onExport}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                  >
                    <Download size={15} /> Download Workspace Archive (.json)
                  </button>
                </div>
              </div>

              <div className="settings-group-card danger-zone">
                <div>
                  <div className="settings-group-title" style={{ color: "#b91c1c" }}>
                    <AlertCircle size={16} color="#b91c1c" /> Reset Workspace Configuration
                  </div>
                  <p className="settings-group-subtitle" style={{ color: "#7f1d1d" }}>
                    Restore default system settings for tone, model, and SME assignments. This does not erase indexed knowledge base entries.
                  </p>
                </div>

                <div>
                  <button
                    className="secondary-button"
                    style={{ color: "#b91c1c", borderColor: "#fca5a5", background: "#fff" }}
                    onClick={() =>
                      setSettings({
                        ...DEFAULT_WORKSPACE_SETTINGS,
                        tenant_id: tenantId,
                      })
                    }
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <div className="settings-footer-status">
            {saveNotice ? (
              <span
                style={{
                  color:
                    saveNotice.includes("Error") || saveNotice.includes("Failed")
                      ? "#b91c1c"
                      : "#15803d",
                  fontWeight: 600,
                }}
              >
                {saveNotice}
              </span>
            ) : (
              <span>Tenant: {tenantId} • PostgreSQL Connected</span>
            )}
          </div>
          <div className="settings-footer-actions">
            <button className="secondary-button" onClick={onClose}>
              Close
            </button>
            <button
              className="primary-button"
              onClick={() => onSave()}
              disabled={isSaving}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Save size={14} />
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

