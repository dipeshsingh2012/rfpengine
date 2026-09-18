import React from "react";
import { HomeWelcomeView } from "./HomeWelcomeView";
import { ResponsesDashboard } from "../responses/ResponsesDashboard";
import { QuestionnaireWorkspace, QuestionnaireWorkspaceProps } from "./QuestionnaireWorkspace";
import { WorkspaceSummaryItem } from "../../types";

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
}

export const AppMainView: React.FC<AppMainViewProps> = ({
  route,
  formUrl,
  setFormUrl,
  loadFormUrl,
  loadFormFile,
  openImport,
  isParsingDocument,
  parsingProgress,
  workspaceSummaries,
  isWorkspacesLoading,
  onSelectWorkspace,
  handleDuplicateWorkspace,
  handleDeleteWorkspace,
  handleExportWorkspace,
  onNewQuestionnaire,
  fetchWorkspaceSummaries,
  questionnaireProps,
}) => {
  if (route === "/") {
    return (
      <HomeWelcomeView
        formUrl={formUrl}
        setFormUrl={setFormUrl}
        loadFormUrl={loadFormUrl}
        loadFormFile={loadFormFile}
        openImport={openImport}
        isParsingDocument={isParsingDocument}
        parsingProgress={parsingProgress}
      />
    );
  }

  if (route === "/responses") {
    return (
      <ResponsesDashboard
        workspaces={workspaceSummaries}
        isLoading={isWorkspacesLoading}
        onSelectWorkspace={onSelectWorkspace}
        onDuplicateWorkspace={handleDuplicateWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onExportWorkspace={handleExportWorkspace}
        onNewQuestionnaire={onNewQuestionnaire}
        onRefresh={fetchWorkspaceSummaries}
      />
    );
  }

  return <QuestionnaireWorkspace {...questionnaireProps} />;
};

