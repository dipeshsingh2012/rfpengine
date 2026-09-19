import React from "react";
import { HomeWelcomeView } from "./HomeWelcomeView";
import { ResponsesDashboard } from "../responses/ResponsesDashboard";
import { QuestionnaireWorkspace, QuestionnaireWorkspaceProps } from "./QuestionnaireWorkspace";
import { WorkspaceSummaryItem } from "../../types";
import { AdminPage } from "../admin/AdminPage";

interface AppMainViewProps {
  route: string;
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  openImport: (id?: string) => void;
  isParsingDocument: boolean;
  parsingProgress: string;
  workspaceSummaries: WorkspaceSummaryItem[];
  isWorkspacesLoading: boolean;
  onSelectWorkspace: (id: string) => void;
  handleDuplicateWorkspace: (id: string) => Promise<void> | void;
  handleDeleteWorkspace: (id: string) => Promise<void> | void;
  handleExportWorkspace: (ws: WorkspaceSummaryItem) => void;
  onNewQuestionnaire: () => void;
  fetchWorkspaceSummaries: () => void;
  questionnaireProps: QuestionnaireWorkspaceProps;
  onExportTenantData?: () => void;
  workspaceSettings?: any;
  setWorkspaceSettings?: any;
  onSaveWorkspaceSettings?: (updates?: any) => Promise<void>;
  kbRecordsCount?: number;
  kbDocumentsCount?: number;
  recentRfpsCount?: number;
}

export const AppMainView: React.FC<AppMainViewProps> = (p) => {
  if (p.route === "/") {
    return (
      <HomeWelcomeView
        formUrl={p.formUrl}
        setFormUrl={p.setFormUrl}
        loadFormUrl={p.loadFormUrl}
        loadFormFile={p.loadFormFile}
        openImport={p.openImport}
        isParsingDocument={p.isParsingDocument}
        parsingProgress={p.parsingProgress}
      />
    );
  }

  if (p.route === "/responses") {
    return (
      <ResponsesDashboard
        workspaces={p.workspaceSummaries}
        isLoading={p.isWorkspacesLoading}
        onSelectWorkspace={p.onSelectWorkspace}
        onDuplicateWorkspace={p.handleDuplicateWorkspace}
        onDeleteWorkspace={p.handleDeleteWorkspace}
        onExportWorkspace={p.handleExportWorkspace}
        onNewQuestionnaire={p.onNewQuestionnaire}
        onRefresh={p.fetchWorkspaceSummaries}
      />
    );
  }

  if (p.route === "/settings" || p.route === "/admin") {
    return (
      <AdminPage
        tenantId={p.questionnaireProps.tenantId}
        showToast={p.questionnaireProps.showToast}
        onExport={p.onExportTenantData}
        workspaceSettings={p.workspaceSettings}
        setWorkspaceSettings={p.setWorkspaceSettings}
        onSaveWorkspaceSettings={p.onSaveWorkspaceSettings}
        kbRecordsCount={p.kbRecordsCount}
        kbDocumentsCount={p.kbDocumentsCount}
        recentRfpsCount={p.recentRfpsCount}
      />
    );
  }

  return <QuestionnaireWorkspace {...p.questionnaireProps} />;
};
