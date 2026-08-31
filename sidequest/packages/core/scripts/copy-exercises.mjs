import { mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const srcDir = "src/exercises";
const distDir = "dist/exercises";

mkdirSync(distDir, { recursive: true });
for (const file of readdirSync(srcDir).filter((f) => f.endsWith(".json"))) {
  copyFileSync(join(srcDir, file), join(distDir, file));
}
