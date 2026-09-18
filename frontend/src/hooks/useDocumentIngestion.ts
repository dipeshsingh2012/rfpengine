import React, { useState } from "react";
import { ExtractedQuestionItem, SourceMode } from "../types";
import { extractFormQuestions, getApiBaseUrl } from "../utils/helpers";
import { mapParsedQuestions } from "../utils/parserHelpers";

const apiBaseUrl = getApiBaseUrl();

export function useDocumentIngestion(
  tenantId: string,
  onQuestionsLoaded: (questions: string[], sourceName: string, mode: SourceMode) => Promise<string>
) {
  const [formUrl, setFormUrl] = useState("");
  const [sourceStatus, setSourceStatus] = useState("No external form loaded");
  const [parsedQuestions, setParsedQuestions] = useState<ExtractedQuestionItem[]>([]);
  const [uploadedFormFile, setUploadedFormFile] = useState<File | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState("");
  const [isParsingDocument, setIsParsingDocument] = useState(false);
  const [parsingProgress, setParsingProgress] = useState("");

  async function loadFormUrl() {
    try {
      const url = new URL(formUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an http or https URL.");
      setSourceStatus("Fetching form...");
      const res = await fetch(url.href);
      if (!res.ok) throw new Error(`Could not fetch form (${res.status})`);
      const extracted = extractFormQuestions(await res.text(), url.pathname.toLowerCase());
      return onQuestionsLoaded(extracted, url.hostname, "url");
    } catch (err: any) {
      setSourceStatus(err instanceof TypeError ? "CORS error. Use file upload." : err.message);
    }
  }

  async function loadFormFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".tsv");
    setIsParsingDocument(true);
    setParsingProgress(`Analyzing ${file.name}...`);
    setUploadedFormFile(file);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/parse-file`, {
        method: "POST",
        headers: { "X-Tenant-ID": tenantId },
        body: formData,
      });
      if (res.ok) {
        const raw = mapParsedQuestions((await res.json()).questions);
        setParsedQuestions(raw);
        if (isCsv) setUploadedFileContent(await file.text());
        return onQuestionsLoaded(raw.map((q) => q.question_text), file.name, "upload");
      }
      if (isCsv) {
        const text = await file.text();
        setUploadedFileContent(text);
        return onQuestionsLoaded(extractFormQuestions(text, file.name.toLowerCase()), file.name, "upload");
      }
    } catch (err: any) {
      setSourceStatus(`Could not read file: ${err.message}`);
    } finally {
      setIsParsingDocument(false);
      setParsingProgress("");
    }
  }

  async function handleRephraseQuestion(text: string): Promise<string> {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/responses/rephrase-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
        body: JSON.stringify({ question_text: text, style: "clear_compliance" }),
      });
      return res.ok ? ((await res.json()).rephrased_text || text) : text;
    } catch { return text; }
  }

  async function handleReparseWithGuidance(guidance: string, onUpdate: (qs: string[]) => void): Promise<void> {
    if (!uploadedFormFile) return;
    const form = new FormData();
    form.append("file", uploadedFormFile);
    if (guidance.trim()) form.append("guidance", guidance.trim());
    const res = await fetch(`${apiBaseUrl}/api/v1/responses/parse-file`, { method: "POST", headers: { "X-Tenant-ID": tenantId }, body: form });
    if (!res.ok) throw new Error("Reparse failed");
    const raw = mapParsedQuestions((await res.json()).questions);
    setParsedQuestions(raw);
    onUpdate(raw.map((q) => q.question_text));
  }

  async function handleSubmitParserFeedback(payload: any) {
    fetch(`${apiBaseUrl}/api/v1/responses/parser-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantId },
      body: JSON.stringify({ filename: uploadedFormFile?.name || "doc.pdf", format: uploadedFormFile?.name?.split(".").pop() || "pdf", ...payload, total_ai_detected: parsedQuestions.length, total_curated: parsedQuestions.filter((q) => q.selected).length }),
    }).catch(() => {});
  }

  return { formUrl, setFormUrl, sourceStatus, setSourceStatus, parsedQuestions, setParsedQuestions, uploadedFormFile, uploadedFileContent, isParsingDocument, parsingProgress, loadFormUrl, loadFormFile, handleRephraseQuestion, handleReparseWithGuidance, handleSubmitParserFeedback };
}
