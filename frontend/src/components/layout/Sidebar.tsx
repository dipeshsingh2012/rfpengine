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
  isActivityActive: boolean;
  recentRFPs: RecentRFPItem[];
  activeResponseId: string;
  onNavigateHome: () => void;
  onNavigateResponses: () => void;
  onSelectRFP: (id: string) => void;
  onOpenKB: (tab: "upload" | "connectors" | "playground") => void;
  onOpenActivity: () => void;
  onOpenSettings: () => void;
  showSettingsModal: boolean;
  kbTotalRecords: number;
  kbTotalSources: number;
  tenantId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileNavOpen,
  setMobileNavOpen,
  isOverviewActive,
  isResponsesActive,
  isKbActive,
  isPlaygroundActive,
  isActivityActive,
  recentRFPs,
  activeResponseId,
  onNavigateHome,
  onNavigateResponses,
  onSelectRFP,
  onOpenKB,
  onOpenActivity,
  onOpenSettings,
  showSettingsModal,
  kbTotalRecords,
  kbTotalSources,
  tenantId = "acme-corp",
}) => {
  const onCloseMobile = () => setMobileNavOpen(false);

  return (
    <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
      <SidebarNavList
        isOverviewActive={isOverviewActive}
        isResponsesActive={isResponsesActive}
        isKbActive={isKbActive}
        isPlaygroundActive={isPlaygroundActive}
        isActivityActive={isActivityActive}
        recentCount={recentRFPs.length}
        kbTotalSources={kbTotalSources}
        kbTotalRecords={kbTotalRecords}
        tenantId={tenantId}
        onCloseMobile={onCloseMobile}
        onNavigateHome={onNavigateHome}
        onNavigateResponses={onNavigateResponses}
        onOpenKB={onOpenKB}
        onOpenActivity={onOpenActivity}
      />

      <SidebarRecentRFPs
        recentRFPs={recentRFPs}
        isResponsesActive={isResponsesActive}
        activeResponseId={activeResponseId}
        onCloseMobile={onCloseMobile}
        onSelectRFP={onSelectRFP}
        onNavigateHome={onNavigateHome}
      />

      <SidebarKbCard
        onCloseMobile={onCloseMobile}
        onOpenSettings={onOpenSettings}
        showSettingsModal={showSettingsModal}
        onOpenKB={onOpenKB}
        kbTotalRecords={kbTotalRecords}
        kbTotalSources={kbTotalSources}
        tenantId={tenantId}
      />
    </aside>
  );
};
