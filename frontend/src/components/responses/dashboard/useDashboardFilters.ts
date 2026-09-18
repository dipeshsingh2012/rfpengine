import { useState, useMemo } from "react";
import { WorkspaceSummaryItem } from "../../../types";
import { DashboardMetrics } from "./dashboardTypes";

export function useDashboardFilters(workspaces: WorkspaceSummaryItem[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "title" | "questions" | "completion">("updated");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const metrics: DashboardMetrics = useMemo(() => {
    const total = workspaces.length;
    const inReview = workspaces.filter((w) => w.status === "In Review" || w.in_review_count > 0).length;
    const approved = workspaces.filter((w) => w.status === "Approved" || (w.total_questions > 0 && w.approved_count === w.total_questions)).length;
    const totalQuestions = workspaces.reduce((sum, w) => sum + w.total_questions, 0);
    const totalApproved = workspaces.reduce((sum, w) => sum + w.approved_count, 0);
    const avgCompletion = totalQuestions > 0 ? Math.round((totalApproved / totalQuestions) * 100) : 0;
    return { total, inReview, approved, avgCompletion, totalQuestions };
  }, [workspaces]);

  const filteredWorkspaces = useMemo(() => {
    return workspaces
      .filter((w) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          if (!w.title.toLowerCase().includes(q) && !w.source_url?.toLowerCase().includes(q) && !w.assigned_roles.some((r) => r.toLowerCase().includes(q))) return false;
        }
        if (statusFilter !== "all") {
          if (statusFilter === "approved" && w.status !== "Approved") return false;
          if (statusFilter === "in_review" && w.status !== "In Review" && w.in_review_count === 0) return false;
          if (statusFilter === "draft" && w.status !== "Draft") return false;
          if (statusFilter === "changes" && w.status !== "Changes Requested" && w.changes_requested_count === 0) return false;
        }
        if (sourceFilter !== "all" && w.source_mode !== sourceFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "questions") return b.total_questions - a.total_questions;
        if (sortBy === "completion") return b.completion_percentage - a.completion_percentage;
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      });
  }, [workspaces, searchTerm, statusFilter, sourceFilter, sortBy]);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSourceFilter("all");
  };

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    metrics,
    filteredWorkspaces,
    resetFilters,
  };
}

