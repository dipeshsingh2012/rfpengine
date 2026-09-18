import { useEffect, useState } from "react";
import { KBItem, SearchResponse } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export function useKnowledgeBaseManager(tenantId: string) {
  const [showKBModal, setShowKBModal] = useState(false);
  const [kbModalTab, setKbModalTab] = useState<"upload" | "connectors" | "playground">("upload");
  const [kbEntries, setKbEntries] = useState<KBItem[]>([]);
  const [kbStats, setKbStats] = useState({ totalRecords: 0, totalSources: 0 });
  const [isFetchingKB, setIsFetchingKB] = useState(false);
  const [isUploadingKB, setIsUploadingKB] = useState(false);
  const [kbUploadMsg, setKbUploadMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Playground state
  const [playgroundQuery, setPlaygroundQuery] = useState("");
  const [playgroundTopK, setPlaygroundTopK] = useState(5);
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<SearchResponse | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/v1/knowledge-base/stats?tenant_id=${tenantId}`, { headers: { "X-Tenant-ID": tenantId } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setKbStats({ totalRecords: d.total_records ?? d.total_entries ?? 0, totalSources: d.total_sources ?? 0 });
      })
      .catch((e) => console.warn("Failed KB stats fetch:", e));
  }, [showKBModal, tenantId]);

  async function fetchKBEntries() {
    setIsFetchingKB(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/entries?tenant_id=${tenantId}`, {
        headers: { "X-Tenant-ID": tenantId },
      });
      if (res.ok) setKbEntries(await res.json());
    } catch (e) {
      console.warn("Failed KB entries fetch:", e);
    } finally {
      setIsFetchingKB(false);
    }
  }

  useEffect(() => {
    if (showKBModal) fetchKBEntries();
  }, [showKBModal, tenantId]);

  async function handleKBUpload(file: File) {
    setIsUploadingKB(true);
    setKbUploadMsg(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/upload?tenant_id=${tenantId}`, {
        method: "POST",
        headers: { "X-Tenant-ID": tenantId },
        body: formData,
      });
      if (res.ok) {
        setKbUploadMsg({ text: `Indexed "${file.name}" into knowledge base.` });
        fetchKBEntries();
      } else {
        setKbUploadMsg({ text: "Upload failed.", isError: true });
      }
    } catch {
      setKbUploadMsg({ text: "Network error during upload.", isError: true });
    } finally {
      setIsUploadingKB(false);
    }
  }

  async function handleDeleteKBEntry(id: string) {
    try {
      await fetch(`${apiBaseUrl}/api/v1/knowledge-base/entries/${id}?tenant_id=${tenantId}`, {
        method: "DELETE",
        headers: { "X-Tenant-ID": tenantId },
      });
      fetchKBEntries();
    } catch (e) {
      console.warn("Failed to delete entry:", e);
    }
  }

  async function handlePlaygroundSearch(queryText?: string) {
    const q = queryText ?? playgroundQuery;
    if (!q.trim()) return;
    setPlaygroundLoading(true);
    setPlaygroundError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, question: q, top_k: playgroundTopK }),
      });
      if (res.ok) setPlaygroundResult(await res.json());
      else throw new Error("Search failed");
    } catch (e: any) {
      setPlaygroundError(e.message || "Failed to search");
    } finally {
      setPlaygroundLoading(false);
    }
  }

  const kbTotalRecords = kbStats.totalRecords || kbEntries.length;
  const kbTotalSources = kbStats.totalSources || (kbTotalRecords > 0 ? 1 : 0);

  return {
    showKBModal, setShowKBModal, kbModalTab, setKbModalTab, kbEntries, fetchKBEntries,
    handleDeleteKBEntry, handleKBUpload, isFetchingKB, isUploadingKB, kbUploadMsg,
    isDragOver, setIsDragOver, playgroundQuery, setPlaygroundQuery, playgroundTopK,
    setPlaygroundTopK, playgroundLoading, playgroundResult, playgroundError,
    handlePlaygroundSearch, kbTotalRecords, kbTotalSources,
  };
}
