import test from "node:test";
import assert from "node:assert/strict";
import {
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

test("responseIdFromPath handles trailing slashes and nested routes", () => {
  assert.equal(responseIdFromPath("/response/workspace/ws-test-999"), "ws-test-999");
  assert.equal(responseIdFromPath("/response/workspace/"), "");
  assert.equal(responseIdFromPath("/response/other"), "");
});

test("reviewIdFromPath handles various route formats", () => {
  assert.equal(reviewIdFromPath("/review/doc-upload-123"), "doc-upload-123");
  assert.equal(reviewIdFromPath("/review/"), "");
  assert.equal(reviewIdFromPath("/import"), "");
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

test("formatScore handles zero and small decimals", () => {
  assert.equal(formatScore(0), "0%");
  assert.equal(formatScore(0.004), "0%");
  assert.equal(formatScore(0.499), "50%");
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
