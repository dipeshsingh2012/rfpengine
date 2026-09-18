import { useState } from "react";
import { SearchResponse, demoResponse } from "../types";
import { demoAnswerFor, getApiBaseUrl } from "../utils/helpers";

const apiBaseUrl = getApiBaseUrl();

export interface GenerateOptions {
  model?: string | null;
  tone?: string | null;
  topK?: number;
}

export function useAiAnswerGenerator() {
  const [topK, setTopK] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [response, setResponse] = useState<SearchResponse>(demoResponse);
  const [answer, setAnswer] = useState(demoResponse.suggested_answer);
  const [activeSource, setActiveSource] = useState(demoResponse.sources[0].id);

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
        onSaveAnswers({ ...currentAnswers, [targetQuestion]: data.suggested_answer });
        return;
      }
    } catch {
      // Fallback to local demo answers
    } finally {
      setIsGenerating(false);
    }
    const fallback = demoAnswerFor(targetQuestion);
    setResponse(fallback);
    setAnswer(fallback.suggested_answer);
    onSaveAnswers({ ...currentAnswers, [targetQuestion]: fallback.suggested_answer });
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
          generated[item] = res.ok ? (await res.json()).suggested_answer : demoAnswerFor(item).suggested_answer;
        } catch {
          generated[item] = demoAnswerFor(item).suggested_answer;
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
