import { useEffect, useState } from "react";
import { ActivityLogItem, ReviewerRole } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export function useActivityAndAudit(tenantId: string, role: ReviewerRole, enabled: boolean = true) {
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [backendHealth, setBackendHealth] = useState<"ok" | "degraded" | "checking">("checking");
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  function showToast(text: string) {
    setToastNotice(text);
    setTimeout(() => setToastNotice(null), 3500);
  }

  function logActivity(action: string, details: string, type: ActivityLogItem["type"]) {
    const newEntry: ActivityLogItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user: role,
      action,
      details,
      timestamp: "Just now",
      type,
    };
    setActivityLogs((prev) => [newEntry, ...prev]);
    fetch(`${apiBaseUrl}/api/v1/responses/audit-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
      body: JSON.stringify({ user_role: role, action, details, event_type: type }),
    }).catch((e) => console.warn("Failed to persist audit log:", e));
  }

  useEffect(() => {
    if (!enabled) return;
    fetch(`${apiBaseUrl}/health`)
      .then((r) => setBackendHealth(r.ok ? "ok" : "degraded"))
      .catch(() => setBackendHealth("degraded"));
  }, [enabled]);

  useEffect(() => {
    if (!showActivityModal) return;
    fetch(`${apiBaseUrl}/api/v1/responses/audit-logs`, { headers: { "X-Tenant-ID": tenantId } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setActivityLogs(
            data.map((l: any) => ({
              id: l.id,
              user: l.user_role || "User",
              action: l.action,
              details: l.details,
              timestamp: l.created_at
                ? new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Recently",
              type: l.event_type as ActivityLogItem["type"],
            }))
          );
        }
      })
      .catch((e) => console.warn("Failed audit logs fetch:", e));
  }, [showActivityModal, tenantId]);

  return {
    showActivityModal,
    setShowActivityModal,
    activityLogs,
    setActivityLogs,
    backendHealth,
    toastNotice,
    showToast,
    logActivity,
  };
}
