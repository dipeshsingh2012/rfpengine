import test from "node:test";
import assert from "node:assert/strict";
import { mapParsedQuestions } from "../utils/parserHelpers.js";

test("mapParsedQuestions maps raw API questions to structured items", () => {
  const raw = [
    { question_text: "Do you encrypt data?", section: "Security" },
    { id: "CUSTOM-2", question_text: "Support SAML?", expected_type: "boolean", options: ["Yes", "No"] },
  ];
  const items = mapParsedQuestions(raw);
  assert.equal(items.length, 2);
  assert.equal(items[0].id, "Q-1");
  assert.equal(items[0].question_text, "Do you encrypt data?");
  assert.equal(items[0].selected, true);
  assert.equal(items[1].id, "CUSTOM-2");
  assert.equal(items[1].expected_type, "boolean");
  assert.deepEqual(items[1].options, ["Yes", "No"]);
});

test("mapParsedQuestions handles empty or null lists safely", () => {
  assert.deepEqual(mapParsedQuestions([]), []);
  assert.deepEqual(mapParsedQuestions(null as any), []);
});
