import { ExtractedQuestionItem } from "../types";

export function mapParsedQuestions(rawList: any[]): ExtractedQuestionItem[] {
  return (rawList || []).map((q: any, idx: number) => ({
    id: q.id || `Q-${idx + 1}`,
    question_text: q.question_text,
    original_text: q.question_text,
    section: q.section || "General",
    expected_type: q.expected_type || q.answer_type || "narrative",
    options: q.options || [],
    selected: true,
  }));
}
