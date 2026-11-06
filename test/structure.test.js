/* House rules for the code: small files, imports that resolve, and a service worker that precaches every app file. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const walk = d => readdirSync(join(ROOT, d)).flatMap(f => { const p = join(d, f); return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p]; });
const FROZEN_BIG = new Set(["src/frozen/sim.js"]);   // the simulator, kept byte-identical to the artifact
const MAX_LINES = 400;

test("every source file stays under ~400 lines (except the frozen simulator)", () => {
  const long = walk("src").filter(f => f.endsWith(".js") && !FROZEN_BIG.has(f))
    .map(f => [f, readFileSync(join(ROOT, f), "utf8").split("\n").length]).filter(([, n]) => n > MAX_LINES);
  assert.deepEqual(long, []);
});

test("every relative import points at a file that exists", () => {
  const bad = [];
  for (const f of walk("src").filter(f => f.endsWith(".js") && !FROZEN_BIG.has(f))){
    const src = readFileSync(join(ROOT, f), "utf8");
    for (const m of src.matchAll(/(?:import|export)\s[^"']*?from\s+["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g)){
      const spec = m[1] || m[2]; if (!existsSync(join(ROOT, dirname(f), spec))) bad.push(f + " -> " + spec);
    }
  }
  assert.deepEqual(bad, []);
});

test("the service worker precaches exactly the app's files", () => {
  const sw = readFileSync(join(ROOT, "sw.js"), "utf8");
  const listed = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/\s+/g, " "));
  const files = ["index.html", "manifest.webmanifest", ...walk("src"), ...walk("css"), ...walk("icons")].map(f => f.split("\\").join("/"));
  const missing = files.filter(f => !listed.includes(f));
  const extra = listed.filter(f => f !== "./" && !files.includes(f));
  assert.deepEqual({missing, extra}, {missing: [], extra: []});
});

test("no personal training data is committed", () => {
  const tracked = walk(".").filter(f => !f.startsWith(".git" ) && !f.startsWith("local") && !f.startsWith("node_modules")).map(f => relative(".", f));
  const suspicious = tracked.filter(f => /(^|\/)(katalog|send-log)-\d{4}-\d{2}-\d{2}\.json$/.test(f) || /^real-/.test(f.split("/").pop()));
  assert.deepEqual(suspicious, []);
});
