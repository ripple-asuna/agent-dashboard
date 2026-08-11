import { App, Platform } from 'obsidian';
import type { CompactListItem, TodayFeedItem } from '../data/dashboardData';
import type { AgentDashboardSettings } from '../settings/AgentDashboardSettings';
import { VaultActionService } from './VaultActionService';

const MAX_OUTPUT_LENGTH = 1_000_000;
const AGENT_TIMEOUT_MS = 5 * 60 * 1000;
export class AgentRunner {
	private readonly runs: CompactListItem[] = [];

	constructor(
		private readonly app: App,
		private readonly vaultActions: VaultActionService,
		private readonly settings: AgentDashboardSettings,
	) {}

	getRuns(): CompactListItem[] {
		return this.runs.slice(0, 8);
	}

	async runDeepResearch(feeds: TodayFeedItem[]): Promise<void> {
		if (!Platform.isDesktop) {
			throw new Error('Codex tasks are available only in Obsidian desktop.');
		}
		if (feeds.length === 0) {
			throw new Error(
				'Wait for the 08:00 Today feeds automation before running deep research.',
			);
		}
		const run: CompactListItem = {
			title: 'Deep research',
			detail: `${feeds.length} feed signals · Codex`,
			meta: 'Running',
			status: 'running',
		};
		this.runs.unshift(run);
		const startedAt = Date.now();
		try {
			const output = await this.executeCodex(this.buildPrompt(feeds));
			const elapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
			await this.vaultActions.writeAgentReport(
				`---\ntype: deep-research\ncreated: ${new Date().toISOString()}\nsource: agent-dashboard\n---\n\n${output}`,
			);
			run.detail = `${elapsed}s · report saved`;
			run.meta = 'Complete';
			run.status = 'complete';
		} catch (error) {
			run.detail = error instanceof Error ? error.message : 'Unknown Codex error';
			run.meta = 'Failed';
			run.status = 'failed';
			throw error;
		}
	}

	private buildPrompt(feeds: TodayFeedItem[]): string {
		const signals = feeds
			.map(
				(item, index) =>
					`${index + 1}. [${item.source}] ${item.title}\n   ${item.detail}\n   ${item.url}`,
			)
			.join('\n');
		return [
			'You are preparing a concise research brief for an Obsidian user.',
			'Analyze only the supplied feed metadata. Do not browse, run commands, or modify files.',
			'Identify the most important AI-agent, biology, and physics developments.',
			'Return Markdown with: Executive summary, Key signals, Cross-domain connections, and Follow-up questions.',
			'Preserve source URLs as Markdown links. Clearly label uncertainty.',
			'',
			'Signals:',
			signals,
		].join('\n');
	}

	private async executeCodex(prompt: string): Promise<string> {
		if (!Platform.isDesktop) {
			throw new Error('Codex tasks are available only in Obsidian desktop.');
		}
		const { spawn } = await import('node:child_process');
		return new Promise<string>((resolve, reject) => {
			const child = spawn(
				this.settings.codexCommand,
				[
					'exec',
					'--sandbox',
					'read-only',
					'--ephemeral',
					'--color',
					'never',
					prompt,
				],
				{ stdio: ['ignore', 'pipe', 'pipe'] },
			);
			let stdout = '';
			let stderr = '';
			let settled = false;
			const viewWindow = this.app.workspace.containerEl.ownerDocument.defaultView;
			const timeout = viewWindow?.setTimeout(() => {
				if (settled) return;
				settled = true;
				child.kill('SIGTERM');
				reject(new Error('Codex task timed out after five minutes.'));
			}, AGENT_TIMEOUT_MS);
			child.stdout.setEncoding('utf8');
			child.stderr.setEncoding('utf8');
			child.stdout.on('data', (chunk: string) => {
				if (stdout.length < MAX_OUTPUT_LENGTH) stdout += chunk;
			});
			child.stderr.on('data', (chunk: string) => {
				if (stderr.length < MAX_OUTPUT_LENGTH) stderr += chunk;
			});
			child.once('error', (error) => {
				if (settled) return;
				settled = true;
				if (timeout !== undefined) viewWindow?.clearTimeout(timeout);
				reject(
					new Error(
						error.message.includes('ENOENT')
							? `Codex CLI was not found at ${this.settings.codexCommand}.`
							: error.message,
					),
				);
			});
			child.once('close', (code) => {
				if (settled) return;
				settled = true;
				if (timeout !== undefined) viewWindow?.clearTimeout(timeout);
				if (code === 0 && stdout.trim()) resolve(stdout.trim());
				else reject(new Error(stderr.trim() || `Codex exited with code ${code}.`));
			});
		});
	}
}
