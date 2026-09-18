import React from "react";
import { Link, Upload, Check, ArrowUpRight } from "lucide-react";

interface ReviewImportPageProps {
  onNavigateHome: () => void;
  onNavigateResponses?: () => void;
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  sourceStatus: string;
  detectedQuestions: string[];
  openWorkspace: () => void;
}

export const ReviewImportPage: React.FC<ReviewImportPageProps> = ({
  onNavigateHome,
  onNavigateResponses,
  formUrl,
  setFormUrl,
  loadFormUrl,
  loadFormFile,
  sourceStatus,
  detectedQuestions,
  openWorkspace,
}) => {
  return (
    <div className="import-page">
      <header className="import-header">
        <div className="brand-mark" style={{ cursor: "pointer" }} onClick={onNavigateHome}>
          <span>R</span>
        </div>
        <div className="brand-name" style={{ cursor: "pointer" }} onClick={onNavigateHome}>
          RFP<span>Engine</span>
        </div>
        <span className="import-header-label">Response assistant</span>
      </header>
      <main className="import-main">
        <p className="breadcrumb">
          <span style={{ cursor: "pointer" }} onClick={onNavigateResponses || onNavigateHome}>
            Responses
          </span>{" "}
          <span>/</span> New response
        </p>
        <h1>Review your questionnaire</h1>
        <section className="import-source panel">
          <div className="source-input-row">
            <div className="source-url-field">
              <Link size={16} />
              <input
                value={formUrl}
                onChange={(event) => setFormUrl(event.target.value)}
                placeholder="https://buyer.example/questionnaire"
              />
              <button
                className="source-button"
                onClick={loadFormUrl}
                disabled={!formUrl.trim()}
              >
                Load URL
              </button>
            </div>
            <label className="upload-form-button">
              <Upload size={15} /> Upload Excel, Word, PDF, or CSV
              <input
                type="file"
                accept=".xlsx,.xls,.docx,.pdf,.csv,.tsv"
                onChange={loadFormFile}
              />
            </label>
          </div>
          <p className="source-status">
            <span className="status-dot" /> {sourceStatus}
          </p>
        </section>
        <section className="import-questions panel">
          <div className="import-question-heading">
            <div>
              <p className="eyebrow">02 / Detected questions</p>
              <h2>
                {detectedQuestions.length
                  ? `${detectedQuestions.length} questions ready`
                  : "No questions detected"}
              </h2>
            </div>
            <span className="source-count">Review before continuing</span>
          </div>
          {detectedQuestions.length ? (
            <div className="import-question-list">
              {detectedQuestions.map((detectedQuestion, index) => (
                <div
                  className="import-question"
                  key={`${detectedQuestion}-${index}`}
                >
                  <span className="source-rank">
                    Q{String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{detectedQuestion}</span>
                  <Check size={15} />
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-import">
              Load a URL or upload a form file to see its questions here.
            </p>
          )}
          <button
            className="primary-button continue-button"
            onClick={openWorkspace}
            disabled={!detectedQuestions.length}
          >
            Continue to workspace <ArrowUpRight size={15} />
          </button>
        </section>
      </main>
    </div>
  );
};

