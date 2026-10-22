import { useState } from 'react';
import { runObservedAlbumTrial } from '@/lib/orrery/field-trial';
import { storageHealth } from '@/lib/orrery/storage-health';
import { downloadJson } from './parts';
import { useVault } from './store';

export function FieldTrial() {
  const vault = useVault();
  const [trial, setTrial] = useState<ReturnType<typeof runObservedAlbumTrial> | null>(null);
  const [quota, setQuota] = useState<{ usage?: number; quota?: number; persisted?: boolean } | null>(null);

  const inspectStorage = async () => {
    try {
      const estimate = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setQuota({ usage: estimate?.usage, quota: estimate?.quota, persisted });
    } catch {
      setQuota({});
    }
  };

  const run = () => {
    try {
      const result = runObservedAlbumTrial();
      setTrial(result);
      vault.setError(null);
      vault.setNotice('Scripted proof passed: six documented album claims → Orrery → Bone Flute tone mapping → SIA HOLD → simulated selection → round trip. No vault changes.');
    } catch (error) {
      vault.setError(error instanceof Error ? error.message : 'Scripted proof refused');
    }
  };
  const health = storageHealth(quota?.usage, quota?.quota, Object.keys(vault.objects).length);
  return (
    <section className="rounded-xl border border-amber/40 bg-panel p-4" aria-label="003 Field station">
      <p className="font-mono text-xs tracking-widest text-amber">003 — FIELD STATION</p>
      <h3 className="mt-1 font-serif text-2xl">First six real album witnesses</h3>
      <p className="mt-2 font-mono text-xs text-mute">
        These are six SIA public album snapshots captured October 13, 2026: 52 album track positions, not 52 proven unique songs. They are NOT a Suno owner export. Missing dates remain unresolved.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn" data-testid="import-observed-six" onClick={() => vault.loadObservedAlbums()} type="button">
          Merge observed six
        </button>
        <button className="btn" data-testid="run-field-trial" onClick={run} type="button">
          Run non-writing proof
        </button>
        <button className="btn" onClick={() => void inspectStorage()} type="button">Check storage</button>
        {trial && <button className="btn" onClick={() => downloadJson('fossil-orrery-field-003.json', trial)} type="button">Export proof receipt</button>}
      </div>
      {trial && <p className="mt-2 font-mono text-xs text-amber" data-testid="field-trial-result">
        PASS: {trial.observedAlbumCount} observed albums · {trial.albumTrackPositions} track positions · {trial.orreryReachable} locators reachable · {trial.receiptDisposition} · {trial.roundTripRecordCount} identity-preserved test records.
      </p>}
      <p className="mt-2 font-mono text-xs text-mute">Vault write: {vault.durability}. {health.warning}</p>
      {quota && <p className="mt-1 font-mono text-xs text-mute">
        Browser estimate: {quota.usage === undefined ? 'unknown' : (quota.usage / 1048576).toFixed(1) + ' MiB'} used
        {quota.quota === undefined ? '' : ` / ${(quota.quota / 1048576).toFixed(1)} MiB quota`}; durable storage: {quota.persisted === undefined ? 'unknown' : quota.persisted ? 'granted' : 'not granted'}.
      </p>}
      <p className="mt-2 font-mono text-xs text-mute">A browser storage estimate is not a backup or survival guarantee. Export vault, reload, and re-import. A scripted selection is never a human selection.</p>
    </section>
  );
}
