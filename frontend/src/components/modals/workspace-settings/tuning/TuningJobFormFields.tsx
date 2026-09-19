import React from "react";

interface Props {
  baseModel: string;
  setBaseModel: (m: string) => void;
  epochs: number;
  setEpochs: (e: number) => void;
  lrMultiplier: number;
  setLrMultiplier: (l: number) => void;
  includeGoldenQa: boolean;
  setIncludeGoldenQa: (v: boolean) => void;
  includeApprovedReviews: boolean;
  setIncludeApprovedReviews: (v: boolean) => void;
  effectiveGoldenQa: number;
  effectiveApprovedReviews: number;
  calculatedPairs: number;
}

export const TuningJobFormFields: React.FC<Props> = ({
  baseModel,
  setBaseModel,
  epochs,
  setEpochs,
  lrMultiplier,
  setLrMultiplier,
  includeGoldenQa,
  setIncludeGoldenQa,
  includeApprovedReviews,
  setIncludeApprovedReviews,
  effectiveGoldenQa,
  effectiveApprovedReviews,
  calculatedPairs,
}) => (
  <div className="modal-body form-grid">
    <div className="form-group">
      <label>Base Gemini Model</label>
      <select value={baseModel} onChange={(e) => setBaseModel(e.target.value)}>
        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast, Production Default - Recommended)</option>
        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced Enterprise Reasoning)</option>
        <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (High Throughput)</option>
        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Next-Gen Efficiency)</option>
        <option value="gemini-3.5-flash">Gemini 3.5 Flash (Next-Gen Frontier Flash)</option>
      </select>
      <span className="settings-field-hint">Vertex AI Supervised Tuning requires a supported base checkpoint.</span>
    </div>

    <div className="form-group">
      <label>Supervised Training Datasets</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "normal" }}>
          <input type="checkbox" checked={includeGoldenQa} onChange={(e) => setIncludeGoldenQa(e.target.checked)} />
          <span>Include Canonical Golden Q&A ({effectiveGoldenQa} pairs)</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "normal" }}>
          <input type="checkbox" checked={includeApprovedReviews} onChange={(e) => setIncludeApprovedReviews(e.target.checked)} />
          <span>Include SME Approved RFP Responses ({effectiveApprovedReviews} pairs)</span>
        </label>
      </div>
    </div>

    <div className="settings-grid-2">
      <div className="form-group">
        <label>Epochs ({epochs})</label>
        <input type="number" min={1} max={10} value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} />
      </div>
      <div className="form-group">
        <label>LR Multiplier ({lrMultiplier}x)</label>
        <select value={lrMultiplier} onChange={(e) => setLrMultiplier(Number(e.target.value))}>
          <option value={0.5}>0.5x (Conservative)</option>
          <option value={1.0}>1.0x (Default)</option>
          <option value={2.0}>2.0x (Aggressive)</option>
        </select>
      </div>
    </div>

    <div className="revision-question-preview">
      Dataset: <strong>{calculatedPairs} supervised pairs</strong> will be staged to Google Cloud Vertex AI in multi-turn JSONL format.
    </div>
  </div>
);

