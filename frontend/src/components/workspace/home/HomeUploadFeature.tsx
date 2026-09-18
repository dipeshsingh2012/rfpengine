import React from "react";
import { Upload, RefreshCw, FileText } from "lucide-react";

interface HomeUploadFeatureProps {
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  openImport: (id: string) => void;
  isParsingDocument: boolean;
  parsingProgress: string;
}

export const HomeUploadFeature: React.FC<HomeUploadFeatureProps> = ({
  loadFormFile,
  openImport,
  isParsingDocument,
  parsingProgress,
}) => {
  return (
    <div className="home-feature">
      <div className="home-feature-icon upload-icon">
        {isParsingDocument ? <FileText size={22} className="spin" /> : <Upload size={22} />}
      </div>
      <h2>Upload questionnaire</h2>
      <p>
        Import an Excel (.xlsx, .xls), Word (.docx), PDF, or CSV questionnaire from your computer.
      </p>
      {isParsingDocument ? (
        <div className="home-parsing-loader">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <RefreshCw size={17} className="spin" style={{ color: "var(--blue)", flexShrink: 0 }} />
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--navy)" }}>
              {parsingProgress || "Extracting questions with Gemini 2.5 Flash..."}
            </div>
          </div>
          <div className="home-parsing-progress-bar">
            <div className="home-parsing-progress-inner" />
          </div>
          <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
            Analyzing document hierarchy, compliance tables, and question types...
          </small>
        </div>
      ) : (
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
      )}
      {!isParsingDocument && (
        <small>Questions and sections are extracted using enterprise multi-format AI parser.</small>
      )}
    </div>
  );
};

