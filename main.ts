// Ledger — make.fun entry program (Node 22, standard library only).
//
// The entry is the static site under app/ plus the screenshots in
// screenshots/. This program copies both into the output directory and
// writes dossier.json through the vendored make.fun library, exactly the
// way the sealed scorer expects it. Run it with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destination, { recursive: true });
cpSync(join(repoRoot, 'app'), join(destination, 'app'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}

// The scorer's caps, as the kit's reference gate states them: at most four
// screenshots, each at most 256 KiB; app/ at most 993 files and 16 MiB in
// total. text_max_bytes bounds the dossier text the judge reads.
writeFileSync(
  join(destination, 'dossier.json'),
  buildDossier(destination, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
