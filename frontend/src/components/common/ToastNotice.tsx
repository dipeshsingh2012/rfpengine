import React from "react";
import { CheckCircle2 } from "lucide-react";

interface ToastNoticeProps {
  message: string | null;
}

export const ToastNotice: React.FC<ToastNoticeProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        background: "#18243b",
        color: "#ffffff",
        padding: "14px 20px",
        borderRadius: "8px",
        boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
        fontSize: "13px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        zIndex: 999999,
        borderLeft: "4px solid var(--lime)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <CheckCircle2 size={18} style={{ color: "var(--lime)" }} />
      <span style={{ fontWeight: 500 }}>{message}</span>
    </div>
  );
};

