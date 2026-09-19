import { useState } from "react";
import { SearchResponse } from "../types";
import { getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

const emptyResponse: SearchResponse = {
  suggested_answer: "",
  confidence_score: 0,
  sources: [],
};

export interface GenerateOptions {
  model?: string | null;
  tone?: string | null;
  topK?: number;
}

export function useAiAnswerGenerator() {
  const [topK, setTopK] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<SearchResponse>(emptyResponse);
  const [answer, setAnswer] = useState("");
  const [activeSource, setActiveSource] = useState("");

  async function generateAnswer(
    targetQuestion: string,
    tenantId: string,
    currentAnswers: Record<string, string>,
    onSaveAnswers: (next: Record<string, string>) => void,
    options?: GenerateOptions
  ) {
    if (!targetQuestion.trim()) return;
    setIsGenerating(true);
    const resolvedTopK = options?.topK || topK;
    try {
      const payload: Record<string, any> = {
        tenant_id: tenantId,
        question: targetQuestion,
        top_k: resolvedTopK,
      };
      if (options?.model) payload.model = options.model;
      if (options?.tone) payload.tone = options.tone;

      const res = await fetch(`${apiBaseUrl}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = (await res.json()) as SearchResponse;
        setResponse(data);
        setAnswer(data.suggested_answer);
        if (data.sources?.length) setActiveSource(data.sources[0].id);
        onSaveAnswers({ ...currentAnswers, [targetQuestion]: data.suggested_answer });
        return;
      }
      setResponse(emptyResponse);
      setAnswer("Failed to generate answer. Please verify backend connection.");
    } catch {
      setResponse(emptyResponse);
      setAnswer("Network error: unable to reach AI generation service.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateAllAnswers(
    detectedQuestions: string[],
    currentQuestion: string,
    tenantId: string,
    currentAnswers: Record<string, string>,
    onSaveAnswers: (next: Record<string, string>) => void,
    onShowToast: (msg: string) => void,
    options?: GenerateOptions
  ) {
    if (!detectedQuestions.length || isGenerating) return;
    setIsGenerating(true);
    onShowToast("Generating AI answers for all questions...");
    const resolvedTopK = options?.topK || topK;
    const generated = { ...currentAnswers };
    await Promise.all(
      detectedQuestions.map(async (item) => {
        try {
          const payload: Record<string, any> = {
            tenant_id: tenantId,
            question: item,
            top_k: resolvedTopK,
          };
          if (options?.model) payload.model = options.model;
          if (options?.tone) payload.tone = options.tone;

          const res = await fetch(`${apiBaseUrl}/api/v1/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
            body: JSON.stringify(payload),
          });
          generated[item] = res.ok
            ? (await res.json()).suggested_answer
            : "Failed to generate answer.";
        } catch {
          generated[item] = "Failed to generate answer.";
        }
      })
    );
    onSaveAnswers(generated);
    setAnswer(generated[currentQuestion] || generated[detectedQuestions[0]] || "");
    onShowToast(`Generated answers for all ${detectedQuestions.length} questions!`);
    setIsGenerating(false);
  }

  return {
    topK,
    setTopK,
    isGenerating,
    response,
    setResponse,
    answer,
    setAnswer,
    activeSource,
    setActiveSource,
    generateAnswer,
    generateAllAnswers,
  };
}
