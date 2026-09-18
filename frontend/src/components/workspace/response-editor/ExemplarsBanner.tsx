import React, { useState } from "react";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { ExemplarItem } from "../../../types";
import { ExemplarItemCard } from "./ExemplarItemCard";

interface ExemplarsBannerProps {
  exemplars: ExemplarItem[];
  toneApplied?: string;
}

const bannerStyle: React.CSSProperties = {
  margin: "0 16px 12px",
  padding: "8px 12px",
  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
  border: "1px solid #bbf7d0",
  borderRadius: "6px",
  fontSize: "12px",
};

export const ExemplarsBanner: React.FC<ExemplarsBannerProps> = ({ exemplars, toneApplied }) => {
  const [showDrawer, setShowDrawer] = useState(false);
  if (exemplars.length === 0) return null;

  return (
    <div style={bannerStyle}>
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        onClick={() => setShowDrawer((prev) => !prev)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 600, color: "#166534" }}>
          <Award size={14} /> ✨ Brand Voice Active: {exemplars.length} Vetted Golden Exemplar{exemplars.length === 1 ? "" : "s"} Injected
          <span style={{ fontSize: "10.5px", fontWeight: 500, color: "#15803d", background: "#dcfce7", padding: "1px 6px", borderRadius: "4px" }}>
            {toneApplied || "Authoritative & Direct"}
          </span>
        </span>
        <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "#166534", display: "flex", alignItems: "center", gap: "2px", fontSize: "11px", fontWeight: 600 }}>
          {showDrawer ? "Hide Details" : "Inspect Exemplars"}
          {showDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showDrawer && (
        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #86efac", display: "flex", flexDirection: "column", gap: "6px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#14532d" }}>
            The AI adapted its sentence structure, executive confidence, and tone from these SME-approved answers:
          </p>
          {exemplars.map((ex, idx) => (
            <ExemplarItemCard key={ex.id || idx} exemplar={ex} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};

