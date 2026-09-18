import React from "react";
import { X, Plus, RefreshCw } from "lucide-react";
import { ModalPortal } from "../../common/ModalPortal";

interface KBAddSourceModalProps {
  isOpen: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
  name: string; setName: (v: string) => void;
  sourceType: "web_crawler" | "github_docs" | "cloud_storage" | "rfp_harvest";
  setSourceType: (v: any) => void;
  url: string; setUrl: (v: string) => void;
  repo: string; setRepo: (v: string) => void;
  branch: string; setBranch: (v: string) => void;
  files: string; setFiles: (v: string) => void;
  folder: string; setFolder: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  schedule: string; setSchedule: (v: string) => void;
  isSubmitting: boolean;
}

export const KBAddSourceModal: React.FC<KBAddSourceModalProps> = (props) => {
  return (
    <ModalPortal isOpen={props.isOpen} onClose={props.onClose} cardClassName="modal-card source-config-modal" ariaLabel="Add Automated Grounding Connector">
      <div className="modal-header">
        <h3>Add Automated Grounding Connector</h3>
        <button className="close-btn" onClick={props.onClose} aria-label="Close dialog"><X size={16} /></button>
      </div>
      <form onSubmit={props.onSubmit}>
        <div className="modal-body form-grid">
          <div className="form-group">
            <label>Connector Name</label>
            <input value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="e.g. Trust & Security Center" required />
          </div>
          <div className="form-group">
            <label>Connector Type</label>
            <select value={props.sourceType} onChange={(e) => props.setSourceType(e.target.value)}>
              <option value="web_crawler">Web Crawler (Trust Site / Knowledge Base URLs)</option>
              <option value="github_docs">GitHub Repository (Markdown / Docs / Security Specs)</option>
              <option value="cloud_storage">Local / S3 Document Bucket</option>
              <option value="rfp_harvest">RFP History Auto-Harvest</option>
            </select>
          </div>
          {props.sourceType === "web_crawler" && (
            <div className="form-group">
              <label>Target URLs (comma-separated)</label>
              <input value={props.url} onChange={(e) => props.setUrl(e.target.value)} required />
            </div>
          )}
          {props.sourceType === "github_docs" && (
            <>
              <div className="form-group">
                <label>Repository (owner/repo)</label>
                <input value={props.repo} onChange={(e) => props.setRepo(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input value={props.branch} onChange={(e) => props.setBranch(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>File Patterns</label>
                <input value={props.files} onChange={(e) => props.setFiles(e.target.value)} required />
              </div>
            </>
          )}
          {props.sourceType === "cloud_storage" && (
            <div className="form-group">
              <label>Storage Folder / S3 Bucket</label>
              <input value={props.folder} onChange={(e) => props.setFolder(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label>Sync Schedule</label>
            <select value={props.schedule} onChange={(e) => props.setSchedule(e.target.value)}>
              <option value="hourly">Hourly (Continuous Updates)</option>
              <option value="daily">Daily (Recommended)</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual Trigger Only</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={props.onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={props.isSubmitting}>
            {props.isSubmitting ? <RefreshCw size={14} className="spin" /> : <Plus size={14} />}
            {props.isSubmitting ? "Creating..." : "Save Connector"}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
