import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { Summary } from '../types'

const summary = atom({ plugin: 'agenten-band', key: 'summary' } as const, null)

const RUNNING = new Set(['pending', 'running', 'waiting'])
const FAILED = new Set(['failed', 'killed'])

const plural = (n: number) => (n === 1 ? 'Agent' : 'Agenten')

// Finished agents already reported: hidden from the next prompt on.
const seen = new Set<string>()
let agents: AgentInfo[] = []

async function refresh($: EngineInterface) {
  agents = (await $.agent.list()).filter(a => !seen.has(a.id))
  const next: Summary | null = agents.length === 0 ? null : {
    running: agents.filter(a => RUNNING.has(a.status)).length,
    done: agents.filter(a => a.status === 'completed').length,
    failed: agents.filter(a => FAILED.has(a.status)).length,
  }
  const prev = await read($, summary)
  if (JSON.stringify(prev) !== JSON.stringify(next)) {
    await update($, summary, () => next)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.clock.every(1000, () => void refresh($))
    await refresh($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    for (const a of agents) {
      if (!RUNNING.has(a.status)) seen.add(a.id)
    }
    await refresh($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, summary)

    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    if (s !== null && s.running > 0) {
      return (
        <Box>
          <Text color="claude">● </Text>
          <Text dimColor>
            {s.running} {plural(s.running)} {s.running === 1 ? 'läuft' : 'laufen'}
            {s.done > 0 ? ` · ${s.done} fertig` : ''}
          </Text>
        </Box>
      )
    }

    // Claude is working without agents: show nothing
    if (e.props.isWorking) {
      return next(e)
    }

    // Everything done: green frame
    const finished = s === null ? 0 : s.done + s.failed

    return (
      <Box borderStyle="round" borderColor="success" paddingX={1}>
        <Text color="success">✓ Bereit</Text>
        <Text dimColor>
          {finished === 0 ? '' : finished === 1 ? ' · Agent fertig' : ` · Alle ${finished} Agenten fertig`}
          {s !== null && s.failed > 0 ? ` · ${s.failed} abgebrochen` : ''}
        </Text>
      </Box>
    )
  })
}
