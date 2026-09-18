import React from "react";
import { Play, RefreshCw, AlertCircle } from "lucide-react";
import { SearchResponse, playgroundStarterQueries } from "../../../types";
import { KBPlaygroundResults } from "./KBPlaygroundResults";

interface KBPlaygroundTabProps {
  query: string;
  setQuery: (q: string) => void;
  topK: number;
  setTopK: (k: number) => void;
  isLoading: boolean;
  onSearch: (qOverride?: string) => void;
  error: string | null;
  result: SearchResponse | null;
}

export const KBPlaygroundTab: React.FC<KBPlaygroundTabProps> = ({
  query,
  setQuery,
  topK,
  setTopK,
  isLoading,
  onSearch,
  error,
  result,
}) => {
  return (
    <div className="kb-playground-tab">
      <div className="kb-playground-input-panel">
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
          <input
            type="text"
            className="playground-search-input"
            placeholder="Type a compliance query to test vector retrieval..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
          />
          <button className="primary-button" onClick={() => onSearch()} disabled={isLoading || !query.trim()}>
            {isLoading ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
            {isLoading ? "Retrieving..." : "Run Search"}
          </button>
        </div>

        <div className="playground-controls-row">
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Top-K Passages:</span>
            <input
              type="range"
              min={1}
              max={8}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value, 10) || 4)}
              style={{ width: "80px" }}
            />
            <span style={{ fontSize: "11px", fontWeight: 700 }}>{topK}</span>
          </div>
          <div className="starter-query-chips">
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Starters:</span>
            {playgroundStarterQueries.map((starter, i) => (
              <button
                key={i}
                className="starter-chip"
                onClick={() => { setQuery(starter); onSearch(starter); }}
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="kb-notice-banner error" style={{ margin: "10px 0" }}>
          <AlertCircle size={15} /> <span>{error}</span>
        </div>
      )}

      {result && <KBPlaygroundResults result={result} />}
    </div>
  );
};

