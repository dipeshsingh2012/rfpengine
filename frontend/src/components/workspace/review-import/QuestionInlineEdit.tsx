import React from "react";

interface QuestionInlineEditProps {
  id: string;
  editForm: { id: string; question_text: string; section: string; expected_type: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ id: string; question_text: string; section: string; expected_type: string }>>;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
}

export const QuestionInlineEdit: React.FC<QuestionInlineEditProps> = ({
  id,
  editForm,
  setEditForm,
  onSaveEdit,
  onCancelEdit,
}) => {
  return (
    <div className="inline-edit-box">
      <textarea
        value={editForm.question_text}
        onChange={(e) => setEditForm({ ...editForm, question_text: e.target.value })}
        rows={2}
      />
      <div className="edit-meta-row">
        <input
          value={editForm.section}
          onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
          placeholder="Section / Category"
        />
        <select
          value={editForm.expected_type}
          onChange={(e) => setEditForm({ ...editForm, expected_type: e.target.value })}
        >
          <option value="narrative">Narrative</option>
          <option value="choice">Choice (Yes/No)</option>
          <option value="numeric">Numeric Metric</option>
        </select>
        <button className="primary-button save-edit-btn" onClick={() => onSaveEdit(id)}>
          Save
        </button>
        <button className="outline-button cancel-edit-btn" onClick={onCancelEdit}>
          Cancel
        </button>
      </div>
    </div>
  );
};

