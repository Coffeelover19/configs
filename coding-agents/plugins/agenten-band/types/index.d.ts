export type Summary = { running: number; done: number; failed: number }

declare module 'claude-code' {
  interface PluginState {
    'agenten-band': { summary: Summary | null }
  }
}
