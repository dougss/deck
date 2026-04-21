// node-pty ships prebuilt binaries including `spawn-helper`. pnpm loses the
// executable bit when linking from its content-addressable store, which
// makes pty.fork() fail at runtime with `posix_spawnp failed`. This script
// restores +x on every platform/arch dir that ships the helper.
// Safe to run on Linux/Windows: globs that match nothing are skipped.

const { chmodSync, constants, existsSync, readdirSync, statSync } = require('node:fs')
const { join } = require('node:path')

const PREBUILDS = join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds')

if (!existsSync(PREBUILDS)) {
  process.exit(0)
}

let fixed = 0
for (const dir of readdirSync(PREBUILDS)) {
  const helper = join(PREBUILDS, dir, 'spawn-helper')
  if (!existsSync(helper)) continue
  const mode = statSync(helper).mode
  const withExec = mode | constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH
  if (mode !== withExec) {
    chmodSync(helper, withExec)
    fixed += 1
  }
}

if (fixed > 0) {
  console.log(`[postinstall-chmod] restored +x on ${fixed} spawn-helper binary(ies)`)
}
