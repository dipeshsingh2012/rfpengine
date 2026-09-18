import React from "react";
import { ExtractedQuestionItem } from "../../../types";

interface SectionPillsBarProps {
  sectionsList: string[];
  selectedSection: string;
  onSelectSection: (sec: string) => void;
  questions: ExtractedQuestionItem[];
}

export const SectionPillsBar: React.FC<SectionPillsBarProps> = ({
  sectionsList,
  selectedSection,
  onSelectSection,
  questions,
}) => {
  if (sectionsList.length <= 1) return null;

  return (
    <div className="section-pills-bar">
      <button
        className={`section-pill ${selectedSection === "all" ? "active" : ""}`}
        onClick={() => onSelectSection("all")}
      >
        All Sections ({questions.length})
      </button>
      {sectionsList.map((sec) => {
        const count = questions.filter((q) => (q.section || "General") === sec).length;
        return (
          <button
            key={sec}
            className={`section-pill ${selectedSection.toLowerCase() === sec.toLowerCase() ? "active" : ""}`}
            onClick={() => onSelectSection(sec)}
          >
            {sec} ({count})
          </button>
        );
      })}
    </div>
  );
};

