import React from "react";
import { Edit2, Trash2, Sparkles } from "lucide-react";
import { ExtractedQuestionItem } from "../../../types";

interface QuestionCurationActionsProps {
  question: ExtractedQuestionItem;
  index: number;
  onRephrase?: (q: ExtractedQuestionItem, index: number) => void;
  isRephrasing: boolean;
  onStartEditing: (q: ExtractedQuestionItem) => void;
  onDelete: (id: string) => void;
}

export const QuestionCurationActions: React.FC<QuestionCurationActionsProps> = ({
  question: q,
  index,
  onRephrase,
  isRephrasing,
  onStartEditing,
  onDelete,
}) => {
  return (
    <div className="q-card-right">
      {onRephrase && (
        <button
          className="card-tool-btn rephrase-trigger"
          onClick={() => onRephrase(q, index)}
          disabled={isRephrasing}
          title="Rephrase and clean wording with Gemini 2.5 Flash"
        >
          <Sparkles size={14} /> Rephrase
        </button>
      )}
      <button className="card-tool-btn" onClick={() => onStartEditing(q)} title="Edit question text and section">
        <Edit2 size={14} />
      </button>
      <button className="card-tool-btn delete-btn" onClick={() => onDelete(q.id)} title="Remove false-positive question">
        <Trash2 size={14} />
      </button>
    </div>
  );
};

