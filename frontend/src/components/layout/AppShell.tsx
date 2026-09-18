import React from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { ToastNotice } from "../common/ToastNotice";
import { RecentRFPItem } from "../../types";

interface AppShellProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  companyName: string;
  onOpenSettings: () => void;
  backendHealth: "ok" | "degraded" | "checking";
  isOverviewActive: boolean;
  isResponsesActive: boolean;
  isKbActive: boolean;
  isPlaygroundActive: boolean;
  isActivityActive: boolean;
  recentRFPs: RecentRFPItem[];
  activeResponseId: string;
  onNavigateHome: () => void;
  onNavigateResponses: () => void;
  onSelectRFP: (id: string) => void;
  onOpenKB: (tab: "upload" | "connectors" | "playground") => void;
  onOpenActivity: () => void;
  showSettingsModal: boolean;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId: string;
  toastNotice: string | null;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = (p) => {
  return (
    <div className="app-shell">
      <Topbar
        mobileNavOpen={p.mobileNavOpen}
        setMobileNavOpen={p.setMobileNavOpen}
        companyName={p.companyName}
        onOpenSettings={p.onOpenSettings}
        backendHealth={p.backendHealth}
        onNavigateHome={p.onNavigateHome}
      />

      <Sidebar
        mobileNavOpen={p.mobileNavOpen}
        setMobileNavOpen={p.setMobileNavOpen}
        isOverviewActive={p.isOverviewActive}
        isResponsesActive={p.isResponsesActive}
        isKbActive={p.isKbActive}
        isPlaygroundActive={p.isPlaygroundActive}
        isActivityActive={p.isActivityActive}
        recentRFPs={p.recentRFPs}
        activeResponseId={p.activeResponseId}
        onNavigateHome={p.onNavigateHome}
        onNavigateResponses={p.onNavigateResponses}
        onSelectRFP={p.onSelectRFP}
        onOpenKB={p.onOpenKB}
        onOpenActivity={p.onOpenActivity}
        onOpenSettings={p.onOpenSettings}
        showSettingsModal={p.showSettingsModal}
        kbTotalRecords={p.kbTotalRecords}
        kbTotalSources={p.kbTotalSources}
        tenantId={p.tenantId}
      />

      <main className="main-content">
        {p.children}
      </main>

      <ToastNotice message={p.toastNotice} />
    </div>
  );
};

