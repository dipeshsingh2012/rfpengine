import React from "react";
import { Link, ArrowUpRight, Upload } from "lucide-react";

interface HomeWelcomeViewProps {
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  openImport: (id: string) => void;
}

export const HomeWelcomeView: React.FC<HomeWelcomeViewProps> = ({
  formUrl,
  setFormUrl,
  loadFormUrl,
  loadFormFile,
  openImport,
}) => {
  return (
    <section className="home-screen">
      <p className="eyebrow">Start a response</p>
      <h1>Bring in your questionnaire</h1>
      <p className="home-subtitle">
        Choose how you want to load the buyer form.
      </p>
      <div className="home-feature-grid">
        <div className="home-feature">
          <div className="home-feature-icon">
            <Link size={22} />
          </div>
          <h2>Paste a form URL</h2>
          <p>
            Load a hosted questionnaire and extract its questions for review.
          </p>
          <div className="home-url-row">
            <input
              value={formUrl}
              onChange={(event) => setFormUrl(event.target.value)}
              placeholder="https://buyer.example/form"
            />
            <button
              className="primary-button"
              onClick={async () => {
                const id = await loadFormUrl();
                if (id) openImport(id);
              }}
              disabled={!formUrl.trim()}
            >
              Load URL <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
        <div className="home-feature">
          <div className="home-feature-icon upload-icon">
            <Upload size={22} />
          </div>
          <h2>Upload questionnaire</h2>
          <p>
            Import an Excel (.xlsx, .xls), Word (.docx), PDF, or CSV questionnaire from your computer.
          </p>
          <label className="home-upload-button">
            <Upload size={16} /> Choose questionnaire file
            <input
              type="file"
              accept=".xlsx,.xls,.docx,.pdf,.csv,.tsv"
              onChange={async (event) => {
                const id = await loadFormFile(event);
                if (id) openImport(id);
              }}
            />
          </label>
          <small>Questions and sections are extracted using enterprise multi-format AI parser.</small>
        </div>
      </div>
    </section>
  );
};

