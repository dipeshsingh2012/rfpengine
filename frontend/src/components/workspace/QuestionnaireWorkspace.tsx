import React from "react";
import { Link, RefreshCw, Sparkles, ArrowUpRight } from "lucide-react";
import { ReviewerRole, SearchResponse, SourceMode } from "../../types";
import { GovernanceBar } from "./GovernanceBar";
import { CelebrationBanner } from "./CelebrationBanner";
import { QuestionReviewList } from "./QuestionReviewList";
import { ResponseEditorPanel } from "./ResponseEditorPanel";
import { EvidenceSourcesPanel } from "./EvidenceSourcesPanel";
import { WorkspaceBottomStrip } from "./WorkspaceBottomStrip";

interface QuestionnaireWorkspaceProps {
  onNavigateHome: () => void;
  onNavigateResponses?: () => void;
  onOpenImport: (id: string) => void;
  responseId: string;
  sourceMode: SourceMode;
  sourceLabel: string;
  openOriginalForm: () => void;
  detectedQuestions: string[];
  question: string;
  setQuestion: (q: string) => void;
  tenantId: string;
  setTenantId: (id: string) => void;
  generateAnswer: () => void;
  generateAllAnswers: () => void;
  isGenerating: boolean;
  role: ReviewerRole;
  setRole: (r: ReviewerRole) => void;
  showToast: (msg: string) => void;
  approvedCount: number;
  inReviewCount: number;
  changesRequestedCount: number;
  isBatchApproved: boolean;
  handleBatchApproveAll: () => void;
  handleReviewReset: () => void;
  isAllApproved: boolean;
  exportAnswers: () => void;
  reviewStatusByQuestion: Record<string, string>;
  reviewCommentsByQuestion: Record<string, string>;
  answersByQuestion: Record<string, string>;
  setAnswersByQuestion: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  saveAnswers: (answers: Record<string, string>) => void;
  handleRequestChanges: (question: string) => void;
  openSendForReviewModal: (scope: "all" | "current", question?: string) => void;
  handleApproveQuestion: (question: string) => void;
  handleIndividualReview: (question: string) => void;
  promotedQuestions: Record<string, boolean>;
  handlePromoteToKnowledgeBase: (question: string, index: number) => void;
  notice: string;
  answer: string;
  setAnswer: (a: string) => void;
  response: SearchResponse;
  activeSource: string;
  setActiveSource: (id: string) => void;
}

export const QuestionnaireWorkspace: React.FC<QuestionnaireWorkspaceProps> = ({
  onNavigateHome,
  onNavigateResponses,
  onOpenImport,
  responseId,
  sourceMode,
  sourceLabel,
  openOriginalForm,
  detectedQuestions,
  question,
  setQuestion,
  tenantId,
  setTenantId,
  generateAnswer,
  generateAllAnswers,
  isGenerating,
  role,
  setRole,
  showToast,
  approvedCount,
  inReviewCount,
  changesRequestedCount,
  isBatchApproved,
  handleBatchApproveAll,
  handleReviewReset,
  isAllApproved,
  exportAnswers,
  reviewStatusByQuestion,
  reviewCommentsByQuestion,
  answersByQuestion,
  setAnswersByQuestion,
  saveAnswers,
  handleRequestChanges,
  openSendForReviewModal,
  handleApproveQuestion,
  handleIndividualReview,
  promotedQuestions,
  handlePromoteToKnowledgeBase,
  notice,
  answer,
  setAnswer,
  response,
  activeSource,
  setActiveSource,
}) => {
  const allCurrentQuestions = detectedQuestions.length > 0 ? detectedQuestions : [question];
  const isCsv = sourceLabel.toLowerCase().endsWith(".csv");

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="breadcrumb">
            <span style={{ cursor: "pointer" }} onClick={onNavigateResponses || onNavigateHome}>
              Responses
            </span>{" "}
            <span>/</span>{" "}
            <span
              style={{ cursor: "pointer" }}
              onClick={() => onOpenImport(responseId || "demo")}
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

      <div className="source-actions">
        <span className="source-badge">
          {sourceMode === "url"
            ? "Hosted form"
            : sourceMode === "upload"
              ? "Uploaded form"
              : "Live page"}{" "}
          · {sourceLabel}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          {!isCsv && (
            <button
              className="outline-button"
              onClick={openOriginalForm}
              title="Launch buyer form with pre-approved answers"
            >
              <Link size={15} /> Open original form
            </button>
          )}
        </div>
      </div>

      {detectedQuestions.length === 0 && (
        <section className="question-panel panel">
          <div className="panel-label">
            <span className="step-number">01</span>
            <div>
              <p className="eyebrow">Question to answer</p>
              <span className="label-hint">
                Ask a question or paste one from your RFP
              </span>
            </div>
          </div>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
          />
          <div className="question-footer">
            <div className="question-meta">
              <span className="status-dot" /> Knowledge base connected{" "}
              <span className="divider" /> Tenant:{" "}
              <select
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              >
                <option value="acme-corp">acme-corp</option>
                <option value="demo-tenant">demo-tenant</option>
              </select>
            </div>
            <button
              className="primary-button"
              onClick={generateAnswer}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {isGenerating ? "Drafting..." : "Draft with Proposal Drafter"}{" "}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </section>
      )}

      {/* Governance & Reviewer Role Bar */}
      <GovernanceBar
        role={role}
        setRole={setRole}
        showToast={showToast}
        approvedCount={approvedCount}
        allQuestionsCount={allCurrentQuestions.length}
        inReviewCount={inReviewCount}
        changesRequestedCount={changesRequestedCount}
        isBatchApproved={isBatchApproved}
        handleBatchApproveAll={handleBatchApproveAll}
        handleReviewReset={handleReviewReset}
      />

      {/* All-Approved Governance Celebration Banner */}
      <CelebrationBanner
        isAllApproved={isAllApproved}
        allQuestionsCount={allCurrentQuestions.length}
        isCsv={isCsv}
        exportAnswers={exportAnswers}
        openOriginalForm={openOriginalForm}
      />

      {detectedQuestions.length > 0 && (
        <div
          className="question-header-bar panel"
          style={{
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <span className="eyebrow">Questionnaire Response Workspace</span>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>
              {detectedQuestions.length} Questions in Questionnaire
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div className="question-meta">
              <span className="status-dot" /> Tenant:{" "}
              <select
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
              >
                <option value="acme-corp">acme-corp</option>
                <option value="demo-tenant">demo-tenant</option>
              </select>
            </div>
            <button
              className="primary-button"
              onClick={generateAllAnswers}
              disabled={isGenerating || isBatchApproved}
            >
              {isGenerating ? (
                <RefreshCw className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}
              {isGenerating ? "Generating All..." : "⚡ Generate All Answers"}{" "}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="workspace-grid">
        <section
          className={`answer-column ${detectedQuestions.length ? "has-question-list" : ""}`}
        >
          {detectedQuestions.length > 0 && (
            <QuestionReviewList
              detectedQuestions={detectedQuestions}
              reviewStatusByQuestion={reviewStatusByQuestion}
              reviewCommentsByQuestion={reviewCommentsByQuestion}
              answersByQuestion={answersByQuestion}
              setAnswersByQuestion={setAnswersByQuestion}
              saveAnswers={saveAnswers}
              handleRequestChanges={handleRequestChanges}
              openSendForReviewModal={openSendForReviewModal}
              handleApproveQuestion={handleApproveQuestion}
              isBatchApproved={isBatchApproved}
              role={role}
              handleIndividualReview={handleIndividualReview}
              promotedQuestions={promotedQuestions}
              handlePromoteToKnowledgeBase={handlePromoteToKnowledgeBase}
            />
          )}

          <ResponseEditorPanel
            notice={notice}
            answer={answer}
            setAnswer={setAnswer}
            generateAnswer={generateAnswer}
            handleRequestChanges={handleRequestChanges}
            handleApproveQuestion={handleApproveQuestion}
            question={question}
            reviewStatusByQuestion={reviewStatusByQuestion}
            promotedQuestions={promotedQuestions}
            handlePromoteToKnowledgeBase={handlePromoteToKnowledgeBase}
            sourcesCount={response.sources.length}
          />
        </section>

        <EvidenceSourcesPanel
          sources={response.sources}
          activeSource={activeSource}
          setActiveSource={setActiveSource}
        />
      </div>

      <WorkspaceBottomStrip
        confidenceScore={response.confidence_score}
        onSendForReview={() => openSendForReviewModal("all")}
      />
    </>
  );
};

