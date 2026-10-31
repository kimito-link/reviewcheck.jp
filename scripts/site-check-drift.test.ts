/**
 * packages/site-check は正本のバイト列のままにする。
 * 規則を変えるときは、正本の版を上げたファイルを置き直し、
 * vendor/site-check.upstream.json のハッシュも一緒に更新する。
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "packages/site-check");
const manifestPath = path.join(repoRoot, "vendor/site-check.upstream.json");

function filesIn(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name === "node_modules" || name === ".vite") continue;
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) found.push(...filesIn(abs));
    else found.push(path.relative(packageDir, abs).split(path.sep).join("/"));
  }
  return found;
}

test("vendored site-check matches the recorded source commit", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
    commit: string;
    branch: string;
    rubric: string;
    path: string;
    files: Record<string, string>;
  };
  assert.equal(manifest.commit, "d9226b10d897002fc80446130361aac88e9987a0");
  assert.equal(manifest.branch, "cursor/site-security-check-44c5");
  assert.equal(manifest.rubric, "site-check v1.0");
  assert.equal(manifest.path, "packages/site-check");

  const present = filesIn(packageDir);
  const recorded = Object.keys(manifest.files).sort();
  assert.deepEqual(present, recorded);

  for (const rel of present) {
    const hash = createHash("sha256").update(readFileSync(path.join(packageDir, rel))).digest("hex");
    assert.equal(hash, manifest.files[rel], rel);
  }
});
