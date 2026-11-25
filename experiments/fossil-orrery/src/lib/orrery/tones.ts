export function toneHz(id: string) {
  const n = parseInt(id.slice(7, 11), 16) || 0;
  const steps = [0, 2, 4, 7, 9];
  const midi = 57 + steps[n % 5] + 12 * ((n >> 3) % 2);
  return 440 * 2 ** ((midi - 69) / 12);
}
