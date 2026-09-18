import React from "react";
import { ExemplarItem } from "../../../types";

interface ExemplarItemCardProps {
  exemplar: ExemplarItem;
  index: number;
}

export const ExemplarItemCard: React.FC<ExemplarItemCardProps> = ({ exemplar, index }) => {
  return (
    <div
      key={exemplar.id || index}
      style={{
        background: "white",
        border: "1px solid #dcfce7",
        borderRadius: "4px",
        padding: "6px 8px",
        fontSize: "11px",
      }}
    >
      <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "2px" }}>
        Q: {exemplar.question}
      </div>
      <div style={{ color: "#475569", fontStyle: "italic" }}>
        "{exemplar.approved_answer.length > 150 ? `${exemplar.approved_answer.slice(0, 150)}...` : exemplar.approved_answer}"
      </div>
    </div>
  );
};

