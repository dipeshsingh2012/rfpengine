import React from "react";
import { CheckCircle2, Clock, AlertCircle, Globe, FileSpreadsheet, Layers } from "lucide-react";
import { WorkspaceSummaryItem } from "../../../types";

export interface DashboardMetrics {
  total: number;
  inReview: number;
  approved: number;
  avgCompletion: number;
  totalQuestions: number;
}

export function getSourceBadge(mode: string, title: string) {
  if (mode === "url") {
    return (
      <span className="source-pill url">
        <Globe size={12} /> Web Form
      </span>
    );
  }
  if (title.toLowerCase().endsWith(".csv") || mode === "upload") {
    return (
      <span className="source-pill upload">
        <FileSpreadsheet size={12} /> Spreadsheet
      </span>
    );
  }
  return (
    <span className="source-pill extension">
      <Layers size={12} /> Assistant
    </span>
  );
}

export function getStatusBadge(status: string) {
  switch (status) {
    case "Approved":
      return <span className="status-badge approved"><CheckCircle2 size={13} /> 100% Approved</span>;
    case "In Review":
      return <span className="status-badge review"><Clock size={13} /> In Review</span>;
    case "Changes Requested":
      return <span className="status-badge changes"><AlertCircle size={13} /> Changes Requested</span>;
    default:
      return <span className="status-badge draft">Draft</span>;
  }
}

export function formatRelativeDate(dateStr: string) {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

