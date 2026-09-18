import React from "react";
import { CheckCircle2 } from "lucide-react";

interface ExportSummaryCardProps {
  title: string;
  totalQuestions: number;
  approvedCount: number;
}

export const ExportSummaryCard: React.FC<ExportSummaryCardProps> = ({
  title,
  totalQuestions,
  approvedCount,
}) => {
  const pctApproved = totalQuestions > 0 ? Math.round((approvedCount / totalQuestions) * 100) : 0;

  return (
    <div
      style={{
        background: "var(--background, #f8fafc)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--ink, #0f172a)",
            maxWidth: "340px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title || "Questionnaire Responses"}
        </div>
        <div style={{ fontSize: "11px", color: "var(--muted, #64748b)", marginTop: "2px" }}>
          {totalQuestions} questions &bull; {approvedCount} approved ({pctApproved}%)
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          fontWeight: 600,
          color: pctApproved === 100 ? "#16a34a" : "#ca8a04",
          background: pctApproved === 100 ? "#dcfce7" : "#fef9c3",
          padding: "4px 10px",
          borderRadius: "16px",
        }}
      >
        <CheckCircle2 size={13} />
        {pctApproved === 100 ? "100% Approved" : `${pctApproved}% Ready`}
      </div>
    </div>
  );
};

