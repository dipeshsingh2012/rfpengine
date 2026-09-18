import React, { useEffect, useState } from "react";
import { DEFAULT_WORKSPACE_SETTINGS, KBItem, RecentRFPItem, WorkspaceSettings } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export function useWorkspaceSettingsManager(tenantId: string) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "ai" | "governance" | "data">("profile");
  const [workspaceSettings, setWorkspaceSettings] = useState<WorkspaceSettings>(DEFAULT_WORKSPACE_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveNotice, setSettingsSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/v1/responses/settings?tenant_id=${tenantId}`, {
      headers: { "X-Tenant-ID": tenantId },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setWorkspaceSettings(data);
      })
      .catch((e) => console.warn("Failed to fetch settings:", e));
  }, [tenantId]);

  async function saveWorkspaceSettings(updates?: Partial<WorkspaceSettings>) {
    setIsSavingSettings(true);
    const updated = { ...workspaceSettings, ...(updates || {}) };
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setWorkspaceSettings(await res.json());
        setSettingsSaveNotice("Settings saved successfully");
        setTimeout(() => setSettingsSaveNotice(null), 3000);
      }
    } catch {
      setSettingsSaveNotice("Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  }

  function exportWorkspaceData(recentRFPs: RecentRFPItem[], kbEntries: KBItem[]) {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ settings: workspaceSettings, recentRFPs, kbEntries }, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `workspace-${tenantId}-export.json`;
    a.click();
  }

  return {
    showSettingsModal,
    setShowSettingsModal,
    settingsTab,
    setSettingsTab,
    workspaceSettings,
    setWorkspaceSettings,
    isSavingSettings,
    settingsSaveNotice,
    saveWorkspaceSettings,
    exportWorkspaceData,
  };
}
