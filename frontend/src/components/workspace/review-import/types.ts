import React from "react";
import { ExtractedQuestionItem } from "../../../types";

export interface ReviewImportPageProps {
  onNavigateHome: () => void;
  onNavigateResponses?: () => void;
  formUrl: string;
  setFormUrl: (url: string) => void;
  loadFormUrl: () => Promise<string | void>;
  loadFormFile: (event: React.ChangeEvent<HTMLInputElement>) => Promise<string | void>;
  sourceStatus: string;
  detectedQuestions: string[];
  parsedQuestions?: ExtractedQuestionItem[];
  uploadedFile?: File | null;
  uploadedFileContent?: string;
  onUpdateQuestions?: (questions: ExtractedQuestionItem[]) => void;
  onRephraseQuestion?: (questionText: string) => Promise<string>;
  onReparseWithGuidance?: (guidance: string) => Promise<void>;
  onSubmitFeedback?: (payload: { rating: string | null; edits: any[]; deletions: any[]; additions: any[] }) => Promise<void>;
  openWorkspace: () => void;
  onConfirmImport?: (selectedQuestions: ExtractedQuestionItem[]) => void;
}

