import React from "react";

interface WorkspaceBreadcrumbHeaderProps {
  onNavigateHome: () => void;
  onNavigateResponses?: () => void;
  onOpenImport: (id: string) => void;
  responseId: string;
}

export const WorkspaceBreadcrumbHeader: React.FC<WorkspaceBreadcrumbHeaderProps> = ({
  onNavigateHome,
  onNavigateResponses,
  onOpenImport,
  responseId,
}) => {
  return (
    <div className="page-heading">
      <div>
        <p className="breadcrumb">
          <span style={{ cursor: "pointer" }} onClick={onNavigateResponses || onNavigateHome}>
            Responses
          </span>{" "}
          <span>/</span>{" "}
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (responseId) onOpenImport(responseId);
              else onNavigateHome();
            }}
          >
            Review questionnaire
          </span>
        </p>
        <h1>Response workspace</h1>
        <p className="subtitle">
          Draft accurate answers from your approved knowledge base.
        </p>
      </div>
    </div>
  );
};

