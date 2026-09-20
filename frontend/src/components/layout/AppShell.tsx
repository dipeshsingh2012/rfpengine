import React from "react";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { ToastNotice } from "../common/ToastNotice";
import { RecentRFPItem, ReviewerRole } from "../../types";

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
  isAdminActive?: boolean;
  isActivityActive: boolean;
  recentRFPs: RecentRFPItem[];
  activeResponseId: string;
  currentRoute?: string;
  onNavigateHome: () => void;
  onNavigateResponses: () => void;
  onNavigateAdmin?: () => void;
  onSelectRFP: (id: string) => void;
  onOpenKB: (tab: "upload" | "connectors" | "playground") => void;
  onOpenActivity: () => void;
  showSettingsModal: boolean;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId: string;
  totalResponsesCount?: number;
  toastNotice: string | null;
  role?: ReviewerRole;
  setRole?: (r: ReviewerRole) => void;
  showToast?: (msg: string) => void;
  user?: import("../../types").GoogleUser | null;
  onLogout?: () => void;
  googleClientId?: string;
  onCredentialSuccess?: (res: { credential: string }) => void;
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
        role={p.role}
        setRole={p.setRole}
        showToast={p.showToast}
        user={p.user}
        onLogout={p.onLogout}
        googleClientId={p.googleClientId}
        onCredentialSuccess={p.onCredentialSuccess}
      />
      <Sidebar
        mobileNavOpen={p.mobileNavOpen}
        setMobileNavOpen={p.setMobileNavOpen}
        isOverviewActive={p.isOverviewActive}
        isResponsesActive={p.isResponsesActive}
        isKbActive={p.isKbActive}
        isPlaygroundActive={p.isPlaygroundActive}
        isAdminActive={p.isAdminActive}
        isActivityActive={p.isActivityActive}
        recentRFPs={p.recentRFPs}
        activeResponseId={p.activeResponseId}
        currentRoute={p.currentRoute}
        onNavigateHome={p.onNavigateHome}
        onNavigateResponses={p.onNavigateResponses}
        onNavigateAdmin={p.onNavigateAdmin}
        onSelectRFP={p.onSelectRFP}
        onOpenKB={p.onOpenKB}
        onOpenActivity={p.onOpenActivity}
        onOpenSettings={p.onOpenSettings}
        showSettingsModal={p.showSettingsModal}
        kbTotalRecords={p.kbTotalRecords}
        kbTotalSources={p.kbTotalSources}
        tenantId={p.tenantId}
        totalResponsesCount={p.totalResponsesCount}
      />
      <main className="main-content">{p.children}</main>
      <ToastNotice message={p.toastNotice} />
    </div>
  );
};
