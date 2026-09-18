import { SearchResponse, demoResponse } from "../types";

// Fixed production API backend host (globally resolvable on public internet)
export const API_BASE = "https://rfpengine-api-fwwnzie4dq-uc.a.run.app";

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
  return [];
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

export function getApiBaseUrl(): string {
  return API_BASE;
}