import React from "react";
import { Cpu } from "lucide-react";
import { WorkspaceSettings } from "../../../types";
import { AiDisclaimerCard } from "./AiDisclaimerCard";
import { CustomTuningCard } from "./CustomTuningCard";

interface SettingsAiTabProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

export const SettingsAiTab: React.FC<SettingsAiTabProps> = ({ settings, setSettings }) => {
  return (
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
              onChange={(e) => setSettings({ ...settings, default_model: e.target.value })}
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
              onChange={(e) => setSettings({ ...settings, response_tone: e.target.value })}
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
            onChange={(e) => setSettings({ ...settings, default_top_k: parseInt(e.target.value, 10) || 5 })}
            style={{ padding: 0, marginTop: "6px" }}
          />
          <span className="settings-field-hint">
            Number of high-similarity vector chunks retrieved from ChromaDB/PostgreSQL during synthesis.
          </span>
        </div>
      </div>

      <CustomTuningCard settings={settings} setSettings={setSettings} />
      <AiDisclaimerCard settings={settings} setSettings={setSettings} />
    </>
  );
};

