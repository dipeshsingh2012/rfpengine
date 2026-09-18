import React, { useState } from "react";
import { Database, RefreshCw, Search } from "lucide-react";
import { KBItem } from "../../../types";
import { KBRecordItem } from "./KBRecordItem";

interface KBRecordsListProps {
  entries: KBItem[];
  isFetching: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export const KBRecordsList: React.FC<KBRecordsListProps> = ({
  entries,
  isFetching,
  onRefresh,
  onDelete,
}) => {
  const [search, setSearch] = useState("");

  const filtered = entries.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const text = item.content || item.question || item.title || "";
    const source = item.title || item.metadata?.source || "";
    const cat = item.category || "";
    return text.toLowerCase().includes(q) || source.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
  });

  return (
    <div className="kb-entries-section">
      <div className="kb-entries-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Database size={16} color="var(--blue)" />
          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
            Indexed Records in PostgreSQL ({filtered.length} of {entries.length})
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="kb-search-box">
            <Search size={14} color="var(--muted)" />
            <input
              type="text"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="secondary-button" onClick={onRefresh} disabled={isFetching}>
            <RefreshCw size={13} className={isFetching ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="kb-entries-list">
        {filtered.length === 0 ? (
          <div className="kb-empty-state">
            <p>No knowledge base records found.</p>
          </div>
        ) : (
          filtered.map((entry) => (
            <KBRecordItem key={entry.id} entry={entry} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
};

