import React from "react";
import { Link, ArrowUpRight } from "lucide-react";

interface HomeUrlFeatureProps {
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  openImport: (id: string) => void;
  isParsingDocument: boolean;
}

export const HomeUrlFeature: React.FC<HomeUrlFeatureProps> = ({
  formUrl,
  setFormUrl,
  loadFormUrl,
  openImport,
  isParsingDocument,
}) => {
  return (
    <div
      className="home-feature"
      style={isParsingDocument ? { opacity: 0.6, pointerEvents: "none" } : undefined}
    >
      <div className="home-feature-icon">
        <Link size={22} />
      </div>
      <h2>Paste a form URL</h2>
      <p>Load a hosted questionnaire and extract its questions for review.</p>
      <div className="home-url-row">
        <input
          value={formUrl}
          onChange={(event) => setFormUrl(event.target.value)}
          placeholder="https://buyer.example/form"
          disabled={isParsingDocument}
        />
        <button
          className="primary-button"
          onClick={async () => {
            const id = await loadFormUrl();
            if (id) openImport(id);
          }}
          disabled={!formUrl.trim() || isParsingDocument}
        >
          Load URL <ArrowUpRight size={15} />
        </button>
      </div>
    </div>
  );
};

