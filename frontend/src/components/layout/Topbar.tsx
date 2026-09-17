import React from "react";
import {
  Menu,
  X,
  ChevronDown,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface TopbarProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  companyName: string;
  onOpenSettings: () => void;
  backendEnv: string;
  backendHealth: "ok" | "degraded" | "checking";
  activeApiBase: string;
  setActiveApiBase: (url: string) => void;
  onNavigateHome: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  mobileNavOpen,
  setMobileNavOpen,
  companyName,
  onOpenSettings,
  backendEnv,
  backendHealth,
  activeApiBase,
  setActiveApiBase,
  onNavigateHome,
}) => {
  const isProd = backendEnv === "prod" || backendEnv === "production";

  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <button className="brand-mark" onClick={onNavigateHome} aria-label="Go to home">
        <span>R</span>
      </button>
      <div className="brand-name">
        RFP<span>Engine</span>
      </div>
      <div
        className="workspace-switcher"
        onClick={onOpenSettings}
        style={{ cursor: "pointer" }}
        title="Open Workspace Settings"
      >
        <span className="workspace-dot" /> {companyName || "Acme Corporation"}{" "}
        <ChevronDown size={15} />
      </div>
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
          backgroundColor: isProd ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
          color: isProd ? "#10b981" : "#f59e0b",
          border: `1px solid ${isProd ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
          cursor: "pointer",
          marginLeft: "8px",
        }}
        onClick={() => {
          const nextUrl =
            activeApiBase.includes("localhost") || activeApiBase.startsWith("/api")
              ? "https://rfpengine-api-fwwnzie4dq-uc.a.run.app/api"
              : "/api";
          localStorage.setItem("rfpengine.custom_api_url", nextUrl);
          setActiveApiBase(nextUrl);
        }}
        title={`Active API: ${activeApiBase}\nStatus: ${backendHealth.toUpperCase()}\nClick to toggle Local / Cloud Prod target`}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor:
              backendHealth === "ok" ? (isProd ? "#10b981" : "#f59e0b") : "#ef4444",
          }}
        />
        {isProd ? "PROD CLOUD" : "LOCAL DEV"}
      </div>
      <div className="topbar-spacer" />
      <a
        href="https://rfpengine.aroadmap.dev/"
        target="_blank"
        rel="noopener noreferrer"
        className="outline-button"
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#eef2ff",
          borderColor: "#c7d2fe",
          color: "var(--blue)",
          fontWeight: 700,
          textDecoration: "none",
        }}
        title="Open live strategy & PRD roadmap on aroadmap.dev"
      >
        <TrendingUp size={14} /> 🗺️ Roadmap (aroadmap.dev)
      </a>
      <button className="icon-button" title="Open notifications">
        <AlertCircle size={18} />
      </button>
      <button className="avatar" title="Account menu">
        JD
      </button>
    </header>
  );
};

