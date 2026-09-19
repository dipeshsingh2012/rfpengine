import React from "react";
import { Cpu, Sparkles, ExternalLink } from "lucide-react";
import { AdminGovernanceSettings } from "../../../types";

interface AdminAiTabProps {
  governance: AdminGovernanceSettings;
  onSave: (updates: Partial<AdminGovernanceSettings>) => void;
}

export const AdminAiTab: React.FC<AdminAiTabProps> = ({ governance, onSave }) => {
  return (
    <div className="admin-tab-content">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-section-title">AI Engine & Model Synthesis</h3>
          <p className="admin-section-desc">
            Configure default foundational LLM parameters and continuous RAG learning loops.
          </p>
        </div>
      </div>

      <div className="admin-card">
        <h4 className="card-title">Default Synthesis Model</h4>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="input-label">Production LLM Engine</label>
            <select className="text-input" defaultValue="gemini-2.5-flash">
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Sub-second RAG)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Complex Multimodal & Reasoning)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy Fast)</option>
            </select>
            <span className="input-hint">Ultra-fast synthesis tuned with ground-truth citations.</span>
          </div>

          <div className="form-group">
            <label className="input-label">Default RFP Response Tone</label>
            <select className="text-input" defaultValue="concise">
              <option value="concise">Concise & Direct (Audit / Enterprise Style)</option>
              <option value="detailed">Comprehensive & Detailed</option>
              <option value="technical">Technical & Architecture-focused</option>
              <option value="executive">Executive & Commercial</option>
            </select>
            <span className="input-hint">Governs synthesis verbosity and structure.</span>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h4 className="card-title">Continuous Feedback & Golden QA Learning</h4>
        <div className="toggle-row">
          <div>
            <div className="toggle-title">Auto-promote Approved Answers to Golden QA</div>
            <div className="toggle-desc">
              When a stage reaches final sign-off, automatically harvest verified answers into the vector KB.
            </div>
          </div>
          <input
            type="checkbox"
            className="toggle-checkbox"
            checked={governance.auto_promote_golden_qa}
            onChange={(e) => onSave({ auto_promote_golden_qa: e.target.checked })}
          />
        </div>

        <div className="toggle-row" style={{ marginTop: "16px" }}>
          <div>
            <div className="toggle-title">Continuous Feedback Fine-Tuning Export</div>
            <div className="toggle-desc">
              Export edited drafts into JSONL dataset format for Google AI Studio / Vertex AI fine-tuning.
            </div>
          </div>
          <a
            href="https://aistudio.google.com"
            target="_blank"
            rel="noreferrer"
            className="secondary-btn sm-btn"
            style={{ textDecoration: "none" }}
          >
            <Sparkles size={14} /> AI Studio <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

