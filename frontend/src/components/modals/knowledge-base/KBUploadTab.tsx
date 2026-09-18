import React from "react";
import { Upload, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { KBItem } from "../../../types";
import { KBSampleFilesGrid } from "./KBSampleFilesGrid";
import { KBRecordsList } from "./KBRecordsList";

interface KBUploadTabProps {
  isDragOver: boolean;
  setIsDragOver: (dragOver: boolean) => void;
  isUploading: boolean;
  onUpload: (file: File) => void;
  uploadMsg: { text: string; isError?: boolean } | null;
  entries: KBItem[];
  isFetching: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export const KBUploadTab: React.FC<KBUploadTabProps> = ({
  isDragOver,
  setIsDragOver,
  isUploading,
  onUpload,
  uploadMsg,
  entries,
  isFetching,
  onRefresh,
  onDelete,
}) => {
  return (
    <div className="kb-upload-tab">
      <div
        className={`kb-dropzone ${isDragOver ? "drag-over" : ""} ${isUploading ? "uploading" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files?.[0]) onUpload(e.dataTransfer.files[0]);
        }}
      >
        <Upload size={32} color="var(--blue)" />
        <div className="kb-dropzone-text">
          <strong>Upload Reference Documents</strong>
          <span>Drag and drop PDF, DOCX, XLSX, CSV, or TXT files to ground answers</span>
        </div>
        <label className="primary-button" style={{ cursor: "pointer", marginTop: "8px" }}>
          {isUploading ? <RefreshCw size={14} className="spin" /> : <Upload size={14} />}
          {isUploading ? "Processing & Indexing..." : "Choose File"}
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.[0]) onUpload(e.target.files[0]);
            }}
          />
        </label>
      </div>

      {uploadMsg && (
        <div className={`kb-notice-banner ${uploadMsg.isError ? "error" : "success"}`} style={{ margin: "14px 0" }}>
          {uploadMsg.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{uploadMsg.text}</span>
        </div>
      )}

      <KBSampleFilesGrid />
      <KBRecordsList entries={entries} isFetching={isFetching} onRefresh={onRefresh} onDelete={onDelete} />
    </div>
  );
};

