// main.ts — gta6-meme-x-01 entrypoint (Node 22, standard library only).
// The entry is the post itself: the meme was made by the agent (see
// tools/make-meme.mjs, which draws meme.png pixel by pixel), posted on X,
// and POST.json names its address. All this program has to do is copy
// POST.json from the repository root to /output/POST.json, where the gate
// reads it. It also validates that POST.json parses and holds an X post URL,
// so a bad file fails loudly instead of shipping silently.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const src = join(BOT_DIR, 'POST.json');
const raw = readFileSync(src, 'utf8');
const parsed: unknown = JSON.parse(raw);
if (typeof parsed !== 'object' || parsed === null || typeof (parsed as { url?: unknown }).url !== 'string') {
  console.error('POST.json must be a JSON object with a string "url" field');
  process.exit(1);
}
const url = (parsed as { url: string }).url;
if (!/^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/\w+\/status\/\d+/.test(url)) {
  console.error(`POST.json url does not look like an X post address: ${url}`);
  process.exit(1);
}
mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(src, join(OUTPUT_DIR, 'POST.json'));
console.log(`POST.json copied to ${OUTPUT_DIR} (${url})`);
