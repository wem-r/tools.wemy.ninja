// Timestamp converter across the formats you meet in DFIR. All conversions go through
// milliseconds-since-Unix-epoch. Pure.

// each: value (number) -> ms since 1970   and   ms -> value
export const FORMATS = [
  ['unix', 'Unix seconds', (v) => v * 1000, (ms) => Math.round(ms / 1000)],
  ['unix_ms', 'Unix milliseconds', (v) => v, (ms) => Math.round(ms)],
  ['unix_us', 'Unix microseconds', (v) => v / 1000, (ms) => Math.round(ms * 1000)],
  ['filetime', 'Windows FILETIME / AD (100ns since 1601)', (v) => v / 1e4 - 11644473600000, (ms) => Math.round((ms + 11644473600000) * 1e4)],
  ['webkit', 'WebKit / Chrome (µs since 1601)', (v) => v / 1e3 - 11644473600000, (ms) => Math.round((ms + 11644473600000) * 1e3)],
  ['dotnet', '.NET ticks (100ns since 0001)', (v) => v / 1e4 - 62135596800000, (ms) => Math.round((ms + 62135596800000) * 1e4)],
  ['hfs', 'HFS+ / Mac (s since 1904)', (v) => (v - 2082844800) * 1000, (ms) => Math.round(ms / 1000 + 2082844800)],
  ['cocoa', 'Cocoa / Mac absolute (s since 2001)', (v) => v * 1000 + 978307200000, (ms) => Math.round((ms - 978307200000) / 1000)],
  ['java', 'Java milliseconds', (v) => v, (ms) => Math.round(ms)],
];

export function toMs(value, fmtId) {
  const f = FORMATS.find((x) => x[0] === fmtId); if (!f) return NaN;
  return f[2](value);
}
export function fromMs(ms, fmtId) {
  const f = FORMATS.find((x) => x[0] === fmtId); if (!f) return NaN;
  return f[3](ms);
}
export function allFrom(ms) {
  return FORMATS.map(([id, label, , enc]) => [id, label, enc(ms)]);
}
// interpret one value as each format and give the resulting UTC datetime (to spot the right one)
export function interpretations(value) {
  return FORMATS.map(([id, label, dec]) => {
    const ms = dec(value); const d = new Date(ms);
    const valid = isFinite(ms) && !isNaN(d.getTime());
    const ok = valid && d.getUTCFullYear() > 1990 && d.getUTCFullYear() < 2100;
    return { id, label, ms, iso: valid ? d.toISOString() : '—', likely: ok };
  });
}
export const fmtISO = (ms) => { const d = new Date(ms); return (isFinite(ms) && !isNaN(d.getTime())) ? d.toISOString() : '—'; };
