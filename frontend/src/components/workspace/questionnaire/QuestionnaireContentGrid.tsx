import React from "react";
import { QuestionnaireWorkspaceProps } from "./types";
import { QuestionReviewList } from "../QuestionReviewList";
import { ResponseEditorPanel } from "../ResponseEditorPanel";
import { EvidenceSourcesPanel } from "../EvidenceSourcesPanel";

export const QuestionnaireContentGrid: React.FC<QuestionnaireWorkspaceProps> = (props) => {
  return (
    <div className="workspace-grid">
      <section className={`answer-column ${props.detectedQuestions.length ? "has-question-list" : ""}`}>
        {props.detectedQuestions.length > 0 && (
          <QuestionReviewList
            detectedQuestions={props.detectedQuestions}
            reviewStatusByQuestion={props.reviewStatusByQuestion}
            reviewCommentsByQuestion={props.reviewCommentsByQuestion}
            answersByQuestion={props.answersByQuestion}
            setAnswersByQuestion={props.setAnswersByQuestion}
            saveAnswers={props.saveAnswers}
            handleRequestChanges={props.handleRequestChanges}
            openSendForReviewModal={props.openSendForReviewModal}
            handleApproveQuestion={props.handleApproveQuestion}
            isBatchApproved={props.isBatchApproved}
            role={props.role}
            handleIndividualReview={props.handleIndividualReview}
            promotedQuestions={props.promotedQuestions}
            handlePromoteToKnowledgeBase={props.handlePromoteToKnowledgeBase}
          />
        )}
        <ResponseEditorPanel
          notice={props.notice}
          answer={props.answer}
          setAnswer={props.setAnswer}
          generateAnswer={props.generateAnswer}
          handleRequestChanges={props.handleRequestChanges}
          handleApproveQuestion={props.handleApproveQuestion}
          question={props.question}
          reviewStatusByQuestion={props.reviewStatusByQuestion}
          promotedQuestions={props.promotedQuestions}
          handlePromoteToKnowledgeBase={props.handlePromoteToKnowledgeBase}
          sourcesCount={props.response.sources.length}
          exemplarsUsed={props.response.exemplars_used}
          toneApplied={props.response.tone_applied}
        />
      </section>
      <EvidenceSourcesPanel
        sources={props.response.sources}
        activeSource={props.activeSource}
        setActiveSource={props.setActiveSource}
      />
    </div>
  );
};

