import React from "react";
import { ArrowUpRight } from "lucide-react";
import { ExtractedQuestionItem } from "../../../types";
import { QuestionCurationItem } from "./QuestionCurationItem";

interface QuestionsCurationListProps {
  questions: ExtractedQuestionItem[];
  filteredQuestions: ExtractedQuestionItem[];
  selectedCount: number;
  editingId: string | null;
  editForm: { id: string; question_text: string; section: string; expected_type: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ id: string; question_text: string; section: string; expected_type: string }>>;
  searchQuery: string;
  selectedSection: string;
  onToggleSelection: (id: string) => void;
  onStartEditing: (q: ExtractedQuestionItem) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onRephrase?: (q: ExtractedQuestionItem, index: number) => void;
  isRephrasing: boolean;
  onSelectSection: (sec: string) => void;
  onContinue: () => void;
}

export const QuestionsCurationList: React.FC<QuestionsCurationListProps> = ({
  questions,
  filteredQuestions,
  selectedCount,
  editingId,
  editForm,
  setEditForm,
  searchQuery,
  selectedSection,
  onToggleSelection,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onRephrase,
  isRephrasing,
  onSelectSection,
  onContinue,
}) => {
  return (
    <>
      <div className="import-question-heading">
        <div>
          <p className="eyebrow">Showing {filteredQuestions.length} of {questions.length} questions</p>
          <h2>{selectedCount} questions selected for workspace import</h2>
        </div>
        <span className="source-count">
          {questions.length - selectedCount > 0 ? `${questions.length - selectedCount} skipped` : "All questions included"}
        </span>
      </div>

      {filteredQuestions.length ? (
        <div className="import-question-list">
          {filteredQuestions.map((q, index) => (
            <QuestionCurationItem
              key={q.id}
              question={q}
              index={index}
              isEditing={editingId === q.id}
              editForm={editForm}
              setEditForm={setEditForm}
              onToggleSelection={onToggleSelection}
              onStartEditing={onStartEditing}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDelete={onDelete}
              onRephrase={onRephrase}
              isRephrasing={isRephrasing}
              onSelectSection={onSelectSection}
            />
          ))}
        </div>
      ) : (
        <p className="empty-import">
          {searchQuery || selectedSection !== "all"
            ? "No questions match your current filter criteria."
            : "Load a URL or upload a form file to see its questions here."}
        </p>
      )}

      <div className="curation-footer-bar">
        <span className="footer-summary">
          Ready to draft answers for <strong>{selectedCount}</strong> curated questions
        </span>
        <button className="primary-button continue-button" onClick={onContinue} disabled={selectedCount === 0}>
          Import {selectedCount} Questions to Workspace <ArrowUpRight size={15} />
        </button>
      </div>
    </>
  );
};

