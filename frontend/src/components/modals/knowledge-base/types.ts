import { KBItem, SearchResponse } from "../../../types";

export interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: "upload" | "connectors" | "playground";
  setTab: (tab: "upload" | "connectors" | "playground") => void;
  isDragOver: boolean;
  setIsDragOver: (dragOver: boolean) => void;
  isUploadingKB: boolean;
  handleKBUpload: (file: File) => void;
  kbUploadMsg: { text: string; isError?: boolean } | null;
  isFetchingKB: boolean;
  kbEntries: KBItem[];
  fetchKBEntries: () => void;
  handleDeleteKBEntry: (id: string) => void;
  playgroundTopK: number;
  setPlaygroundTopK: (k: number) => void;
  playgroundQuery: string;
  setPlaygroundQuery: (q: string) => void;
  playgroundLoading: boolean;
  handlePlaygroundSearch: (queryOverride?: string) => void;
  playgroundError: string | null;
  playgroundResult: SearchResponse | null;
  apiBaseUrl?: string;
  tenantId?: string;
  kbTotalRecords?: number;
  kbTotalSources?: number;
}

