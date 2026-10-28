# agenten-band

A Claude Code mod that draws a subtle one-line band above the prompt:

- while agents run: `● 2 Agenten laufen · 1 fertig`
- while Claude works without agents: nothing
- once Claude and all agents are done: a green frame with `✓ Bereit`, plus
  `Alle N Agenten fertig` until the next prompt

The band only shows where a surface draws it: a terminal session or a local
session of the desktop app. Cloud sessions have no surface attached.

Install (terminal session):

```
/plugin install agenten-band --marketplace Coffeelover19/configs
```

Desktop app: + next to the prompt box → Plugins → Add marketplace
`Coffeelover19/configs` → Add plugin.

Check and test from this folder: `claude plugin validate .` and `claude plugin test .`.
