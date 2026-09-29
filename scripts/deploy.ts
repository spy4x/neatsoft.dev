/**
 * Deploys the site to the cloud server: rsync the served files, then
 * `docker compose up -d`. nginx serves `site/` from a bind mount, so a
 * content-only change is live as soon as rsync finishes; compose recreates the
 * container only when `compose.yml` changed.
 *
 * Refuses to run from a dirty tree or from any branch but `main`, so what is
 * live is always a reviewed, merged commit.
 */

const SERVER = "cloudlab"
const REMOTE_PATH = "~/cloudlab/apps/neatsoft.dev/"
const FILES = ["compose.yml", "nginx.conf", "site"]

async function run(cmd: string, args: string[]): Promise<string> {
  const out = await new Deno.Command(cmd, { args, stderr: "inherit" }).output()
  if (!out.success) throw new Error(`${cmd} ${args.join(" ")} exited with ${out.code}`)
  return new TextDecoder().decode(out.stdout).trim()
}

const branch = await run("git", ["rev-parse", "--abbrev-ref", "HEAD"])
const dirty = await run("git", ["status", "--porcelain"])
if (branch !== "main" || dirty) {
  console.error(`Deploy runs only from a clean main (branch: ${branch}, dirty: ${Boolean(dirty)})`)
  Deno.exit(1)
}

await run("ssh", [SERVER, `mkdir -p ${REMOTE_PATH}`])
console.log(
  await run("rsync", [
    "-az",
    "--delete",
    "--itemize-changes",
    ...FILES,
    `${SERVER}:${REMOTE_PATH}`,
  ]),
)
console.log(
  await run("ssh", [SERVER, `cd ${REMOTE_PATH} && docker compose up -d --remove-orphans`]),
)
console.log("Deployed https://neatsoft.dev")
