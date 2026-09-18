import React from "react";
import { FileText, Split, Maximize2, ExternalLink, Download, X } from "lucide-react";

interface DocReferencePanelProps {
  uploadedFile?: File | null;
  uploadedFileContent?: string;
  docViewMode: "split" | "drawer";
  setDocViewMode: (mode: "split" | "drawer") => void;
  documentBlobUrl: string | null;
  onClose: () => void;
}

export const DocReferencePanel: React.FC<DocReferencePanelProps> = ({
  uploadedFile,
  uploadedFileContent,
  docViewMode,
  setDocViewMode,
  documentBlobUrl,
  onClose,
}) => {
  return (
    <aside className={`doc-reference-panel ${docViewMode === "drawer" ? "drawer-mode" : ""}`}>
      <div className="doc-reference-header">
        <div className="doc-reference-title">
          <FileText size={16} />
          <span>{uploadedFile?.name || "Original Document"}</span>
          {uploadedFile?.size && (
            <span className="doc-size-badge">{(uploadedFile.size / 1024).toFixed(0)} KB</span>
          )}
        </div>
        <div className="doc-reference-controls">
          <button
            className={`icon-tool-btn ${docViewMode === "split" ? "active" : ""}`}
            onClick={() => setDocViewMode("split")}
            title="Side-by-Side Split View"
          >
            <Split size={14} />
          </button>
          <button
            className={`icon-tool-btn ${docViewMode === "drawer" ? "active" : ""}`}
            onClick={() => setDocViewMode("drawer")}
            title="Slide-over Drawer View"
          >
            <Maximize2 size={14} />
          </button>
          {documentBlobUrl && (
            <>
              <a href={documentBlobUrl} target="_blank" rel="noreferrer" className="icon-tool-btn" title="Open Original in New Tab">
                <ExternalLink size={14} />
              </a>
              <a href={documentBlobUrl} download={uploadedFile?.name || "document"} className="icon-tool-btn" title="Download Original File">
                <Download size={14} />
              </a>
            </>
          )}
          <button className="icon-tool-btn close-doc-btn" onClick={onClose} title="Close Document Viewer">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="doc-reference-body">
        {uploadedFile?.name.toLowerCase().endsWith(".pdf") && documentBlobUrl ? (
          <iframe src={documentBlobUrl} title="RFP Document Preview" className="doc-preview-frame" />
        ) : (
          <div className="doc-text-fallback">
            <pre>{uploadedFileContent || "Document preview available in external viewer."}</pre>
          </div>
        )}
      </div>
    </aside>
  );
};

