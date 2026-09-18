import React, { useState, useEffect } from "react";
import { MessageSquare, X, Check } from "lucide-react";
import { ModalPortal } from "../../common/ModalPortal";

interface RevisionFeedbackModalProps {
  isOpen: boolean; questionText: string; initialNote: string;
  reviewerRole: string; onSave: (note: string) => void; onClose: () => void;
}

export const RevisionFeedbackModal: React.FC<RevisionFeedbackModalProps> = ({
  isOpen, questionText, initialNote, reviewerRole, onSave, onClose,
}) => {
  const [note, setNote] = useState(initialNote);
  useEffect(() => { setNote(initialNote); }, [initialNote, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(note.trim());
    onClose();
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} cardClassName="modal-card revision-feedback-modal" ariaLabel="Request revision feedback">
      <div className="modal-header">
        <div className="modal-title-row">
          <MessageSquare size={18} style={{ color: "#d97706" }} />
          <h3>Request Revisions ({reviewerRole})</h3>
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close dialog">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <div className="form-group">
            <label>Question Requirement</label>
            <p className="revision-question-preview">
              {questionText.length > 140 ? `${questionText.slice(0, 140)}...` : questionText}
            </p>
          </div>

          <div className="form-group">
            <label>Revision Feedback & Instructions</label>
            <textarea
              className="feedback-textarea"
              rows={4}
              placeholder="e.g. Please clarify our AES-256 backup retention window and verify ISO 27001 certificate renewal dates."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="feedback-chips">
            <span className="chips-label">Quick Notes:</span>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setNote((prev) => `${prev ? `${prev} ` : ""}Requires technical architecture SME review.`)}
            >
              Needs SME Review
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setNote((prev) => `${prev ? `${prev} ` : ""}Please update compliance standard citation.`)}
            >
              Update Citation
            </button>
            <button
              type="button"
              className="chip-btn"
              onClick={() => setNote((prev) => `${prev ? `${prev} ` : ""}Answer is too lengthy, please make concise.`)}
            >
              Make Concise
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            <Check size={14} /> Submit Feedback
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};

