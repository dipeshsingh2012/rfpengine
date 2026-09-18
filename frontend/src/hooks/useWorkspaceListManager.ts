import { useState } from "react";
import { DEFAULT_RECENT_RFPS, RecentRFPItem, WorkspaceSummaryItem } from "../types";
import { ExportFormat } from "../components/modals/ExportPackageModal";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export function useWorkspaceListManager(tenantId: string) {
  const [workspaceSummaries, setWorkspaceSummaries] = useState<WorkspaceSummaryItem[]>([]);
  const [isWorkspacesLoading, setIsWorkspacesLoading] = useState(false);
  const [recentRFPs, setRecentRFPs] = useState<RecentRFPItem[]>(DEFAULT_RECENT_RFPS);

  async function fetchWorkspaceSummaries() {
    setIsWorkspacesLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces`, { headers: { "X-Tenant-ID": tenantId } });
      if (res.ok) setWorkspaceSummaries(await res.json());
    } catch (e) {
      console.warn("Failed workspace summaries fetch:", e);
    } finally {
      setIsWorkspacesLoading(false);
    }
  }

  async function handleDuplicateWorkspace(id: string, showToast: (msg: string) => void) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${id}/duplicate`, {
        method: "POST",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        showToast("Questionnaire duplicated in PostgreSQL");
        fetchWorkspaceSummaries();
      } else showToast("Failed to duplicate questionnaire");
    } catch {
      showToast("Network error duplicating questionnaire");
    }
  }

  async function handleDeleteWorkspace(id: string, showToast: (msg: string) => void) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/workspaces/${id}`, {
        method: "DELETE",
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) {
        showToast("Questionnaire permanently deleted from PostgreSQL");
        fetchWorkspaceSummaries();
      } else showToast("Failed to delete workspace");
    } catch {
      showToast("Network error deleting workspace");
    }
  }

  async function handleExportPackage(
    format: ExportFormat,
    payload: {
      responseId: string;
      sourceLabel: string;
      items: any[];
      showToast: (msg: string) => void;
    }
  ) {
    payload.showToast(`Generating ${format.toUpperCase()} compliance deliverable...`);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({
          workspace_id: payload.responseId,
          tenant_id: tenantId,
          title: payload.sourceLabel,
          format,
          items: payload.items,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${payload.sourceLabel.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}-export.${format}`;
        link.click();
        URL.revokeObjectURL(link.href);
        payload.showToast(`Downloaded export successfully!`);
      }
    } catch {
      payload.showToast("Export failed.");
    }
  }

  return {
    workspaceSummaries,
    setWorkspaceSummaries,
    isWorkspacesLoading,
    recentRFPs,
    setRecentRFPs,
    fetchWorkspaceSummaries,
    handleDuplicateWorkspace,
    handleDeleteWorkspace,
    handleExportPackage,
  };
}
