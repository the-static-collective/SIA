import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { observation } from "@/lib/orrery/engine";
import { readBundle } from "@/lib/orrery/bundle";
import { acceptStored, hashText } from "@/lib/orrery/intake";
import { observedRecords, syntheticBodies } from "@/lib/orrery/sample";

export type Instrument = "harvester" | "orrery" | "metabolizer" | "maddclown";

type RawSnap = { sha256: string; filename: string; text: string };

export type VaultData = {
  objects: Record<string, any>;
  raw: Record<string, RawSnap>;
  hypotheses: any[];
  annotations: any[];
  threads: any[];
  candidates: any[];
  reviews: any[];
  pins: string[];
  selectedId: string | null;
  instrument: Instrument;
  declinedSample: boolean;
};

type VaultApi = VaultData & {
  ready: boolean;
  notice: string | null;
  error: string | null;
  setInstrument: (instrument: Instrument) => void;
  select: (id: string | null) => void;
  togglePin: (id: string) => void;
  setPins: (ids: string[]) => void;
  setNotice: (notice: string | null) => void;
  setError: (error: string | null) => void;
  ingestObjects: (items: unknown[]) => { added: number; reused: number; rejected: string[] };
  rememberRaw: (filename: string, text: string) => string;
  addHypothesis: (item: any) => void;
  addAnnotation: (item: any) => void;
  addThread: (item: any) => void;
  addCandidate: (item: any) => void;
  addReview: (item: any) => void;
  loadSample: () => void;
  importBundle: (bundle: unknown) => void;
  forget: () => void;
};

const EMPTY: VaultData = {
  objects: {},
  raw: {},
  hypotheses: [],
  annotations: [],
  threads: [],
  candidates: [],
  reviews: [],
  pins: [],
  selectedId: null,
  instrument: "orrery",
  declinedSample: false,
};

const Ctx = createContext<VaultApi | null>(null);
const DB = "fossil-orrery";
const KEY = "vault-v1";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<VaultData | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction("kv").objectStore("kv").get(KEY);
    req.onsuccess = () => resolve((req.result as VaultData) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(data: VaultData) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const req = db.transaction("kv", "readwrite").objectStore("kv").put(data, KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function sealSample() {
  const objects: Record<string, any> = {};
  const rejected: string[] = [];
  for (const body of [...observedRecords, ...syntheticBodies()]) {
    try {
      const sealed = observation(body);
      objects[sealed.id] = sealed;
    } catch (error) {
      rejected.push(error instanceof Error ? error.message : "sample row refused");
    }
  }
  return { objects, rejected };
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<VaultData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let cancel = false;
    idbGet()
      .then((saved) => {
        if (cancel) return;
        if (saved?.objects && (Object.keys(saved.objects).length || saved.declinedSample)) {
          setData({ ...EMPTY, ...saved });
          setNotice(saved.declinedSample && !Object.keys(saved.objects).length ? "This browser vault is empty." : null);
        } else {
          const seeded = sealSample();
          const next = { ...EMPTY, objects: seeded.objects };
          setData(next);
          setNotice(
            seeded.rejected.length
              ? `Sample trench opened with ${seeded.rejected.length} rows refused. Nothing was invented to fill them.`
              : "Sample trench opened. Observed SIA captures and synthetic fixtures are labeled differently.",
          );
        }
        setReady(true);
      })
      .catch(() => {
        if (cancel) return;
        const seeded = sealSample();
        setData({ ...EMPTY, objects: seeded.objects });
        setNotice("This browser wouldn't keep a vault. The trench is open for this visit only.");
        setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handle = setTimeout(() => {
      idbSet(dataRef.current).catch(() => setError("The local vault could not be saved in this browser."));
    }, 200);
    return () => clearTimeout(handle);
  }, [data, ready]);

  const commit = (recipe: (current: VaultData) => VaultData) => {
    const next = recipe(dataRef.current);
    dataRef.current = next;
    setData(next);
    return next;
  };

  const api = useMemo<VaultApi>(() => {
    const ingestObjects = (items: unknown[]) => {
      const rejected: string[] = [];
      let added = 0;
      let reused = 0;
      commit((current) => {
        const objects = { ...current.objects };
        for (const item of items) {
          try {
            const sealed = acceptStored(item);
            if (objects[sealed.id]) reused += 1;
            else {
              objects[sealed.id] = sealed;
              added += 1;
            }
          } catch (err) {
            rejected.push(err instanceof Error ? err.message : "refused");
          }
        }
        return { ...current, objects };
      });
      if (rejected.length) setError(rejected[0]);
      return { added, reused, rejected };
    };
    return {
      ...data,
      ready,
      notice,
      error,
      setInstrument: (instrument) => commit((current) => ({ ...current, instrument })),
      select: (selectedId) => commit((current) => ({ ...current, selectedId })),
      togglePin: (id) =>
        commit((current) => ({
          ...current,
          pins: current.pins.includes(id) ? current.pins.filter((pin) => pin !== id) : [...current.pins, id].slice(-12),
          selectedId: id,
        })),
      setPins: (pins) => commit((current) => ({ ...current, pins: pins.slice(0, 12) })),
      setNotice,
      setError,
      ingestObjects,
      rememberRaw: (filename, text) => {
        const sha256 = hashText(text);
        commit((current) => ({ ...current, raw: { ...current.raw, [sha256]: { sha256, filename, text } } }));
        return sha256;
      },
      addHypothesis: (item) =>
        commit((current) => ({
          ...current,
          hypotheses: current.hypotheses.some((h) => h.id === item.id) ? current.hypotheses : [...current.hypotheses, item],
        })),
      addAnnotation: (item) =>
        commit((current) => ({
          ...current,
          annotations: current.annotations.some((h) => h.id === item.id) ? current.annotations : [...current.annotations, item],
        })),
      addThread: (item) =>
        commit((current) => ({
          ...current,
          threads: current.threads.some((h) => h.id === item.id) ? current.threads : [...current.threads, item],
        })),
      addCandidate: (item) => commit((current) => ({ ...current, candidates: [...current.candidates, item] })),
      addReview: (item) => commit((current) => ({ ...current, reviews: [...current.reviews, item] })),
      loadSample: () => {
        const seeded = sealSample();
        const result = ingestObjects(Object.values(seeded.objects));
        commit((current) => ({ ...current, declinedSample: false }));
        setNotice(`Sample trench merged. ${result.added} new, ${result.reused} already present.`);
      },
      importBundle: (bundle) => {
        const read = readBundle(bundle);
        const result = ingestObjects(read.objects);
        commit((current) => ({
          ...current,
          raw: { ...current.raw, ...Object.fromEntries(read.raw.map((item) => [item.sha256, item])) },
          hypotheses: mergeById(current.hypotheses, read.hypotheses),
          annotations: mergeById(current.annotations, read.annotations),
          threads: mergeById(current.threads, read.threads),
          candidates: [...current.candidates, ...read.candidates],
          reviews: [...current.reviews, ...read.reviews],
        }));
        setNotice(`Bundle merged. ${result.added} new objects, ${result.reused} reused. Hypotheses stayed hypotheses.`);
        if (read.rejected.length || result.rejected.length) setError(read.rejected[0] ?? result.rejected[0]);
      },
      forget: () => {
        commit(() => ({ ...EMPTY, instrument: "harvester", declinedSample: true }));
        setNotice("Browser vault forgotten. Source files were not touched.");
        setError(null);
      },
    };
    // commit is stable enough for this session: it always reads the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ready, notice, error]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

function mergeById(current: any[], incoming: any[]) {
  const map = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) if (item?.id && !map.has(item.id)) map.set(item.id, item);
  return [...map.values()];
}

export function useVault() {
  const value = useContext(Ctx);
  if (!value) throw new Error("Vault is not mounted");
  return value;
}
