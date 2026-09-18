import React from "react";
import { CheckSquare, Square } from "lucide-react";
import { ExtractedQuestionItem } from "../../../types";
import { QuestionInlineEdit } from "./QuestionInlineEdit";
import { QuestionCurationActions } from "./QuestionCurationActions";

interface QuestionCurationItemProps {
  question: ExtractedQuestionItem;
  index: number;
  isEditing: boolean;
  editForm: { id: string; question_text: string; section: string; expected_type: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ id: string; question_text: string; section: string; expected_type: string }>>;
  onToggleSelection: (id: string) => void;
  onStartEditing: (q: ExtractedQuestionItem) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onRephrase?: (q: ExtractedQuestionItem, index: number) => void;
  isRephrasing: boolean;
  onSelectSection: (sec: string) => void;
}

export const QuestionCurationItem: React.FC<QuestionCurationItemProps> = ({
  question: q,
  index,
  isEditing,
  editForm,
  setEditForm,
  onToggleSelection,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onRephrase,
  isRephrasing,
  onSelectSection,
}) => {
  return (
    <div className={`import-question-card ${q.selected ? "selected" : "deselected"}`}>
      <div className="q-card-left">
        <button
          className="checkbox-btn"
          onClick={() => onToggleSelection(q.id)}
          title={q.selected ? "Exclude from workspace" : "Include in workspace"}
        >
          {q.selected ? <CheckSquare size={18} className="checked-icon" /> : <Square size={18} className="unchecked-icon" />}
        </button>
        <span className="source-rank">{q.id}</span>
      </div>

      <div className="q-card-center">
        {isEditing ? (
          <QuestionInlineEdit
            id={q.id}
            editForm={editForm}
            setEditForm={setEditForm}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        ) : (
          <>
            <div className="q-text-line">
              <span>{q.question_text}</span>
              {q.is_user_added && <span className="pill-badge user-added">Added</span>}
              {q.is_edited && <span className="pill-badge edited">Edited</span>}
              {q.is_rephrased && <span className="pill-badge rephrased">✨ AI Rephrased</span>}
            </div>
            <div className="q-tags-line">
              {q.section && (
                <span className="section-tag" onClick={() => onSelectSection(q.section || "all")}>
                  📁 {q.section}
                </span>
              )}
              <span className="type-tag">
                {q.expected_type === "choice" ? "⚖️ Yes/No Choice" : q.expected_type === "numeric" ? "🔢 Metric SLA" : "📝 Narrative"}
              </span>
            </div>
          </>
        )}
      </div>

      {!isEditing && (
        <QuestionCurationActions
          question={q}
          index={index}
          onRephrase={onRephrase}
          isRephrasing={isRephrasing}
          onStartEditing={onStartEditing}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};

