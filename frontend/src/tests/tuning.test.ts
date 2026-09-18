import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_WORKSPACE_SETTINGS, TuningDatasetPreview, TuningJobItem } from "../types.js";

test("DEFAULT_WORKSPACE_SETTINGS includes active_tuned_model_id default", () => {
  assert.equal(DEFAULT_WORKSPACE_SETTINGS.active_tuned_model_id, null);
  assert.equal(DEFAULT_WORKSPACE_SETTINGS.default_model, "gemini-2.5-flash");
});

test("TuningDatasetPreview structure validates training pairs accurately", () => {
  const preview: TuningDatasetPreview = {
    total_pairs: 24,
    golden_qa_count: 14,
    approved_reviews_count: 10,
    sample_pairs: [
      {
        messages: [
          { role: "system", content: "You are the enterprise AI Proposal Drafter..." },
          { role: "user", content: "What encryption standard is used?" },
          { role: "model", content: "AES-256 is used for data at rest." },
        ],
      },
    ],
  };

  assert.equal(preview.total_pairs, 24);
  assert.equal(preview.golden_qa_count + preview.approved_reviews_count, preview.total_pairs);
  assert.equal(preview.sample_pairs[0].messages.length, 3);
  assert.equal(preview.sample_pairs[0].messages[0].role, "system");
  assert.equal(preview.sample_pairs[0].messages[1].role, "user");
  assert.equal(preview.sample_pairs[0].messages[2].role, "model");
});

test("TuningJobItem handles job statuses and metric computation", () => {
  const job: TuningJobItem = {
    id: "tune-abc123",
    tenant_id: "acme-corp",
    job_name: "projects/123/locations/us-central1/tuningJobs/tune-abc123",
    base_model: "gemini-1.5-flash-002",
    tuned_model_name: "projects/123/locations/us-central1/models/tuned-abc123",
    status: "SUCCEEDED",
    training_dataset_uri: "gs://rfp-engine-tuning/datasets/acme-corp/tune-abc123.jsonl",
    dataset_examples_count: 24,
    epochs: 4,
    learning_rate_multiplier: 1.0,
    metrics: {
      train_loss: 0.28,
      eval_loss: 0.31,
      step: 96,
    },
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  assert.equal(job.status, "SUCCEEDED");
  assert.equal(job.metrics.eval_loss, 0.31);
  assert.ok(job.tuned_model_name?.includes("tuned-abc123"));
});

