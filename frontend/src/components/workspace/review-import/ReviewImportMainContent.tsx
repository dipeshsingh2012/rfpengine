import React from "react";
import { ReviewImportPageProps } from "./types";
import { ExtractedQuestionItem } from "../../../types";
import { AiFeedbackBanner } from "./AiFeedbackBanner";
import { ImportSourceStrip } from "./ImportSourceStrip";
import { CurationToolbar } from "./CurationToolbar";
import { SectionPillsBar } from "./SectionPillsBar";
import { AddQuestionForm } from "./AddQuestionForm";
import { QuestionsCurationList } from "./QuestionsCurationList";

interface ReviewImportMainContentProps {
  props: ReviewImportPageProps;
  s: any;
  ops: any;
  sectionsList: string[];
  filteredQuestions: ExtractedQuestionItem[];
  selectedCount: number;
  isAllFilteredSelected: boolean;
}

export const ReviewImportMainContent: React.FC<ReviewImportMainContentProps> = ({
  props,
  s,
  ops,
  sectionsList,
  filteredQuestions,
  selectedCount,
  isAllFilteredSelected,
}) => {
  return (
    <main className="curation-main-content">
      <p className="breadcrumb">
        <span style={{ cursor: "pointer" }} onClick={props.onNavigateResponses || props.onNavigateHome}>Responses</span> <span>/</span> Review & Curate Questionnaire
      </p>
      <div className="curation-header-row">
        <div>
          <h1>Review & Curate Questionnaire</h1>
          <p className="curation-subtitle">Inspect, refine, or selectively choose extracted prompts before generating grounded responses.</p>
        </div>
      </div>
      <AiFeedbackBanner
        sourceStatus={props.sourceStatus}
        feedbackNotice={s.feedbackNotice}
        feedbackRating={s.feedbackRating}
        onRateAccuracy={ops.handleRateAccuracy}
        hasUploadedFile={Boolean(props.uploadedFile)}
        onOpenReparseModal={() => s.setShowReparseModal(true)}
      />
      <ImportSourceStrip formUrl={props.formUrl} setFormUrl={props.setFormUrl} loadFormUrl={props.loadFormUrl} loadFormFile={props.loadFormFile} />
      <section className="import-questions panel">
        <CurationToolbar
          searchQuery={s.searchQuery}
          setSearchQuery={s.setSearchQuery}
          showAddForm={s.showAddForm}
          setShowAddForm={s.setShowAddForm}
          isAllFilteredSelected={isAllFilteredSelected}
          onToggleSelectAll={ops.toggleSelectAllFiltered}
        />
        <SectionPillsBar sectionsList={sectionsList} selectedSection={s.selectedSection} onSelectSection={s.setSelectedSection} questions={s.questions} />
        {s.showAddForm && <AddQuestionForm onAdd={ops.handleAddQuestion} onCancel={() => s.setShowAddForm(false)} />}
        <QuestionsCurationList
          questions={s.questions}
          filteredQuestions={filteredQuestions}
          selectedCount={selectedCount}
          editingId={s.editingId}
          editForm={s.editForm}
          setEditForm={s.setEditForm}
          searchQuery={s.searchQuery}
          selectedSection={s.selectedSection}
          onToggleSelection={ops.toggleQuestionSelection}
          onStartEditing={ops.startEditing}
          onSaveEdit={ops.saveEdit}
          onCancelEdit={() => s.setEditingId(null)}
          onDelete={ops.handleDeleteQuestion}
          onRephrase={ops.handleTriggerRephrase}
          isRephrasing={s.isRephrasing}
          onSelectSection={s.setSelectedSection}
          onContinue={ops.handleContinue}
        />
      </section>
    </main>
  );
};

