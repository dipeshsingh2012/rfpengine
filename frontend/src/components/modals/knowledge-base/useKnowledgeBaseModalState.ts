import React, { useState, useEffect } from "react";
import { KBSourceItem, KBSyncLogItem, KBSourceCreatePayload } from "../../../types";

interface UseKBModalStateProps {
  isOpen: boolean;
  tab: "upload" | "connectors" | "playground";
  apiBaseUrl?: string;
  tenantId?: string;
}

export function useKnowledgeBaseModalState({
  isOpen,
  tab,
  apiBaseUrl = "",
  tenantId = "acme-corp",
}: UseKBModalStateProps) {
  const [sources, setSources] = useState<KBSourceItem[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingSourceIds, setSyncingSourceIds] = useState<Set<string>>(new Set());
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedSourceForLogs, setSelectedSourceForLogs] = useState<KBSourceItem | null>(null);
  const [sourceLogs, setSourceLogs] = useState<KBSyncLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<"web_crawler" | "github_docs" | "cloud_storage" | "rfp_harvest">("web_crawler");
  const [newSourceUrl, setNewSourceUrl] = useState("https://trust.acme.corp/security");
  const [newSourceRepo, setNewSourceRepo] = useState("acme-corp/compliance-docs");
  const [newSourceBranch, setNewSourceBranch] = useState("main");
  const [newSourceFiles, setNewSourceFiles] = useState("SECURITY.md, docs/soc2.md");
  const [newSourceFolder, setNewSourceFolder] = useState("/var/data/compliance");
  const [newSourceCategory, setNewSourceCategory] = useState("Compliance & Security");
  const [newSourceSchedule, setNewSourceSchedule] = useState("daily");
  const [isSubmittingSource, setIsSubmittingSource] = useState(false);

  useEffect(() => {
    if (isOpen && tab === "connectors") fetchSources();
  }, [isOpen, tab, apiBaseUrl, tenantId]);

  async function fetchSources() {
    setIsLoadingSources(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources?tenant_id=${tenantId}`);
      if (res.ok) setSources(await res.json());
    } catch (err) {
      console.warn("Failed to fetch knowledge base sources:", err);
    } finally {
      setIsLoadingSources(false);
    }
  }

  async function handleCreateSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    setIsSubmittingSource(true);
    setSyncNotice(null);

    let config: Record<string, any> = { category: newSourceCategory };
    if (newSourceType === "web_crawler") {
      config.urls = newSourceUrl.split(",").map((u) => u.trim()).filter(Boolean);
    } else if (newSourceType === "github_docs") {
      config.repo = newSourceRepo.trim();
      config.branch = newSourceBranch.trim();
      config.file_paths = newSourceFiles.split(",").map((f) => f.trim()).filter(Boolean);
    } else if (newSourceType === "cloud_storage") {
      config.bucket_or_path = newSourceFolder.trim();
    }

    const payload: KBSourceCreatePayload = {
      tenant_id: tenantId,
      name: newSourceName.trim(),
      source_type: newSourceType,
      config,
      schedule_frequency: newSourceSchedule,
    };

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowAddSourceModal(false);
        setNewSourceName("");
        setSyncNotice({ text: "Connector created successfully." });
        fetchSources();
      }
    } catch {
      setSyncNotice({ text: "Failed to create connector.", isError: true });
    } finally {
      setIsSubmittingSource(false);
    }
  }

  async function handleTriggerSync(sourceId: string) {
    setSyncingSourceIds((prev) => new Set(prev).add(sourceId));
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources/${sourceId}/sync`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setSyncNotice({ text: `Sync complete: ${result.documents_ingested} docs, ${result.chunks_indexed} records indexed.` });
        fetchSources();
      }
    } catch {
      setSyncNotice({ text: "Sync failed.", isError: true });
    } finally {
      setSyncingSourceIds((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }

  async function handleSyncAll() {
    setIsSyncingAll(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sync-all?tenant_id=${tenantId}`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setSyncNotice({ text: `Sync-All finished: ${result.total_chunks_indexed} records updated.` });
        fetchSources();
      }
    } catch {
      setSyncNotice({ text: "Sync-All failed.", isError: true });
    } finally {
      setIsSyncingAll(false);
    }
  }

  async function handleViewLogs(source: KBSourceItem) {
    setSelectedSourceForLogs(source);
    setShowLogsModal(true);
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources/${source.id}/logs`);
      if (res.ok) setSourceLogs(await res.json());
    } catch {
      setSourceLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  }

  async function handleDeleteSource(sourceId: string) {
    if (!confirm("Are you sure you want to delete this connector?")) return;
    try {
      await fetch(`${apiBaseUrl}/api/v1/knowledge-base/sources/${sourceId}`, { method: "DELETE" });
      fetchSources();
    } catch {
      alert("Failed to delete source.");
    }
  }

  return {
    sources, isLoadingSources, isSyncingAll, syncingSourceIds, showAddSourceModal,
    setShowAddSourceModal, showLogsModal, setShowLogsModal, selectedSourceForLogs,
    sourceLogs, isLoadingLogs, syncNotice, setSyncNotice, newSourceName, setNewSourceName,
    newSourceType, setNewSourceType, newSourceUrl, setNewSourceUrl, newSourceRepo,
    setNewSourceRepo, newSourceBranch, setNewSourceBranch, newSourceFiles, setNewSourceFiles,
    newSourceFolder, setNewSourceFolder, newSourceCategory, setNewSourceCategory,
    newSourceSchedule, setNewSourceSchedule, isSubmittingSource, handleCreateSource,
    handleTriggerSync, handleSyncAll, handleViewLogs, handleDeleteSource, fetchSources,
  };
}

