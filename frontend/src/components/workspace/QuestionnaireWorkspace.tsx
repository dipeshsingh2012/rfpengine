import React from "react";
import { GovernanceBar } from "./GovernanceBar";
import { CelebrationBanner } from "./CelebrationBanner";
import { WorkspaceBottomStrip } from "./WorkspaceBottomStrip";
import { WorkspaceBreadcrumbHeader } from "./questionnaire/WorkspaceBreadcrumbHeader";
import { WorkspaceSourceActionsBar } from "./questionnaire/WorkspaceSourceActionsBar";
import { SingleQuestionInputPanel } from "./questionnaire/SingleQuestionInputPanel";
import { BatchQuestionsHeaderBar } from "./questionnaire/BatchQuestionsHeaderBar";
import { QuestionnaireContentGrid } from "./questionnaire/QuestionnaireContentGrid";
import { QuestionnaireWorkspaceProps } from "./questionnaire/types";

export { type QuestionnaireWorkspaceProps } from "./questionnaire/types";

export const QuestionnaireWorkspace: React.FC<QuestionnaireWorkspaceProps> = (props) => {
  const allCurrentQuestions = props.detectedQuestions.length > 0 ? props.detectedQuestions : [props.question];
  const isQuestionFilled = (q: string) => Boolean(props.answersByQuestion[q]?.trim());
  const answeredCount = props.detectedQuestions.length > 0
    ? props.detectedQuestions.filter(isQuestionFilled).length
    : (props.answer?.trim() ? 1 : 0);
  const totalCount = props.detectedQuestions.length > 0 ? props.detectedQuestions.length : 1;
  const isAllFilled = answeredCount === totalCount && totalCount > 0;

  return (
    <>
      <WorkspaceBreadcrumbHeader
        onNavigateHome={props.onNavigateHome}
        onNavigateResponses={props.onNavigateResponses}
        onOpenImport={props.onOpenImport}
        responseId={props.responseId}
      />
      <WorkspaceSourceActionsBar
        sourceMode={props.sourceMode}
        sourceLabel={props.sourceLabel}
        openOriginalForm={props.openOriginalForm}
        onOpenExportModal={props.onOpenExportModal}
        isAllFilled={isAllFilled}
        answeredQuestionsCount={answeredCount}
        totalQuestionsCount={totalCount}
      />
      {props.detectedQuestions.length === 0 && (
        <SingleQuestionInputPanel
          question={props.question}
          setQuestion={props.setQuestion}
          tenantId={props.tenantId}
          setTenantId={props.setTenantId}
          generateAnswer={props.generateAnswer}
          isGenerating={props.isGenerating}
        />
      )}
      <GovernanceBar
        role={props.role}
        setRole={props.setRole}
        showToast={props.showToast}
        approvedCount={props.approvedCount}
        allQuestionsCount={allCurrentQuestions.length}
        inReviewCount={props.inReviewCount}
        changesRequestedCount={props.changesRequestedCount}
        isBatchApproved={props.isBatchApproved}
        handleBatchApproveAll={props.handleBatchApproveAll}
        handleReviewReset={props.handleReviewReset}
      />
      <CelebrationBanner
        isAllApproved={props.isAllApproved}
        allQuestionsCount={allCurrentQuestions.length}
        isCsv={props.sourceLabel.toLowerCase().endsWith(".csv")}
        exportAnswers={props.exportAnswers}
        openOriginalForm={props.openOriginalForm}
        onOpenExportModal={props.onOpenExportModal}
        sourceMode={props.sourceMode}
      />
      {props.detectedQuestions.length > 0 && (
        <BatchQuestionsHeaderBar
          questionsCount={props.detectedQuestions.length}
          tenantId={props.tenantId}
          setTenantId={props.setTenantId}
          generateAllAnswers={props.generateAllAnswers}
          isGenerating={props.isGenerating}
          isBatchApproved={props.isBatchApproved}
        />
      )}
      <QuestionnaireContentGrid {...props} />
      <WorkspaceBottomStrip
        confidenceScore={props.response.confidence_score}
        onSendForReview={() => props.openSendForReviewModal("all")}
      />
    </>
  );
};
