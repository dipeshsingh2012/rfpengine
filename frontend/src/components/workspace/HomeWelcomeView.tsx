import React from "react";
import { HomeUrlFeature } from "./home/HomeUrlFeature";
import { HomeUploadFeature } from "./home/HomeUploadFeature";

interface HomeWelcomeViewProps {
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  openImport: (id: string) => void;
  isParsingDocument?: boolean;
  parsingProgress?: string;
}

export const HomeWelcomeView: React.FC<HomeWelcomeViewProps> = ({
  formUrl,
  setFormUrl,
  loadFormUrl,
  loadFormFile,
  openImport,
  isParsingDocument = false,
  parsingProgress = "",
}) => {
  return (
    <section className="home-screen">
      <p className="eyebrow">Start a response</p>
      <h1>Bring in your questionnaire</h1>
      <p className="home-subtitle">Choose how you want to load the buyer form.</p>
      <div className="home-feature-grid">
        <HomeUrlFeature
          formUrl={formUrl}
          setFormUrl={setFormUrl}
          loadFormUrl={loadFormUrl}
          openImport={openImport}
          isParsingDocument={isParsingDocument}
        />
        <HomeUploadFeature
          loadFormFile={loadFormFile}
          openImport={openImport}
          isParsingDocument={isParsingDocument}
          parsingProgress={parsingProgress}
        />
      </div>
    </section>
  );
};
