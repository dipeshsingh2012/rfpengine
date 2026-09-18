import React, { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { WorkspaceSettings } from "../../../types";
import { TuningStudioModal } from "./tuning/TuningStudioModal";

interface Props {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const CustomTuningCard: React.FC<Props> = ({ settings, setSettings }) => {
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const activeModel = settings.active_tuned_model_id;

  const handleResetToBase = () => {
    setSettings({ ...settings, active_tuned_model_id: null });
  };

  return (
    <div className="settings-group-card" style={{ marginTop: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="settings-group-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color="var(--blue)" /> Gemini Supervised Fine-Tuning
          </div>
          <p className="settings-group-subtitle" style={{ margin: "4px 0 0" }}>
            Fine-tune base Gemini models on your historical Golden Q&A and approved RFP responses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsStudioOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--blue, #2563eb)", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 14px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
        >
          Tuning Studio <ArrowRight size={13} />
        </button>
      </div>

      <div style={{ marginTop: "14px", background: "var(--bg-subtle, rgba(0,0,0,0.02))", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 600 }}>Active Endpoint</div>
          <div style={{ fontSize: "13px", fontWeight: 600, marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
            {activeModel ? (
              <>
                <CheckCircle2 size={14} color="#10b981" />
                <span style={{ color: "#10b981" }}>Custom Tuned Endpoint Active</span>
                <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>({activeModel.split("/").pop()})</span>
              </>
            ) : (
              <span style={{ color: "var(--muted)" }}>Using Base Model ({settings.default_model})</span>
            )}
          </div>
        </div>

        {activeModel && (
          <button
            type="button"
            onClick={handleResetToBase}
            style={{ background: "none", border: "1px solid var(--border-color)", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: "var(--muted)", cursor: "pointer" }}
          >
            Revert to Base Model
          </button>
        )}
      </div>

      <TuningStudioModal
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        tenantId={settings.tenant_id}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
};

