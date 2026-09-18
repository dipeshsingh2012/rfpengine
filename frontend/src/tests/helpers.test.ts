import test from "node:test";
import assert from "node:assert/strict";
import {
  demoAnswerFor,
  parseCsvLine,
  extractFormQuestions,
  formatScore,
  responseIdFromPath,
  reviewIdFromPath,
  getStatusBadgeClass,
  getApiBaseUrl,
} from "../utils/helpers.js";

test("getApiBaseUrl returns production url", () => {
  assert.match(getApiBaseUrl(), /^https:\/\/rfpengine-api/);
});

test("demoAnswerFor handles encryption keywords", () => {
  const res = demoAnswerFor("How do you handle data encryption at rest?");
  assert.ok(res.suggested_answer.includes("AES-256"));
  assert.equal(res.confidence_score, 0.84);
});

test("demoAnswerFor handles compliance keywords", () => {
  const res = demoAnswerFor("What compliance certifications do you have?");
  assert.ok(res.suggested_answer.includes("SOC 2 Type II"));
});

test("demoAnswerFor handles implementation timeline", () => {
  const res = demoAnswerFor("What is the typical timeline for onboarding?");
  assert.ok(res.suggested_answer.includes("4 to 8 weeks"));
});

test("demoAnswerFor handles support queries", () => {
  const res = demoAnswerFor("What support tiers are available?");
  assert.ok(res.suggested_answer.includes("email support"));
});

test("parseCsvLine parses simple comma-separated fields", () => {
  const fields = parseCsvLine("Question,Section,Status");
  assert.deepEqual(fields, ["Question", "Section", "Status"]);
});

test("parseCsvLine handles quoted commas and escaped quotes", () => {
  const fields = parseCsvLine('"Do you support SSO, SAML, or OAuth?","Security ""Core""","Approved"');
  assert.equal(fields[0], "Do you support SSO, SAML, or OAuth?");
  assert.equal(fields[1], 'Security "Core"');
  assert.equal(fields[2], "Approved");
});

test("extractFormQuestions handles CSV with headers", () => {
  const csv = "Question,Category\nDo you encrypt backups?,Security\nWhat is your RTO?,DR";
  const questions = extractFormQuestions(csv, "security.csv");
  assert.deepEqual(questions, ["Do you encrypt backups?", "What is your RTO?"]);
});

test("extractFormQuestions handles TSV files", () => {
  const tsv = "Question\tCategory\nIs MFA enforced?\tAuth";
  const questions = extractFormQuestions(tsv, "auth.tsv");
  assert.deepEqual(questions, ["Is MFA enforced?"]);
});

test("formatScore formats percentages properly", () => {
  assert.equal(formatScore(0.954), "95%");
  assert.equal(formatScore(1), "100%");
});

test("responseIdFromPath extracts workspace IDs", () => {
  assert.equal(responseIdFromPath("/response/workspace/rfp-alpha-123"), "rfp-alpha-123");
  assert.equal(responseIdFromPath("/"), "");
});

test("reviewIdFromPath extracts import IDs", () => {
  assert.equal(reviewIdFromPath("/review/doc-456"), "doc-456");
  assert.equal(reviewIdFromPath("/responses"), "");
});

test("demoAnswerFor handles generic default fallback", () => {
  const res = demoAnswerFor("What is the meaning of life?");
  assert.ok(res.suggested_answer);
  assert.equal(res.confidence_score, 0.84);
});

test("extractFormQuestions handles empty text", () => {
  assert.deepEqual(extractFormQuestions("", "empty.csv"), []);
  assert.deepEqual(extractFormQuestions("some text", "unsupported.txt"), []);
});

test("getStatusBadgeClass maps statuses correctly", () => {
  assert.equal(getStatusBadgeClass("NOT GENERATED"), "status-draft");
  assert.equal(getStatusBadgeClass("SME review"), "status-review");
  assert.equal(getStatusBadgeClass("Legal review"), "status-legal");
  assert.equal(getStatusBadgeClass("Approved"), "status-approved");
  assert.equal(getStatusBadgeClass("Changes requested"), "status-changes");
  assert.equal(getStatusBadgeClass(undefined), "status-draft");
  assert.equal(getStatusBadgeClass("Unknown status"), "status-draft");
});
