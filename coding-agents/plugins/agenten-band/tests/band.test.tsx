import { expect, mock, test } from 'claude-code/testing'
import type { AgentInfo } from 'claude-code'

const BAND = {
  plugin: 'agenten-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: true,
    maxRows: 10,
    bodyColumns: 60,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const agent = (id: string, status: AgentInfo['status']): AgentInfo =>
  ({ id, status, description: id, type: 'general-purpose' })

test('shows running, then finished agents, and nothing after the next prompt', async ($, on) => {
  let list: AgentInfo[] = [agent('a', 'running'), agent('b', 'running'), agent('c', 'completed')]
  on('agent.list', () => ({ value: list }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  const clock = mock.clock(on)
  // Stands in for the app's empty band when the mod shows nothing
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>leer</Text>
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /laufen/ }))?.text).toBe('2 Agenten laufen · 1 fertig')
    await ui.unmount()
  }

  // Without a new prompt the band follows the agents on its own
  list = [agent('a', 'completed'), agent('b', 'running'), agent('c', 'completed')]
  await clock.advance(1000)
  const live = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await live.find({ type: 'Text', text: /läuft/ }))?.text).toBe('1 Agent läuft · 2 fertig')
  await live.unmount()

  list = [agent('a', 'completed'), agent('b', 'completed'), agent('c', 'completed')]
  await $.prompt.submit({ text: 'weiter', wait: false, origin: { kind: 'composer' } })
  // a and c were already reported, only b is newly done; Claude is idle
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, isWorking: false } })
  expect((await ui.find({ type: 'Text', text: /fertig/ }))?.text).toBe(' · Agent fertig')
  await ui.unmount()

  await $.prompt.submit({ text: 'danke', wait: false, origin: { kind: 'composer' } })
  const empty = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await empty.find({ type: 'Text' }))?.text).toBe('leer')
  await empty.unmount()

  // Claude is idle: green frame
  for (const surface of ['terminal', 'desktop'] as const) {
    const idle = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, isWorking: false } })
    expect((await idle.find({ type: 'Text', text: /Bereit/ }))?.text).toBe('✓ Bereit')
    await idle.unmount()
  }
})
