import React from "react";
import { Link, Upload } from "lucide-react";

interface ImportSourceStripProps {
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
}

export const ImportSourceStrip: React.FC<ImportSourceStripProps> = ({
  formUrl,
  setFormUrl,
  loadFormUrl,
  loadFormFile,
}) => {
  return (
    <section className="import-source-mini panel">
      <div className="source-input-row">
        <div className="source-url-field">
          <Link size={15} />
          <input
            value={formUrl}
            onChange={(event) => setFormUrl(event.target.value)}
            placeholder="https://buyer.example/questionnaire"
          />
          <button className="source-button" onClick={loadFormUrl} disabled={!formUrl.trim()}>
            Load URL
          </button>
        </div>
        <label className="upload-form-button">
          <Upload size={14} /> Replace File (.pdf, .docx, .xlsx, .csv)
          <input type="file" accept=".xlsx,.xls,.docx,.pdf,.csv,.tsv" onChange={loadFormFile} />
        </label>
      </div>
    </section>
  );
};

