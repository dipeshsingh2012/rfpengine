import React from "react";
import { ArrowUpRight } from "lucide-react";
import { Source } from "../../types";
import { formatScore } from "../../utils/helpers";

interface EvidenceSourcesPanelProps {
  sources: Source[];
  activeSource: string;
  setActiveSource: (id: string) => void;
}

export const EvidenceSourcesPanel: React.FC<EvidenceSourcesPanelProps> = ({
  sources,
  activeSource,
  setActiveSource,
}) => {
  return (
    <aside className="sources-column">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 / Evidence</p>
          <h2>Retrieved sources</h2>
        </div>
        <span className="source-count">{sources.length} sources</span>
      </div>
      <div className="source-list">
        {sources.map((source, index) => (
          <button
            key={source.id}
            className={`source-card ${activeSource === source.id ? "source-active" : ""}`}
            onClick={() => setActiveSource(source.id)}
          >
            <div className="source-card-top">
              <span className="source-rank">0{index + 1}</span>
              <span className="match-score">
                {formatScore(Math.min(source.score * 30, 0.99))} match
              </span>
            </div>
            <strong>{source.question}</strong>
            <p>{source.answer}</p>
            <div className="source-id">
              <span>{source.id}</span>
              <ArrowUpRight size={14} />
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};
