import React, { useState } from "react";
import { X, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  isStarting: boolean;
  totalPairs: number;
  onClose: () => void;
  onSubmit: (baseModel: string, epochs: number, lrMultiplier: number) => Promise<boolean>;
}

export const NewTuningJobModal: React.FC<Props> = ({ isOpen, isStarting, totalPairs, onClose, onSubmit }) => {
  const [baseModel, setBaseModel] = useState("gemini-1.5-flash-002");
  const [epochs, setEpochs] = useState(4);
  const [lrMultiplier, setLrMultiplier] = useState(1.0);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--bg-card, #fff)", width: "460px", borderRadius: "12px", border: "1px solid var(--border-color)", padding: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color="var(--blue)" /> Launch Gemini Tuning Job
          </h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
          <div className="settings-field">
            <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Base Gemini Model</label>
            <select value={baseModel} onChange={(e) => setBaseModel(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
              <option value="gemini-1.5-flash-002">Gemini 1.5 Flash-002 (Fast, Cost-efficient)</option>
              <option value="gemini-1.5-pro-002">Gemini 1.5 Pro-002 (Complex Enterprise Reasoning)</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="settings-field">
              <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>Epochs ({epochs})</label>
              <input type="number" min={1} max={10} value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }} />
            </div>
            <div className="settings-field">
              <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>LR Multiplier ({lrMultiplier}x)</label>
              <select value={lrMultiplier} onChange={(e) => setLrMultiplier(Number(e.target.value))} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                <option value={0.5}>0.5x (Conservative)</option>
                <option value={1.0}>1.0x (Default)</option>
                <option value={2.0}>2.0x (Aggressive)</option>
              </select>
            </div>
          </div>

          <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "6px", padding: "10px", fontSize: "12px", color: "var(--text)" }}>
            Dataset: <strong>{totalPairs} supervised pairs</strong> will be staged to Google Cloud Vertex AI in multi-turn JSONL format.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button type="button" onClick={onClose} disabled={isStarting} style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border-color)", background: "transparent", cursor: "pointer" }}>Cancel</button>
          <button type="button" onClick={() => onSubmit(baseModel, epochs, lrMultiplier)} disabled={isStarting || totalPairs === 0} style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "var(--blue, #2563eb)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            {isStarting ? "Submitting Job..." : "Start Vertex AI Tuning"}
          </button>
        </div>
      </div>
    </div>
  );
};
