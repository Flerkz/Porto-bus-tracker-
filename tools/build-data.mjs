// Downloads every STCP line's path and ordered stops into the small files the app loads:
// routes/<line>_<direction>.json and stops.json.
// Run from the project folder with: node tools/build-data.mjs
// An optional argument sets a different output folder.
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || path.resolve(import.meta.dirname, '..');
fs.mkdirSync(path.join(out, 'routes'), { recursive: true });

const get = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
};
const r5 = (n) => Math.round(n * 1e5) / 1e5;

const html = await (await fetch('https://stcp.pt/pt/linhas')).text();
const lines = [...new Set(
  [...html.matchAll(/href="\/pt\/linhas\/([^"\/]+)"/g)].map((m) => decodeURIComponent(m[1])),
)];
console.log('Lines found:', lines.length);

let files = 0;
const skipped = [];
for (const line of lines) {
  for (const dir of [0, 1]) {
    try {
      const base = 'https://stcp.pt/api/route/' + encodeURIComponent(line);
      const shape = await get(base + '/shape?direction_id=' + dir);
      const list = await get(base + '/stops/direction?direction_id=' + dir);
      const c = (shape.coordinates || []).map((p) => [r5(p.lat), r5(p.lng)]);
      const s = (list.stops || []).map((p) => [p.stop_id, p.stop_name, r5(p.stop_lat), r5(p.stop_lon)]);
      if (c.length < 2 || !s.length) {
        skipped.push(line + '_' + dir);
        continue;
      }
      const name = encodeURIComponent(line) + '_' + dir + '.json';
      fs.writeFileSync(path.join(out, 'routes', name), JSON.stringify({ c, s }));
      files++;
    } catch (err) {
      skipped.push(line + '_' + dir + ' (' + err.message + ')');
    }
  }
}

const stops = (await get('https://stcp.pt/api/stops?limit=5000')).results
  .filter((s) => s.stop_id && s.stop_name && s.stop_name !== '.')
  .map((s) => [s.stop_id, s.stop_name, r5(s.stop_lat), r5(s.stop_lon)]);
fs.writeFileSync(path.join(out, 'stops.json'), JSON.stringify(stops));

console.log('Route files written:', files);
console.log('Stops written:', stops.length);
console.log('Skipped (no data):', skipped.join(', ') || 'none');
