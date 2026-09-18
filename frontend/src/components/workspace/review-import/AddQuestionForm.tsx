import React, { useState } from "react";

interface AddQuestionFormProps {
  onAdd: (text: string, section: string, expectedType: string) => void;
  onCancel: () => void;
}

export const AddQuestionForm: React.FC<AddQuestionFormProps> = ({ onAdd, onCancel }) => {
  const [text, setText] = useState("");
  const [section, setSection] = useState("General");
  const [type, setType] = useState("narrative");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), section.trim() || "General", type);
    setText("");
  };

  return (
    <div className="add-question-card panel">
      <h3>Add Missing Requirement / Question</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Describe your enterprise data retention and automated deletion procedures."
        rows={2}
      />
      <div className="add-question-row">
        <div className="form-group">
          <label>Section / Category:</label>
          <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Data Protection" />
        </div>
        <div className="form-group">
          <label>Expected Answer Type:</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="narrative">Narrative (Detailed response)</option>
            <option value="choice">Choice (Yes / No / Comply)</option>
            <option value="numeric">Numeric (SLA / Hours / Count)</option>
          </select>
        </div>
        <div className="add-question-actions">
          <button className="primary-button" onClick={handleSubmit} disabled={!text.trim()}>
            Add to Review List
          </button>
          <button className="outline-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

