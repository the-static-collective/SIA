import { validateThread } from "./engine.ts";
import { acceptStored } from "./intake.ts";

export const BUNDLE_SCHEMA = "fossil-orrery/vault/v0";

export type Bundle = {
  schema: typeof BUNDLE_SCHEMA;
  note: string;
  objects: unknown[];
  raw: { sha256: string; filename: string; text: string }[];
  hypotheses: Record<string, unknown>[];
  annotations: Record<string, unknown>[];
  threads: unknown[];
  candidates: unknown[];
  reviews: unknown[];
};

export function exportBundle(state: {
  objects: Record<string, unknown>;
  raw: Record<string, { sha256: string; filename: string; text: string }>;
  hypotheses: Record<string, unknown>[];
  annotations: Record<string, unknown>[];
  threads: unknown[];
  candidates: unknown[];
  reviews: unknown[];
}): Bundle {
  return {
    schema: BUNDLE_SCHEMA,
    note: "Objects are content-addressed. Hypotheses and annotations are not observations and are not ancestry. Raw snapshots are the operator-supplied bytes.",
    objects: Object.values(state.objects),
    raw: Object.values(state.raw),
    hypotheses: state.hypotheses,
    annotations: state.annotations,
    threads: state.threads,
    candidates: state.candidates,
    reviews: state.reviews,
  };
}

export function readBundle(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Vault bundle must be an object");
  const bundle = input as Bundle;
  if (bundle.schema !== BUNDLE_SCHEMA) throw new Error("Not a Fossil Orrery vault bundle");
  const objects: any[] = [];
  const rejected: string[] = [];
  for (const item of bundle.objects ?? []) {
    try {
      objects.push(acceptStored(item));
    } catch (error) {
      rejected.push(error instanceof Error ? error.message : "object refused");
    }
  }
  const hypotheses = (bundle.hypotheses ?? []).filter(isHypothesis);
  const droppedHypotheses = (bundle.hypotheses ?? []).length - hypotheses.length;
  const annotations = (bundle.annotations ?? []).filter(
    (item) => item.schema === "fossil-orrery/annotation/v0" && item.status === "interpretation-not-fact",
  );
  const threads: any[] = [];
  for (const thread of bundle.threads ?? []) {
    try {
      threads.push(validateThread(thread));
    } catch (error) {
      rejected.push(error instanceof Error ? error.message : "thread refused");
    }
  }
  if (droppedHypotheses) rejected.push(`${droppedHypotheses} hypothesis records refused — they were not promoted to relations`);
  return {
    objects,
    raw: (bundle.raw ?? []).filter((item) => item && typeof item.text === "string" && typeof item.sha256 === "string"),
    hypotheses,
    annotations,
    threads,
    candidates: bundle.candidates ?? [],
    reviews: bundle.reviews ?? [],
    rejected,
  };
}

function isHypothesis(item: Record<string, unknown>) {
  return (
    item?.schema === "fossil-orrery/hypothesis/v0" &&
    item.status === "HYPOTHESIS" &&
    item.basis === "token-overlap-not-source-claim" &&
    typeof item.fromId === "string" &&
    typeof item.toId === "string"
  );
}
