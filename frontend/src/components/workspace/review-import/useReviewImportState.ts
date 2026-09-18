import React, { useState, useMemo, useEffect } from "react";
import { ExtractedQuestionItem } from "../../../types";

interface UseReviewImportStateProps {
  detectedQuestions: string[];
  parsedQuestions?: ExtractedQuestionItem[];
  uploadedFile?: File | null;
  onUpdateQuestions?: (questions: ExtractedQuestionItem[]) => void;
  onRephraseQuestion?: (questionText: string) => Promise<string>;
  onReparseWithGuidance?: (guidance: string) => Promise<void>;
  onSubmitFeedback?: (payload: { rating: string | null; edits: any[]; deletions: any[]; additions: any[] }) => Promise<void>;
  openWorkspace: () => void;
  onConfirmImport?: (selectedQuestions: ExtractedQuestionItem[]) => void;
}

export function useReviewImportState({
  detectedQuestions,
  parsedQuestions,
  uploadedFile,
  onUpdateQuestions,
  onRephraseQuestion,
  onReparseWithGuidance,
  onSubmitFeedback,
  openWorkspace,
  onConfirmImport,
}: UseReviewImportStateProps) {
  const initialQuestions: ExtractedQuestionItem[] = useMemo(() => {
    if (parsedQuestions && parsedQuestions.length > 0) {
      return parsedQuestions.map((q, idx) => ({ ...q, id: q.id || `Q-${idx + 1}`, selected: q.selected !== false }));
    }
    return detectedQuestions.map((text, idx) => ({
      id: `Q-${idx + 1}`, question_text: text, original_text: text, section: "General", expected_type: "narrative", selected: true,
    }));
  }, [parsedQuestions, detectedQuestions]);

  const [questions, setQuestions] = useState<ExtractedQuestionItem[]>(initialQuestions);
  useEffect(() => { setQuestions(initialQuestions); }, [initialQuestions]);

  const [showDocViewer, setShowDocViewer] = useState(false);
  const [docViewMode, setDocViewMode] = useState<"split" | "drawer">("split");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ id: "", question_text: "", section: "General", expected_type: "narrative" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [rephraseModalData, setRephraseModalData] = useState<{ index: number; original: string; rephrased: string } | null>(null);
  const [isRephrasing, setIsRephrasing] = useState(false);
  const [showReparseModal, setShowReparseModal] = useState(false);
  const [reparseGuidance, setReparseGuidance] = useState("");
  const [isReparsing, setIsReparsing] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<"thumbs_up" | "thumbs_down" | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [deletionsQueue, setDeletionsQueue] = useState<any[]>([]);
  const [editsQueue, setEditsQueue] = useState<any[]>([]);
  const [additionsQueue, setAdditionsQueue] = useState<any[]>([]);

  const documentBlobUrl = useMemo(() => {
    if (!uploadedFile) return null;
    try { return URL.createObjectURL(uploadedFile); } catch { return null; }
  }, [uploadedFile]);

  useEffect(() => {
    return () => { if (documentBlobUrl) URL.revokeObjectURL(documentBlobUrl); };
  }, [documentBlobUrl]);

  return {
    questions, setQuestions, showDocViewer, setShowDocViewer, docViewMode, setDocViewMode,
    searchQuery, setSearchQuery, selectedSection, setSelectedSection, editingId, setEditingId,
    editForm, setEditForm, showAddForm, setShowAddForm, rephraseModalData, setRephraseModalData,
    isRephrasing, setIsRephrasing, showReparseModal, setShowReparseModal, reparseGuidance,
    setReparseGuidance, isReparsing, setIsReparsing, feedbackRating, setFeedbackRating,
    feedbackNotice, setFeedbackNotice, deletionsQueue, setDeletionsQueue, editsQueue, setEditsQueue,
    additionsQueue, setAdditionsQueue, documentBlobUrl,
  };
}

