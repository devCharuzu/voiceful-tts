export function getModelDownloadTotals(voices, cachedIds = []) {
  const ids = Object.keys(voices);
  const cached = new Set(cachedIds);
  const totalBytes = ids.reduce((total, id) => total + voices[id].modelBytes + voices[id].configBytes, 0);
  const completedBytes = ids.reduce((total, id) => cached.has(id) ? total + voices[id].modelBytes + voices[id].configBytes : total, 0);
  return {
    ids,
    pendingIds: ids.filter((id) => !cached.has(id)),
    totalBytes,
    completedBytes,
  };
}

export function getModelDownloadPercent(totalBytes, completedBytes, currentLoaded = 0, currentModelBytes = 0) {
  if (!totalBytes) return 100;
  const loaded = Math.min(Math.max(currentLoaded, 0), currentModelBytes);
  return Math.max(0, Math.min(100, ((completedBytes + loaded) / totalBytes) * 100));
}
