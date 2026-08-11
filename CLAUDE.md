# Agent Dashboard development rules

- This is an Obsidian community plugin written in TypeScript. It is not an Obsidian Vault.
- The plugin ID is `agent-dashboard`, the display name is `Agent Dashboard`, and the version is `0.1.0`.
- Common commands: `npm install`, `npm run dev`, `npm run build`, and `npm run lint`.
- The final Obsidian plugin directory only needs `main.js`, `manifest.json`, and `styles.css`.
- Prefer Obsidian's documented public APIs; do not depend on undocumented internal APIs.
- Keep the first release minimal, testable, and easy to iterate on.
- Do not add production dependencies without a clear need and prior explanation.
- Before network requests, telemetry, cloud sync, file deletion, or modifying a real Vault, explain the action and wait for confirmation.
- For dashboard UI work, consult the `frontend-design` skill first.
- For Obsidian APIs, lifecycle, manifest, security, accessibility, and plugin review rules, consult the `obsidian-plugin-skill` skill first.
- Never commit API keys, tokens, local Vault paths, or private data.
- Do not create a Git remote, publish the repository, or run `git commit` unless explicitly requested.
- Before broad changes, explain the goal, affected files, and smallest viable implementation.
- After code changes, run the build and, when available, lint; finish with a summary of changes and verification.
