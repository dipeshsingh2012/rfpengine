import React, { useMemo } from "react";
import { ReviewImportPageProps } from "./review-import/types";
import { useReviewImportState } from "./review-import/useReviewImportState";
import { useQuestionOperations } from "./review-import/useQuestionOperations";
import { ImportHeader } from "./review-import/ImportHeader";
import { DocReferencePanel } from "./review-import/DocReferencePanel";
import { ReviewImportMainContent } from "./review-import/ReviewImportMainContent";
import { RephraseDiffModal } from "./review-import/RephraseDiffModal";
import { ReparseGuidanceModal } from "./review-import/ReparseGuidanceModal";

export { type ReviewImportPageProps } from "./review-import/types";

export const ReviewImportPage: React.FC<ReviewImportPageProps> = (props) => {
  const s = useReviewImportState(props);

  const sectionsList = useMemo(() => {
    const set = new Set<string>();
    s.questions.forEach((q) => { if (q.section) set.add(q.section); });
    return Array.from(set).sort();
  }, [s.questions]);

  const filteredQuestions = useMemo(() => {
    return s.questions.filter((q) => {
      const matchSearch = !s.searchQuery.trim() || q.question_text.toLowerCase().includes(s.searchQuery.toLowerCase()) || q.id.toLowerCase().includes(s.searchQuery.toLowerCase()) || (q.section && q.section.toLowerCase().includes(s.searchQuery.toLowerCase()));
      const matchSection = s.selectedSection === "all" || (q.section || "General").toLowerCase() === s.selectedSection.toLowerCase();
      return matchSearch && matchSection;
    });
  }, [s.questions, s.searchQuery, s.selectedSection]);

  const selectedCount = useMemo(() => s.questions.filter((q) => q.selected).length, [s.questions]);
  const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every((q) => q.selected);

  const ops = useQuestionOperations({ props, s, filteredQuestions, isAllFilteredSelected });

  return (
    <div className={`import-page ${s.showDocViewer && s.docViewMode === "split" ? "split-mode-active" : ""}`}>
      <ImportHeader
        onNavigateHome={props.onNavigateHome}
        hasUploadedFile={Boolean(props.uploadedFile)}
        showDocViewer={s.showDocViewer}
        onToggleDocViewer={() => s.setShowDocViewer(!s.showDocViewer)}
        selectedCount={selectedCount}
        onContinue={ops.handleContinue}
      />
      <div className="curation-studio-layout">
        {s.showDocViewer && (
          <DocReferencePanel
            uploadedFile={props.uploadedFile}
            uploadedFileContent={props.uploadedFileContent}
            docViewMode={s.docViewMode}
            setDocViewMode={s.setDocViewMode}
            documentBlobUrl={s.documentBlobUrl}
            onClose={() => s.setShowDocViewer(false)}
          />
        )}
        <ReviewImportMainContent
          props={props}
          s={s}
          ops={ops}
          sectionsList={sectionsList}
          filteredQuestions={filteredQuestions}
          selectedCount={selectedCount}
          isAllFilteredSelected={isAllFilteredSelected}
        />
      </div>
      <RephraseDiffModal data={s.rephraseModalData} onAccept={ops.applyRephrase} onClose={() => s.setRephraseModalData(null)} />
      <ReparseGuidanceModal
        isOpen={s.showReparseModal}
        guidance={s.reparseGuidance}
        setGuidance={s.setReparseGuidance}
        isReparsing={s.isReparsing}
        onExecuteReparse={ops.handleExecuteReparse}
        onClose={() => s.setShowReparseModal(false)}
      />
    </div>
  );
};
