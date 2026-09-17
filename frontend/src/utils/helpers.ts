import { SearchResponse, demoResponse } from "../types";

export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
  if (!envUrl || envUrl === "/api") {
    return "/api";
  }
  // If user provided a host without /api suffix (e.g. http://localhost:8000 or https://cloudrun.app)
  if (!envUrl.startsWith("/") && !envUrl.endsWith("/api")) {
    return `${envUrl}/api`;
  }
  return envUrl;
}

export function demoAnswerFor(question: string): SearchResponse {
  const normalized = question.toLowerCase();
  const answer = normalized.includes("encrypt")
    ? "Customer data is encrypted in transit using TLS 1.2 or higher and at rest using AES-256. Encryption keys are managed through a restricted key-management service."
    : normalized.includes("certif") || normalized.includes("compliance")
      ? "Our security program is aligned with industry best practices, and we maintain current SOC 2 Type II and ISO 27001 certifications. Current reports are available under NDA."
      : normalized.includes("implement") || normalized.includes("timeline")
        ? "A standard implementation typically takes 4 to 8 weeks, depending on integrations, data preparation, and stakeholder availability. A dedicated implementation manager coordinates the rollout."
        : normalized.includes("support")
          ? "The platform includes email support, a searchable help center, and an assigned customer success contact. Premium plans add priority response times and dedicated support."
          : demoResponse.suggested_answer;
  return { ...demoResponse, suggested_answer: answer, confidence_score: 0.84 };
}

export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim().replace(/^"|"$/g, ""));
  return fields;
}

export function extractFormQuestions(text: string, fileName: string): string[] {
  if (fileName.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      const records = Array.isArray(parsed) ? parsed : parsed.questions || parsed.records || parsed.items || [];
      return records
        .map(
          (record: { question?: string; text?: string; title?: string; prompt?: string }) =>
            record.question || record.title || record.text || record.prompt || "",
        )
        .map((q: any) => String(q).trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
  if (fileName.endsWith(".csv") || fileName.endsWith(".tsv")) {
    const isTsv = fileName.endsWith(".tsv");
    const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return [];

    const parseLine = (line: string) => {
      if (isTsv) {
        return line.split("\t").map((f) => f.trim().replace(/^"|"$/g, ""));
      }
      return parseCsvLine(line);
    };

    const firstLineFields = parseLine(rawLines[0]);
    const headerLower = firstLineFields.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

    const questionSynonyms = ["question", "q", "title", "topic", "prompt", "inquiry", "requirement", "item"];
    let colIdx = headerLower.findIndex((h) => questionSynonyms.includes(h));

    const hasHeaderRow =
      colIdx !== -1 ||
      headerLower.some((h) => ["answer", "a", "category", "section", "response", "details", "tags"].includes(h));

    if (colIdx === -1) {
      colIdx = 0;
    }

    const dataLines = hasHeaderRow ? rawLines.slice(1) : rawLines;
    return dataLines
      .map((line) => {
        const fields = parseLine(line);
        const val = fields[colIdx] || fields[0] || "";
        return val.replace(/^"|"$/g, "").trim();
      })
      .filter(Boolean);
  }
  const document = new DOMParser().parseFromString(text, "text/html");
  return [
    ...document.querySelectorAll(
      'textarea, input:not([type="hidden"]), [contenteditable="true"]',
    ),
  ]
    .map(
      (field) =>
        document
          .querySelector(`label[for="${CSS.escape(field.id)}"]`)
          ?.textContent?.trim() ||
        field.getAttribute("aria-label") ||
        field.getAttribute("placeholder") ||
        "",
    )
    .filter((q) => q.length > 5);
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function responseIdFromPath(path: string): string {
  return path.match(/^\/response\/workspace\/([^/]+)$/)?.[1] || "";
}

export function reviewIdFromPath(path: string): string {
  return path.match(/^\/review\/([^/]+)$/)?.[1] || "";
}

export function getStatusBadgeClass(status?: string): string {
  if (!status || status === "NOT GENERATED" || status === "DRAFT READY") return "status-draft";
  if (status.includes("SME review") || status.includes("Ready")) return "status-review";
  if (status.includes("Legal review")) return "status-legal";
  if (status.includes("Approved") || status.includes("Final")) return "status-approved";
  if (status.includes("Changes")) return "status-changes";
  return "status-draft";
}

