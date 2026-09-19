import React, { useState } from "react";
import { X, Plus, Shield } from "lucide-react";
import { ModalPortal } from "../../../common/ModalPortal";

interface AdminCreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRole: (payload: { name: string; icon: string; description: string; workflow_type: string; permissions: Record<string, boolean> }) => void;
}

const EMOJI_OPTIONS = ["👤", "🛡️", "⚖️", "👑", "💰", "🏗️", "🔍", "⚡", "📊", "🎯"];

export const AdminCreateRoleModal: React.FC<AdminCreateRoleModalProps> = ({ isOpen, onClose, onCreateRole }) => {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💰");
  const [description, setDescription] = useState("");
  const [workflowType, setWorkflowType] = useState("sequential");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateRole({
      name: name.trim(), icon, description: description.trim(), workflow_type: workflowType,
      permissions: { edit_drafts: true, advance_stage: true, view_kb: true },
    });
    setName(""); setDescription("");
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} cardClassName="admin-modal-card" ariaLabel="Create Custom Role">
      <div className="admin-modal-header">
        <div className="modal-title-group"><Shield size={18} color="var(--blue)" /><h3>Create Custom Role</h3></div>
        <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
      </div>

      <form onSubmit={handleSubmit} className="admin-modal-form">
        <div className="settings-field">
          <label>Role Title</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance & Pricing SME" />
        </div>

        <div className="settings-field">
          <label>Role Icon</label>
          <div className="emoji-picker-row">
            {EMOJI_OPTIONS.map((em) => (
              <button type="button" key={em} className={`emoji-btn ${icon === em ? "selected" : ""}`} onClick={() => setIcon(em)}>{em}</button>
            ))}
          </div>
        </div>

        <div className="settings-field">
          <label>Workflow Integration</label>
          <select value={workflowType} onChange={(e) => setWorkflowType(e.target.value)}>
            <option value="sequential">Sequential Waterfall Step (Ordered gating)</option>
            <option value="parallel">Parallel Specialist (Concurrent review)</option>
            <option value="ad_hoc">Ad-hoc Reviewer (On-demand routing)</option>
          </select>
        </div>

        <div className="settings-field">
          <label>Scope / Description</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Audits commercials & payment terms" />
        </div>

        <div className="admin-modal-actions">
          <button type="button" className="outline-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-button" disabled={!name.trim()}><Plus size={14} /> Create Role</button>
        </div>
      </form>
    </ModalPortal>
  );
};

