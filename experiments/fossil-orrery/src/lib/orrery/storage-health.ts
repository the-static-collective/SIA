/** A warning only, not a promise that the browser will retain IndexedDB bytes. */
export function storageHealth(usage: number | undefined, quota: number | undefined, recordCount: number) {
  const ratio = typeof usage === 'number' && typeof quota === 'number' && quota > 0 ? usage / quota : null;
  return {
    ratio,
    warning: ratio !== null && ratio > 0.8
      ? 'Browser storage is above 80%. Export your vault before importing more.'
      : recordCount >= 10000
        ? 'Large collection. Export a backup and verify reload before depending on browser storage.'
        : ratio === null
          ? 'Quota is unknown; a downloadable vault backup is still required.'
          : 'Storage estimate only; retention is not guaranteed. Export your vault.',
  };
}
