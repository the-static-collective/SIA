import rosemary from "../../fixtures/observed/rosemary.observation.json" with { type: "json" };
import porch from "../../fixtures/observed/porch.observation.json" with { type: "json" };
import bloom from "../../fixtures/observed/bloom.observation.json" with { type: "json" };
import another from "../../fixtures/observed/another-day.observation.json" with { type: "json" };
import week from "../../fixtures/observed/a-week-together.observation.json" with { type: "json" };
import sunday from "../../fixtures/observed/sunday-jam.observation.json" with { type: "json" };
import dadcore from "../../fixtures/observed/midwestern-post-internet-ecclesiastical-dadcore.observation.json" with { type: "json" };
import blue from "../../fixtures/observed/blue-night-morning.observation.json" with { type: "json" };
import reading from "../../fixtures/observed/blue-night-morning-ai-reading.observation.json" with { type: "json" };
import sunoSample from "../../fixtures/observed/suno-owner-export.sample.json" with { type: "json" };
import proposal from "../../fixtures/observed/ai-proposal.visual.json" with { type: "json" };

const WORDS = ["rosemary", "porch", "cedar", "night", "cups", "train", "door", "bread", "bloom", "boards", "market", "pine", "lamp", "river", "static"];
const ALBUM = "https://example.com/fossil-orrery/synthetic/album/porch-catalog";
const SEALED = "2026-10-21T15:00:00Z";

function cap(word: string) {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
}

function dayFor(i: number) {
  const start = Date.UTC(2022, 0, 4);
  const stamp = start + i * 17 * 86400000;
  return new Date(stamp).toISOString().slice(0, 10);
}

/** Clearly labeled synthetic bodies. Dates live only in source_created_at, never in capture time. */
export function syntheticBodies() {
  const bodies: Record<string, unknown>[] = [
    {
      schema: "sia/observation/v0",
      artifact: {
        externalId: "synthetic:album:porch-catalog",
        kind: "album",
        title: "Synthetic Porch Catalog",
        url: ALBUM,
        creator: "Fossil Orrery fixture (synthetic)",
      },
      capture: {
        sourceUrl: ALBUM,
        evidenceUrl: ALBUM,
        observedAt: SEALED,
        method: "owner-export",
        rights: "links-only",
        notes: "SYNTHETIC fixture album. Not a real release and not a Static Collective observation.",
      },
      facts: [
        { key: "track_count", value: 36, basis: "owner-note" },
        { key: "album_created_date", value: "2022-01-04", basis: "owner-note" },
      ],
      relations: [],
      interpretations: [
        { text: "This catalog exists so the orrery has sediment to dig. It is not a source claim about anyone's music.", by: "human" },
      ],
    },
  ];
  for (let i = 0; i < 36; i++) {
    const w1 = WORDS[i % WORDS.length];
    const w2 = WORDS[(i * 3 + 1) % WORDS.length];
    const w3 = WORDS[(i * 5 + 4) % WORDS.length];
    const dated = i % 9 !== 0;
    const url = `https://example.com/fossil-orrery/synthetic/song/${i}`;
    const facts: { key: string; value: string | number | boolean; basis: string }[] = [];
    if (dated) {
      facts.push({ key: "source_created_at", value: dayFor(i), basis: "owner-export" });
      facts.push({ key: "source_created_precision", value: "day", basis: "owner-export" });
    }
    if (i % 2 === 0) facts.push({ key: "style_tags", value: `${w1}, acoustic`, basis: "owner-note" });
    const relations: { type: string; target: string; basis: string; evidenceUrl: string }[] = [];
    if (i % 5 === 0) relations.push({ type: "part-of", target: ALBUM, basis: "owner-note", evidenceUrl: ALBUM });
    if (i > 0 && i % 11 === 0) {
      relations.push({
        type: "version-of",
        target: `https://example.com/fossil-orrery/synthetic/song/${i - 1}`,
        basis: "owner-note",
        evidenceUrl: ALBUM,
      });
    }
    bodies.push({
      schema: "sia/observation/v0",
      artifact: {
        externalId: `synthetic:song:${i}`,
        kind: "song",
        title: `${cap(w1)} ${cap(w2)} ${cap(w3)}`,
        url,
        creator: "Fossil Orrery fixture (synthetic)",
      },
      capture: {
        sourceUrl: url,
        evidenceUrl: url,
        observedAt: SEALED,
        method: "owner-export",
        rights: "links-only",
        notes: "SYNTHETIC fixture. Not an observation of a real recording. Missing dates stay missing.",
      },
      facts,
      relations,
      interpretations: [],
    });
  }
  return bodies;
}

export const observedRecords = [rosemary, porch, bloom, sunday, another, week, dadcore, blue, reading];

export const PORCH_IDS = {
  rosemary: "suno:70b1d32e-21b6-4340-990d-1a4ef67cfc42",
  porch: "suno:66ce822e-be59-4511-887b-61feda608300",
};

export const exampleProposal = proposal;
export const sunoSampleExport = sunoSample;

export const UNFAMILIAR_CSV = `song_name,creator_label,when_made,page,vibe,private_note
"Lamp Hour","Fixture Author","2024-04-02","https://example.com/fossil-orrery/synthetic/import-lamp","warm static","SYNTHETIC mapping specimen"
"Undated Cup","Fixture Author",,"https://example.com/fossil-orrery/synthetic/import-cup","ceramic",""
"Published Only","Fixture Author",,"https://example.com/fossil-orrery/synthetic/import-pub","","release was printed elsewhere"
`;
