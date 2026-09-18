import React from "react";

interface TopbarHealthBadgeProps {
  backendHealth: "ok" | "degraded" | "checking";
}

export const TopbarHealthBadge: React.FC<TopbarHealthBadgeProps> = ({ backendHealth }) => {
  const isOk = backendHealth === "ok";
  return (
    <div
      className="env-indicator"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: "9999px",
        backgroundColor: isOk ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
        color: isOk ? "#10b981" : "#ef4444",
        border: `1px solid ${isOk ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
        marginLeft: "8px",
      }}
      title={`Status: ${backendHealth.toUpperCase()}`}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: isOk ? "#10b981" : "#ef4444",
        }}
      />
      PROD
    </div>
  );
};

