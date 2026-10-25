/** @format */

// Builds the API into one Linux executable (Bun runtime included, so the server
// needs no Bun), uploads it to EC2 and (re)starts it under pm2.
//
//   bun run deploy:api            build, upload, restart
//   bun run deploy:api --dry-run  build only, print what it would run
//
// Override with env vars: SSH_KEY, SSH_HOST, APP_DIR.
// The server keeps its own $APP_DIR/.env (production values); this never uploads secrets.

import { $ } from "bun";
import { homedir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "../..");
const key = process.env.SSH_KEY ?? join(homedir(), "Downloads", "trellala.pem");
const host =
  process.env.SSH_HOST ??
  "ubuntu@ec2-43-204-233-142.ap-south-1.compute.amazonaws.com";
const appDir = process.env.APP_DIR ?? "/home/ubuntu/busapi";
const dryRun = process.argv.includes("--dry-run");
const binary = join(root, "dist/api/busapi");
const ssh = ["-i", key, "-o", "StrictHostKeyChecking=accept-new"];

$.cwd(root);

function step(n: number, text: string) {
  console.log(`→ ${n}/5 ${text}`);
}

step(1, "generating the Prisma client");
await $`${process.execPath} --bun prisma generate`
  .cwd(join(root, "packages/db"))
  .quiet();

step(2, "compiling apps/api for linux-x64");
await $`${process.execPath} build apps/api/src/index.ts --compile --minify --sourcemap --target=bun-linux-x64 --outfile ${binary}`;

if (dryRun) {
  console.log(
    `\n(dry run) would upload ${binary} to ${host}:${appDir} and reload pm2`,
  );
  process.exit(0);
}

step(3, `checking the server has ${appDir}/.env`);
const hasEnv =
  await $`ssh ${ssh} ${host} ${`mkdir -p ${appDir} && test -f ${appDir}/.env`}`
    .nothrow()
    .quiet();
if (hasEnv.exitCode !== 0) {
  console.error(`✗ ${appDir}/.env is missing on the server (or SSH failed).`);
  console.error(
    "  Create it from apps/api/.env.example with production values, then rerun.",
  );
  if (hasEnv.stderr.length) console.error(hasEnv.stderr.toString());
  process.exit(1);
}

step(4, "uploading");
await $`scp ${ssh} ${binary} ${`${host}:${appDir}/busapi.new`}`;
await $`scp ${ssh} scripts/deploy/ecosystem.config.cjs ${`${host}:${appDir}/ecosystem.config.cjs`}`;

step(5, "swapping the binary and reloading pm2");
const remote = `set -e
cd ${appDir}
chmod +x busapi.new && mv busapi.new busapi
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save > /dev/null
PORT=$(grep -E '^PORT=' .env | cut -d= -f2); PORT=\${PORT:-4000}
for i in $(seq 1 15); do curl -fs localhost:$PORT/health > /dev/null 2>&1 && break; sleep 1; done
if curl -fsS localhost:$PORT/health > /dev/null; then echo "✓ busapi healthy on :$PORT"; else pm2 logs busapi --lines 30 --nostream; exit 1; fi`;
await $`ssh ${ssh} ${host} ${remote}`;
