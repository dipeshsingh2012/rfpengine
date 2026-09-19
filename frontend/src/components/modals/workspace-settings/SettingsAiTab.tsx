import React, { useState, useEffect, useCallback } from "react";
import { Cpu } from "lucide-react";
import { TuningJobItem, WorkspaceSettings } from "../../../types";
import { getApiBaseUrl } from "../../../utils/helpers";
import { AiDisclaimerCard } from "./AiDisclaimerCard";
import { CustomTuningCard } from "./CustomTuningCard";

interface SettingsAiTabProps {
  settings: WorkspaceSettings;
  setSettings: React.Dispatch<React.SetStateAction<WorkspaceSettings>>;
}

const apiBaseUrl = getApiBaseUrl();

export const SettingsAiTab: React.FC<SettingsAiTabProps> = ({ settings, setSettings }) => {
  const [tuningJobs, setTuningJobs] = useState<TuningJobItem[]>([]);

  const fetchTuningJobs = useCallback(() => {
    fetch(`${apiBaseUrl}/api/v1/tuning/jobs`, {
      headers: { "X-Tenant-ID": settings.tenant_id || "acme-corp" },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setTuningJobs(data);
        }
      })
      .catch((err) => console.warn("Failed to fetch tuning jobs:", err));
  }, [settings.tenant_id]);

  useEffect(() => {
    fetchTuningJobs();
  }, [fetchTuningJobs]);

  const completedTunedModels = tuningJobs.filter(
    (j) => (j.status === "SUCCEEDED" || j.status === "COMPLETED") && (j.tuned_model_name || j.id)
  );

  const handleModelChange = (val: string) => {
    const isTuned =
      val.startsWith("projects/") ||
      val.startsWith("tune-") ||
      completedTunedModels.some((j) => (j.tuned_model_name || j.id) === val) ||
      val === settings.active_tuned_model_id;

    if (isTuned) {
      setSettings({ ...settings, active_tuned_model_id: val });
    } else {
      setSettings({ ...settings, default_model: val, active_tuned_model_id: null });
    }
  };

  const currentSelectValue = settings.active_tuned_model_id || settings.default_model;

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
              value={currentSelectValue}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              <optgroup label="Base Foundation Models">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fast & Accurate)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Reasoning & Analysis)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</option>
              </optgroup>

              {(completedTunedModels.length > 0 || settings.active_tuned_model_id) && (
                <optgroup label="Custom SFT Tuned Models">
                  {completedTunedModels.map((job) => {
                    const modelId = job.tuned_model_name || job.id;
                    const shortName = job.tuned_model_name
                      ? job.tuned_model_name.split("/").pop()
                      : job.id;
                    return (
                      <option key={job.id} value={modelId}>
                        {`Custom SFT: ${shortName} (${job.base_model} - ${job.dataset_examples_count} pairs)`}
                      </option>
                    );
                  })}
                  {settings.active_tuned_model_id &&
                    !completedTunedModels.some(
                      (j) => (j.tuned_model_name || j.id) === settings.active_tuned_model_id
                    ) && (
                      <option value={settings.active_tuned_model_id}>
                        {`Custom SFT: ${settings.active_tuned_model_id.split("/").pop()}`}
                      </option>
                    )}
                </optgroup>
              )}
            </select>
            <span className="settings-field-hint">
              {settings.active_tuned_model_id
                ? "Custom SFT endpoint active. Grounded RFP generation routes through this fine-tuned checkpoint."
                : "Gemini 2.5 Flash is tuned for sub-second RAG generation with high factual precision."}
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

      <CustomTuningCard
        settings={settings}
        setSettings={setSettings}
        tuningJobs={tuningJobs}
        onRefreshJobs={fetchTuningJobs}
      />
      <AiDisclaimerCard settings={settings} setSettings={setSettings} />
    </>
  );
};

