import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createHash as shimHash } from "../src/shims/node-crypto.mjs";
import { sha256Hex } from "../src/lib/orrery/sha256.mjs";
import { observation as observe, verifyObservation } from "../vendor/sia/src/observation.mjs";
import { compose as siaCompose } from "../vendor/sia/src/metabolizer.mjs";
import { evaluate as siaEvaluate, holdReceipt as siaHold } from "../vendor/sia/src/proposal.mjs";
import { harvest as siaHarvest } from "../vendor/sia/src/derived.mjs";
import { composeRelationship } from "../vendor/story-dna/src/relationship-passenger.mjs";
import { readFileSync } from "node:fs";
import { syntheticBodies, observedRecords, exampleProposal, UNFAMILIAR_CSV, PORCH_IDS } from "../src/lib/orrery/sample.ts";
import { chronology, documentedEdges, evidenceClass, makeHypothesis, project } from "../src/lib/orrery/model.ts";
import { hashText, mapRows, sniff, suggestRoles, unresolvedReport } from "../src/lib/orrery/intake.ts";
import { exportBundle, readBundle } from "../src/lib/orrery/bundle.ts";
import { acceptDraft, reviewDraft, structuralDraft } from "../src/lib/orrery/draft.ts";
import { clownNote, layoutSky } from "../src/lib/orrery/layout.ts";

const hash = (text) => createHash("sha256").update(text).digest("hex");

test("browser sha256 matches node crypto, including embedded NUL", () => {
  for (const sample of ["", "abc", "sia/observation/v0\0{}", "rosemary — porch"]) {
    assert.equal(sha256Hex(sample), hash(sample));
    assert.equal(shimHash("sha256").update(sample, "utf8").digest("hex"), hash(sample));
  }
  const bytes = Uint8Array.from([0, 255, 10, 13]);
  assert.equal(sha256Hex(bytes), createHash("sha256").update(bytes).digest("hex"));
});

test("sample trench seals, keeps synthetic dates unresolved, and does not invent ancestry", () => {
  const sealed = syntheticBodies().map((body) => observe(body));
  assert.equal(sealed.length, 37);
  const undated = sealed.filter((item) => item.artifact.kind === "song" && chronology(item).kind === "unresolved");
  assert.equal(undated.length, 4);
  assert.equal(undated.every((item) => !item.facts.some((fact) => fact.key === "source_created_at")), true);
  assert.equal(sealed.every((item) => evidenceClass(item) === "synthetic-fixture"), true);
  assert.equal(sealed.every((item) => item.capture.observedAt === "2026-10-21T15:00:00Z"), true);
  const revised = sealed.find((item) => item.relations.some((rel) => rel.type === "version-of"));
  assert.ok(revised);
  assert.equal(revised.relations[0].basis, "owner-note");
  const again = observe(syntheticBodies()[3]);
  assert.equal(again.id, sealed[3].id);
});

test("capture time and publish time are not treated as creation", () => {
  const [rosemary] = observedRecords.filter((item) => item.artifact.externalId === PORCH_IDS.rosemary).map((item) => observe(item));
  assert.equal(chronology(rosemary).kind, "unresolved");
  assert.notEqual(chronology(rosemary).label, rosemary.capture.observedAt);
  const published = observe({
    schema: "sia/observation/v0",
    artifact: {
      externalId: "synthetic:published-only",
      kind: "song",
      title: "Published Only",
      url: "https://example.com/fossil-orrery/synthetic/published-only",
      creator: "fixture",
    },
    capture: {
      sourceUrl: "https://example.com/fossil-orrery/synthetic/published-only",
      evidenceUrl: "https://example.com/fossil-orrery/synthetic/published-only",
      observedAt: "2026-10-21T15:00:00Z",
      method: "owner-export",
      rights: "links-only",
      notes: "SYNTHETIC",
    },
    facts: [{ key: "source_published_at", value: "2020-01-01", basis: "owner-export" }],
    relations: [],
    interpretations: [{ text: "A reading does not become a fact.", by: "human" }],
  });
  assert.equal(chronology(published).kind, "unresolved");
  assert.equal(published.facts.some((fact) => fact.key === "source_created_at"), false);
  assert.equal(published.interpretations[0].by, "human");
});

test("unfamiliar CSV mapping refuses missing URLs and does not create relations", () => {
  const found = sniff(UNFAMILIAR_CSV);
  assert.equal(found.kind, "table");
  const roles = suggestRoles(Object.keys(found.rows[0]));
  assert.equal(roles.when_made, "createdAt");
  assert.equal(roles.private_note, "notes");
  assert.equal(suggestRoles(["published_at", "release_date", "title"]).published_at, "ignore");
  const open = unresolvedReport(Object.keys(found.rows[0]), { ...roles, when_made: "ignore" });
  assert.match(open.missing.join(" "), /createdAt/);
  assert.match(open.relations, /never creates ancestry/);
  const mapped = mapRows(found.rows, roles, {
    observedAt: "2026-10-21T16:04:00Z",
    rights: "links-only",
    kind: "song",
  });
  assert.equal(mapped.accepted.length, 3);
  assert.equal(mapped.accepted.every((item) => item.relations.length === 0), true);
  assert.equal(mapped.accepted[1].facts.some((fact) => fact.key === "source_created_at"), false);
  assert.equal(mapped.accepted[0].facts.find((fact) => fact.key === "source_created_at").value, "2024-04-02");
  assert.equal(mapped.accepted[0].capture.method, "owner-export");
  const bad = mapRows([{ song_name: "No Locator", page: "" }], roles, {
    observedAt: "2026-10-21T16:04:00Z",
    rights: "links-only",
    kind: "song",
  });
  assert.match(bad.rejected[0].reason, /not fabricated/);
});

test("vault export round-trips identity and does not promote hypotheses", () => {
  const objects = {};
  for (const body of observedRecords.slice(0, 2)) {
    const sealed = observe(body);
    objects[sealed.id] = sealed;
  }
  const [a, b] = Object.values(objects);
  const hypothesis = makeHypothesis(a.id, b.id, ["porch"]);
  const before = a.relations.map((rel) => ({ ...rel }));
  const bundle = exportBundle({
    objects,
    raw: { abc: { sha256: hashText('{"keep":true}'), filename: "raw.json", text: '{"keep":true}' } },
    hypotheses: [hypothesis, { schema: "fossil-orrery/hypothesis/v0", status: "FACT", basis: "guess" }],
    annotations: [],
    threads: [],
    candidates: [],
    reviews: [],
  });
  const read = readBundle(JSON.parse(JSON.stringify(bundle)));
  assert.equal(read.objects.length, 2);
  assert.deepEqual(read.objects.map((item) => item.id).sort(), Object.keys(objects).sort());
  assert.equal(read.hypotheses.length, 1);
  assert.equal(read.raw.length, 1);
  assert.equal(read.raw[0].sha256, hashText(read.raw[0].text));
  assert.equal(read.hypotheses[0].status, "HYPOTHESIS");
  assert.equal(read.rejected.length, 1);
  const restored = read.objects.find((item) => item.id === a.id);
  assert.deepEqual(restored.relations, before);
  assert.equal(JSON.stringify(restored).includes("token-overlap"), false);
  const again = readBundle(exportBundle({
    objects: Object.fromEntries(read.objects.map((item) => [item.id, item])),
    raw: Object.fromEntries(read.raw.map((item) => [item.sha256, item])),
    hypotheses: read.hypotheses,
    annotations: [],
    threads: [],
    candidates: [],
    reviews: [],
  }));
  assert.deepEqual(again.objects.map((item) => item.id).sort(), read.objects.map((item) => item.id).sort());
});

test("porch pair composes to the bundled illustrative proposal and stays HOLD until accepted", () => {
  const pair = observedRecords
    .filter((item) => [PORCH_IDS.rosemary, PORCH_IDS.porch].includes(item.artifact.externalId))
    .map((item) => observe(item));
  const recipe = siaCompose(pair, { mode: "visual", seed: 325 });
  assert.equal(recipe.id, exampleProposal.recipeId);
  const reviewed = reviewDraft(recipe, exampleProposal);
  assert.equal(reviewed.receipt.disposition, "HOLD");
  assert.throws(() => acceptDraft(recipe, exampleProposal, false), /explicit/);
  const derived = acceptDraft(recipe, exampleProposal, true);
  assert.equal(derived.status, "locally-created-not-published");
  assert.equal(derived.sourceClass, "locally-selected-creative-proposal");
  assert.deepEqual(derived.parents.sourceObservationIds, recipe.sources.map((source) => source.id));
  const draft = structuralDraft(recipe);
  assert.equal(siaHold(recipe, draft).disposition, "HOLD");
  assert.equal(siaEvaluate(recipe, draft).author.name, "local-structural-draft");
  assert.throws(() => siaHarvest(recipe, draft, { explicitChoice: false }), /explicit/);
});

test("story DNA encounter stays refused until the source rules allow it", () => {
  const fixture = JSON.parse(readFileSync(new URL("../vendor/story-dna/fixtures/relationship-passenger.json", import.meta.url), "utf8"));
  const echo = composeRelationship(fixture.threads[0], fixture.threads[1], { mode: "echo", seed: 325 });
  assert.equal(echo.admission, "NONE");
  assert.equal(echo.characterTransfer, null);
  assert.throws(() => composeRelationship(fixture.threads[0], fixture.threads[1], { mode: "encounter", seed: 1 }), /encounter requires/);
});

test("orrery keeps thousands addressable and the clown note is not a documented edge", () => {
  const many = [];
  for (let i = 0; i < 2000; i++) {
    many.push({
      id: `sha256:${i.toString(16).padStart(64, "0")}`,
      title: `Item ${i}`,
      kind: "song",
      url: `https://example.com/fossil-orrery/synthetic/bulk/${i}`,
      creator: "",
      evidence: "synthetic-fixture",
      chrono: { kind: "source-claimed", sort: Date.UTC(2000, 0, 1) + i * 86400000, label: "day", precision: "day" },
      links: [],
      parentIds: [],
      facts: [],
      interpretations: [],
      capture: null,
      raw: {},
    });
  }
  const zoomed = layoutSky(many, [], 1280, 800, null);
  assert.ok(zoomed.nodes.length < 80);
  assert.equal(zoomed.nodes.every((node) => node.band === "bucket"), true);
  const opened = layoutSky(many, [], 1280, 800, zoomed.nodes[0].memberIds);
  assert.ok(opened.nodes.length <= 64);
  assert.deepEqual(
    new Set(opened.nodes.flatMap((node) => node.memberIds)),
    new Set(zoomed.nodes[0].memberIds),
  );
  const rosemary = observe(observedRecords.find((item) => item.artifact.externalId === PORCH_IDS.rosemary));
  const porch = observe(observedRecords.find((item) => item.artifact.externalId === PORCH_IDS.porch));
  const items = [project(rosemary), project(porch)];
  const edges = documentedEdges(items, []);
  assert.equal(edges.some((edge) => edge.kind === "documented" && edge.label === "published-pair"), true);
  const note = clownNote(
    [
      { ...items[0], title: "Rosemary Market Cups", facts: [] },
      { ...items[1], title: "Rosemary River Cups", links: [], facts: [] },
    ],
    [],
  );
  assert.equal(note.token, "rosemary");
  const hypothesis = makeHypothesis(items[0].id, items[1].id, [note.token]);
  assert.equal(hypothesis.status, "HYPOTHESIS");
  assert.equal(documentedEdges(items, [hypothesis]).some((edge) => edge.kind === "hypothesis"), true);
  assert.equal(items[0].links.some((link) => link.type === "hypothesis"), false);
});

test("tampered observations fail identity and interpretations are not facts", () => {
  const sealed = observe(observedRecords[0]);
  assert.equal(verifyObservation(sealed).id, sealed.id);
  const tampered = structuredClone(sealed);
  tampered.artifact.title = "rewritten";
  assert.throws(() => verifyObservation(tampered), /digest mismatch/);
  assert.equal(sealed.facts.some((fact) => /rosemary may suggest/i.test(String(fact.value))), false);
  assert.equal(sealed.interpretations.length > 0, true);
});


test("raw snapshot SHA-256 is verified on import; tampered evidence never enters the vault", () => {
  const text = '{"unicode":"Rosemary 🌹","nul":"\u0000"}';
  const raw = { filename: "owner-export.json", text, sha256: hashText(text) };
  const base = { schema: "fossil-orrery/vault/v0", objects: [], hypotheses: [], annotations: [], threads: [], candidates: [], reviews: [] };
  const valid = readBundle({ ...base, raw: [raw] });
  assert.equal(valid.raw.length, 1);
  assert.deepEqual(valid.rejected, []);
  const corrupt = readBundle({ ...base, raw: [
    { ...raw, text: text + "!" },
    { ...raw, sha256: "sha256:" + "0".repeat(64) },
    { ...raw, sha256: "not-a-digest" },
    { ...raw, filename: 42 },
    raw,
    raw,
  ] });
  assert.deepEqual(corrupt.raw, [raw]);
  assert.equal(corrupt.rejected.length, 4);
  assert.ok(corrupt.rejected.some((x) => x.includes("mismatch")));
  assert.ok(corrupt.rejected.every((x) => x.includes("refused")));
  const malformed = readBundle({ ...base, raw: { item: raw } });
  assert.equal(malformed.raw.length, 0);
  assert.match(malformed.rejected.join(" "), /expected an array/);
});

test("15,000 artifacts remain reachable through deterministic, distinct, band-local strata", () => {
  const many = Array.from({ length: 15000 }, (_, i) => {
    const band = i < 12600 ? "unresolved" : i < 14400 ? "source-claimed" : "derived";
    return {
      id: `sha256:${i.toString(16).padStart(64, "0")}`,
      title: `Song ${String(i).padStart(5, "0")}`,
      kind: "song",
      url: `https://example.org/owned/${i}`,
      creator: "synthetic fixture",
      evidence: "synthetic-fixture",
      chrono: { kind: band, sort: band === "source-claimed" ? Date.UTC(2010, 0, 1) + i * 86400000 : null, label: band, precision: null },
      links: [], parentIds: [], facts: [], interpretations: [], capture: null, raw: {},
    };
  });
  const allIds = new Set(many.map((item) => item.id));
  for (const [width, height] of [[1280, 800], [360, 540]]) {
    const opened = new Set();
    const travel = (members, depth = 0) => {
      assert.ok(depth < 12, "strata must strictly subdivide");
      const layout = layoutSky(many, [], width, height, members);
      const coords = new Set(layout.nodes.map((node) => `${node.x.toFixed(5)}:${node.y.toFixed(5)}`));
      assert.equal(coords.size, layout.nodes.length, "no overlap in visible coordinates");
      assert.ok(layout.nodes.length <= 3 * 64, "bounded canvas node count");
      for (const node of layout.nodes) {
        if (node.band === "bucket") {
          assert.ok(node.memberIds.length > 1);
          assert.ok(!members || node.memberIds.length < members.length, "drill-down must reduce the group");
          const kinds = new Set(node.memberIds.map((id) => many[Number.parseInt(id.slice(7), 16)].chrono.kind));
          assert.equal(kinds.size, 1, "do not mix unresolved/claimed/derived into one bucket");
          travel(node.memberIds, depth + 1);
        } else {
          assert.equal(node.memberIds.length, 1);
          assert.equal(opened.has(node.id), false, "one source must not appear in two strata");
          opened.add(node.id);
        }
      }
    };
    travel(null);
    assert.deepEqual(opened, allIds);
    const result = layoutSky(many, [], width, height, null);
    assert.equal(result.undated, 12600);
    assert.equal(result.dated, 1800);
    assert.equal(result.derived, 600);
    assert.deepEqual(result.nodes.map(({ id, x, y }) => [id, x, y]), layoutSky(many, [], width, height, null).nodes.map(({ id, x, y }) => [id, x, y]));
  }
});
