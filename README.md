# Agent Dashboard

Agent Dashboard is an Obsidian community plugin for monitoring a working Vault, daily tasks, active projects, agent runs, and research feeds from one local control surface.

## Features

- Vault health, inbox, task-flow, and note-creation activity summaries.
- Today tasks with persistent `TODO`, `DOING`, and `DONE` states.
- Project tracking filtered by a configurable folder and frontmatter status.
- Daily GitHub, biology, and physics feed archives.
- A scheduled Today feeds automation with persistent run history.
- Daily-note creation from a configurable Obsidian template.
- Optional Codex CLI deep-research reports on desktop.
- Vault lint reports, inbox capture, and direct links to generated notes.

## Requirements

- Obsidian 1.8.0 or later.
- Desktop Obsidian is required only for the optional Codex CLI deep-research action.
- Codex CLI must be installed and authenticated separately before deep research can run.

## Installation

### Community plugins

After the plugin is accepted into the Obsidian community directory:

1. Open **Settings → Community plugins**.
2. Select **Browse** and search for **Agent Dashboard**.
3. Install and enable the plugin.

### Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from the matching GitHub release. Copy them into:

```text
<Vault>/.obsidian/plugins/agent-dashboard/
```

Reload Obsidian and enable **Agent Dashboard** under **Settings → Community plugins**.

## Settings

Agent Dashboard adds a dedicated settings page with these options:

| Setting | Default |
| --- | --- |
| Daily folder | `90-Journal/Daily` |
| Daily template | `99-System/Templates/每日笔记模板.md` |
| Projects folder | `10-Projects` |
| In-progress project status | `进行中` |
| Feed archive folder | `90-Journal/Feeds` |
| Today feeds hour | `08:00` local time |
| Codex command | Bundled ChatGPT path on macOS; `codex` elsewhere |

Vault paths always use forward slashes, including on Windows.

## Today feeds automation

Once per day at the configured local hour, the plugin requests:

- GitHub repository search results for popular AI-agent projects.
- RSS feeds from Nature, Science, Cell, and Physical Review Letters.

The complete response metadata and available feed summaries are cached locally and written to a dated Markdown archive. The dashboard shows five current signals. If Obsidian is closed at the scheduled time, the automation runs after the next launch on the same day.

## Deep research

Deep research is optional. On desktop it starts the configured Codex CLI executable with a read-only, ephemeral command and sends the five visible feed signals as its prompt. The resulting Markdown report is saved inside the Vault.

On Windows, install Codex CLI and either make `codex` available on `PATH` or set an absolute executable path in the plugin settings.

## Privacy and network access

- Vault scanning, task updates, project tracking, and generated Markdown files stay local.
- Today feeds makes network requests only to GitHub and the configured journal RSS endpoints.
- Deep research sends the selected feed metadata to the separately installed Codex CLI.
- The plugin does not include telemetry, advertising, cloud sync, or bundled API keys.
- Feed archives and reports may contain titles, summaries, and URLs returned by external services.

## Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

The plugin release consists of `main.js`, `manifest.json`, and `styles.css`.

## License

[0BSD](LICENSE)
