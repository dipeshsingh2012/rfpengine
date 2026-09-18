import { ExtractedQuestionItem } from "../../../types";
import { ReviewImportPageProps } from "./types";

interface QuestionOpsParams {
  props: ReviewImportPageProps;
  s: any;
  filteredQuestions: ExtractedQuestionItem[];
  isAllFilteredSelected: boolean;
}

export function useQuestionOperations({ props, s, filteredQuestions, isAllFilteredSelected }: QuestionOpsParams) {
  const toggleSelectAllFiltered = () => {
    const nextVal = !isAllFilteredSelected;
    const filteredIds = new Set(filteredQuestions.map((q) => q.id));
    const next = s.questions.map((q: ExtractedQuestionItem) => filteredIds.has(q.id) ? { ...q, selected: nextVal } : q);
    s.setQuestions(next);
    if (props.onUpdateQuestions) props.onUpdateQuestions(next);
  };

  const toggleQuestionSelection = (id: string) => {
    const next = s.questions.map((q: ExtractedQuestionItem) => q.id === id ? { ...q, selected: !q.selected } : q);
    s.setQuestions(next);
    if (props.onUpdateQuestions) props.onUpdateQuestions(next);
  };

  const handleDeleteQuestion = (id: string) => {
    const target = s.questions.find((q: ExtractedQuestionItem) => q.id === id);
    if (!target) return;
    s.setDeletionsQueue((prev: any[]) => [...prev, { id: target.id, rejected_text: target.question_text, section: target.section, reason: "user_deleted_review" }]);
    const next = s.questions.filter((q: ExtractedQuestionItem) => q.id !== id);
    s.setQuestions(next);
    if (props.onUpdateQuestions) props.onUpdateQuestions(next);
  };

  const startEditing = (q: ExtractedQuestionItem) => {
    s.setEditingId(q.id);
    s.setEditForm({ id: q.id, question_text: q.question_text, section: q.section || "General", expected_type: q.expected_type || "narrative" });
  };

  const saveEdit = (id: string) => {
    const orig = s.questions.find((q: ExtractedQuestionItem) => q.id === id);
    if (orig && orig.question_text !== s.editForm.question_text) {
      s.setEditsQueue((prev: any[]) => [...prev, { id, original_text: orig.question_text, corrected_text: s.editForm.question_text, section: s.editForm.section }]);
    }
    const next = s.questions.map((q: ExtractedQuestionItem) => q.id === id ? { ...q, id: s.editForm.id.trim() || q.id, question_text: s.editForm.question_text.trim(), section: s.editForm.section.trim() || "General", expected_type: s.editForm.expected_type, is_edited: true } : q);
    s.setQuestions(next);
    s.setEditingId(null);
    if (props.onUpdateQuestions) props.onUpdateQuestions(next);
  };

  const handleAddQuestion = (text: string, section: string, type: string) => {
    const newItem: ExtractedQuestionItem = { id: `Q-${s.questions.length + 1}`, question_text: text, section, expected_type: type, selected: true, is_user_added: true };
    s.setAdditionsQueue((prev: any[]) => [...prev, { question_text: text, section, expected_type: type }]);
    const next = [newItem, ...s.questions];
    s.setQuestions(next);
    s.setShowAddForm(false);
    if (props.onUpdateQuestions) props.onUpdateQuestions(next);
  };

  const handleTriggerRephrase = async (q: ExtractedQuestionItem, index: number) => {
    if (!props.onRephraseQuestion) return;
    s.setIsRephrasing(true);
    try {
      const suggested = await props.onRephraseQuestion(q.question_text);
      s.setRephraseModalData({ index, original: q.question_text, rephrased: suggested });
    } catch { alert("AI rephrasing failed. Please verify API configuration."); } finally { s.setIsRephrasing(false); }
  };

  const applyRephrase = () => {
    if (!s.rephraseModalData) return;
    const { index, original, rephrased } = s.rephraseModalData;
    const target = s.questions[index];
    if (!target) return;
    s.setEditsQueue((prev: any[]) => [...prev, { id: target.id, original_text: original, corrected_text: rephrased, section: target.section }]);
    const next = [...s.questions];
    next[index] = { ...next[index], question_text: rephrased, is_rephrased: true };
    s.setQuestions(next);
    s.setRephraseModalData(null);
    if (props.onUpdateQuestions) props.onUpdateQuestions(next);
  };

  const handleExecuteReparse = async () => {
    if (!props.onReparseWithGuidance) return;
    s.setIsReparsing(true);
    try {
      await props.onReparseWithGuidance(s.reparseGuidance);
      s.setShowReparseModal(false);
      s.setFeedbackNotice("Document successfully re-parsed with Gemini 2.5 Flash!");
      setTimeout(() => s.setFeedbackNotice(""), 4000);
    } catch { alert("Re-parsing failed. Ensure document is valid."); } finally { s.setIsReparsing(false); }
  };

  const handleRateAccuracy = (rating: "thumbs_up" | "thumbs_down") => {
    s.setFeedbackRating(rating);
    s.setFeedbackNotice(rating === "thumbs_up" ? "Thanks! Feedback recorded: High accuracy extraction." : "Feedback noted: AI model tuning flagged for this document format.");
    setTimeout(() => s.setFeedbackNotice(""), 3500);
  };

  const handleContinue = () => {
    const selected = s.questions.filter((q: ExtractedQuestionItem) => q.selected);
    if (selected.length === 0) return;
    if (props.onSubmitFeedback) props.onSubmitFeedback({ rating: s.feedbackRating, edits: s.editsQueue, deletions: s.deletionsQueue, additions: s.additionsQueue });
    if (props.onConfirmImport) props.onConfirmImport(selected); else props.openWorkspace();
  };

  return { toggleSelectAllFiltered, toggleQuestionSelection, handleDeleteQuestion, startEditing, saveEdit, handleAddQuestion, handleTriggerRephrase, applyRephrase, handleExecuteReparse, handleRateAccuracy, handleContinue };
}

