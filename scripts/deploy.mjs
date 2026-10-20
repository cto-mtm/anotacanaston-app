#!/usr/bin/env node
// Deploy the app: build the SPA, copy it into firebase/app, then deploy.
// This is the one true deploy path — see README.md "Deploy" section.
// Cross-platform (Windows/macOS/Linux): no bash/shell builtins required.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Run a command, inheriting stdio, and abort the deploy on failure. */
function run(cmd, args, cwd) {
  // shell: true so `npm`/`firebase` resolve to their .cmd shims on Windows.
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: true });
  if (res.status !== 0) {
    console.error(`\nerror: \`${cmd} ${args.join(" ")}\` failed (exit ${res.status ?? "signal"}).`);
    process.exit(res.status ?? 1);
  }
}

// Fail fast if the real Firebase project id hasn't been set yet.
const firebaserc = readFileSync(join(repoRoot, ".firebaserc"), "utf8");
if (firebaserc.includes("REPLACE_ME_FIREBASE_PROJECT_ID")) {
  console.error("error: .firebaserc still has REPLACE_ME_FIREBASE_PROJECT_ID — set your real Firebase project id first.");
  process.exit(1);
}

// Resolve the project id from the root .firebaserc and pass it explicitly to
// `firebase deploy`. The deploy runs from firebase/ (where firebase.json is),
// and firebase-tools only reads .firebaserc from the current directory — it
// does NOT walk up to the repo root — so without --project it reports
// "No currently active project". Passing it removes that cwd dependency.
const projectId = JSON.parse(firebaserc)?.projects?.default;
if (!projectId) {
  console.error("error: could not read projects.default from .firebaserc");
  process.exit(1);
}

console.log("==> Building app/");
run("npm", ["run", "build"], join(repoRoot, "app"));

console.log("==> Copying app/dist -> firebase/app");
const dist = join(repoRoot, "app", "dist");
const dest = join(repoRoot, "firebase", "app");
if (!existsSync(dist)) {
  console.error(`error: build output not found at ${dist}`);
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(dist, dest, { recursive: true });

console.log("==> Deploying via firebase-tools");
run("firebase", ["deploy", "--project", projectId], join(repoRoot, "firebase"));

console.log("==> Done.");
