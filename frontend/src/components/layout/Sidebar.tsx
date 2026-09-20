import React from "react";
import { RecentRFPItem } from "../../types";
import { SidebarNavList } from "./sidebar/SidebarNavList";
import { SidebarRecentRFPs } from "./sidebar/SidebarRecentRFPs";
import { SidebarKbCard } from "./sidebar/SidebarKbCard";

interface SidebarProps {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
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
  onOpenSettings: () => void;
  showSettingsModal: boolean;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId?: string;
  totalResponsesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = (p) => {
  const onCloseMobile = () => p.setMobileNavOpen(false);
  const tenantId = p.tenantId || "acme-corp";

  return (
    <aside className={`sidebar ${p.mobileNavOpen ? "open" : ""}`}>
      <SidebarNavList
        isOverviewActive={p.isOverviewActive}
        isResponsesActive={p.isResponsesActive}
        isKbActive={p.isKbActive}
        isPlaygroundActive={p.isPlaygroundActive}
        isAdminActive={p.isAdminActive}
        isSettingsActive={p.isAdminActive}
        isActivityActive={p.isActivityActive}
        totalResponsesCount={p.totalResponsesCount}
        recentCount={(p.recentRFPs || []).length}
        kbTotalSources={p.kbTotalSources}
        kbTotalRecords={p.kbTotalRecords}
        tenantId={tenantId}
        onCloseMobile={onCloseMobile}
        onNavigateHome={p.onNavigateHome}
        onNavigateResponses={p.onNavigateResponses}
        onNavigateAdmin={p.onNavigateAdmin}
        onNavigateSettings={p.onNavigateAdmin}
        onOpenKB={p.onOpenKB}
        onOpenActivity={p.onOpenActivity}
      />
      <SidebarRecentRFPs
        recentRFPs={p.recentRFPs || []}
        isResponsesActive={p.isResponsesActive}
        activeResponseId={p.activeResponseId}
        currentRoute={p.currentRoute}
        onCloseMobile={onCloseMobile}
        onSelectRFP={p.onSelectRFP}
        onNavigateHome={p.onNavigateHome}
      />
      <SidebarKbCard
        onCloseMobile={onCloseMobile}
        onOpenSettings={p.onOpenSettings}
        showSettingsModal={p.showSettingsModal}
        onOpenKB={p.onOpenKB}
        kbTotalRecords={p.kbTotalRecords}
        kbTotalSources={p.kbTotalSources}
        tenantId={tenantId}
      />
    </aside>
  );
};
