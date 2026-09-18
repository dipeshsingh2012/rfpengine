import React from "react";

interface EditorHeadingProps {
  notice: string;
}

export const EditorHeading: React.FC<EditorHeadingProps> = ({ notice }) => (
  <div className="section-heading">
    <div>
      <p className="eyebrow">02 / Draft response</p>
      <h2>Drafted by Proposal Drafter</h2>
    </div>
    <span className="live-badge">
      <span /> {notice.includes("live") ? "Live" : "Preview"}
    </span>
  </div>
);

