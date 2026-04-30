import { join } from 'node:path'
import { parseSshConfig } from './ssh-config-parser'
import type { SshHost } from './ssh-config-parser'

interface TestResult {
  name: string
  ok: boolean
  detail?: string
}

const results: TestResult[] = []

function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail })
}

function printResults(): void {
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗'
    const suffix = r.detail ? ` (${r.detail})` : ''
    console.log(`  ${icon} ${r.name}${suffix}`)
  }
  const passed = results.filter((r) => r.ok).length
  console.log(`\n  ${passed}/${results.length} passed`)
}

export async function runSshSmoke(): Promise<number> {
  // Fixture is at test/fixtures/ssh_config_sample relative to project root.
  // process.cwd() is the project root when run via pnpm smoke scripts.
  const fixturePath = join(process.cwd(), 'test/fixtures/ssh_config_sample')

  let hosts: SshHost[]
  try {
    hosts = parseSshConfig(fixturePath)
    check('parser reads fixture without throwing', true)
  } catch (err) {
    check('parser reads fixture without throwing', false, String(err))
    printResults()
    return 1
  }

  const aliases = hosts.map((h) => h.alias)

  check(
    'wildcard Host * excluded',
    !aliases.some((a) => a.includes('*') || a.includes('?')),
    `aliases: ${aliases.join(', ')}`
  )

  for (const expected of ['myserver', 'devbox', 'jump']) {
    check(`host '${expected}' present`, aliases.includes(expected))
  }

  // Multi-alias Host line: bastion prod-node-1 prod-node-2
  for (const expected of ['bastion', 'prod-node-1', 'prod-node-2']) {
    check(`multi-alias host '${expected}' present`, aliases.includes(expected))
  }

  const myserver = hosts.find((h) => h.alias === 'myserver')
  check('myserver hostname', myserver?.hostname === '192.168.1.100', `got: ${myserver?.hostname}`)
  check('myserver user', myserver?.user === 'admin', `got: ${myserver?.user}`)
  check('myserver port', myserver?.port === 2222, `got: ${myserver?.port}`)

  const devbox = hosts.find((h) => h.alias === 'devbox')
  check('devbox hostname', devbox?.hostname === 'dev.example.com', `got: ${devbox?.hostname}`)
  check('devbox user', devbox?.user === 'developer', `got: ${devbox?.user}`)
  check('devbox port null', devbox?.port === null, `got: ${devbox?.port}`)

  const jump = hosts.find((h) => h.alias === 'jump')
  check('jump hostname', jump?.hostname === 'jump.example.com', `got: ${jump?.hostname}`)
  check('jump user null', jump?.user === null, `got: ${jump?.user}`)

  printResults()
  return results.some((r) => !r.ok) ? 1 : 0
}
