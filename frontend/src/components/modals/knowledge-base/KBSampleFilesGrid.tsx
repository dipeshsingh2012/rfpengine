import React from "react";
import { FileText, Download } from "lucide-react";
import { sampleDemoFiles } from "../../../types";

export const KBSampleFilesGrid: React.FC = () => {
  return (
    <div style={{ margin: "20px 0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <FileText size={15} color="var(--navy)" />
        <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
          Download Pre-Built Demo & Benchmark Datasets
        </h3>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--muted)" }}>
        Need test documents? Download sample questionnaires, security policies, and standard compliance packages:
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "10px",
        }}
      >
        {sampleDemoFiles.map((file) => (
          <a
            key={file.file}
            href={`/demo-data/${file.file}`}
            download={file.file}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              background: "#f8fafc",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              textDecoration: "none",
              color: "var(--ink)",
              fontSize: "12px",
              transition: "border-color 0.15s ease",
            }}
          >
            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div style={{ fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "'DM Mono', monospace" }}>
                {file.file} ({file.format})
              </div>
            </div>
            <Download size={14} color="var(--blue)" style={{ flexShrink: 0, marginLeft: "8px" }} />
          </a>
        ))}
      </div>
    </div>
  );
};

