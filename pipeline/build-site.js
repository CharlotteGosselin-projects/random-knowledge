// Assemble the static site for GitHub Pages: site/ + data/ -> _site/
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, '_site');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(join(ROOT, 'site'), OUT, { recursive: true });
const data = join(ROOT, 'data');
if (await access(data).then(() => true, () => false)) await cp(data, join(OUT, 'data'), { recursive: true });
console.log(`Site assembled in ${OUT}`);
