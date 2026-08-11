import { App, moment, normalizePath, TFile, TFolder } from 'obsidian';
import {
	DASHBOARD_PATHS,
	type DashboardData,
	type DashboardTask,
	type FeedCache,
	type TaskStatus,
	type TodayFeedItem,
} from '../data/dashboardData';
import type { AgentDashboardSettings } from '../settings/AgentDashboardSettings';

const LEGACY_TODAY_FEEDS_START = '<!-- agent-dashboard:today-feeds:start -->';
const LEGACY_TODAY_FEEDS_END = '<!-- agent-dashboard:today-feeds:end -->';
const FEED_ARCHIVE_LINK_START = '<!-- agent-dashboard:feed-archive:start -->';
const FEED_ARCHIVE_LINK_END = '<!-- agent-dashboard:feed-archive:end -->';

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function localDateKey(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function safeFileName(value: string): string {
	return value
		.replace(/[\\/:*?"<>|#[\]]/g, '-')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 80);
}

function markdownText(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\[/g, '\\[')
		.replace(/\]/g, '\\]')
		.replace(/\s+/g, ' ')
		.trim();
}

export class VaultActionService {
	constructor(
		private readonly app: App,
		private readonly settings: AgentDashboardSettings,
	) {}

	async createDailyNote(): Promise<TFile> {
		const today = localDateKey(new Date());
		const path = normalizePath(`${this.settings.dailyFolder}/${today}.md`);
		const existing = this.app.vault.getAbstractFileByPath(path);
		if (existing instanceof TFile) {
			await this.app.workspace.getLeaf('tab').openFile(existing);
			return existing;
		}
		const template = this.app.vault.getAbstractFileByPath(
			normalizePath(this.settings.dailyTemplate),
		);
		if (!(template instanceof TFile)) {
			throw new Error(`Daily template not found: ${this.settings.dailyTemplate}`);
		}
		await this.ensureFolder(this.settings.dailyFolder);
		const templateContent = await this.app.vault.cachedRead(template);
		const file = await this.app.vault.create(
			path,
			this.renderDailyTemplate(templateContent, new Date()),
		);
		await this.app.workspace.getLeaf('tab').openFile(file);
		return file;
	}

	private renderDailyTemplate(template: string, date: Date): string {
		const timestamp = moment(date);
		return template
			.replace(/\{\{date(?::([^}]+))?\}\}/g, (_token, format?: string) =>
				timestamp.format(format ?? 'YYYY-MM-DD'),
			)
			.replace(/\{\{time(?::([^}]+))?\}\}/g, (_token, format?: string) =>
				timestamp.format(format ?? 'HH:mm'),
			)
			.replace(/\{\{title\}\}/g, localDateKey(date));
	}

	async openTodayFeedsArchive(): Promise<TFile> {
		const today = localDateKey(new Date());
		const path = normalizePath(
			`${this.settings.feedArchiveFolder}/${today.slice(0, 4)}/${today} - Agent Dashboard Feeds.md`,
		);
		const file = this.app.vault.getAbstractFileByPath(path);
		if (!(file instanceof TFile)) {
			throw new Error('Today’s feed archive is not available yet.');
		}
		await this.app.workspace.getLeaf('tab').openFile(file);
		return file;
	}

	async captureInbox(title: string, content: string): Promise<TFile> {
		const cleanTitle = safeFileName(title) || 'Inbox note';
		await this.ensureFolder(DASHBOARD_PATHS.inboxFolder);
		const baseName = `${localDateKey(new Date())}-${cleanTitle}`;
		const path = this.uniquePath(DASHBOARD_PATHS.inboxFolder, baseName);
		return this.app.vault.create(
			path,
			`---\nstatus: inbox\ncreated: ${new Date().toISOString()}\n---\n\n# ${cleanTitle}\n\n${content.trim()}\n`,
		);
	}

	async updateTaskStatus(
		task: DashboardTask,
		nextStatus: TaskStatus,
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(normalizePath(task.path));
		if (!(file instanceof TFile)) throw new Error(`Task file not found: ${task.path}`);
		await this.app.vault.process(file, (content) => {
			const lines = content.split('\n');
			const line = lines[task.line];
			if (line === undefined || !/^\s*-\s+\[[ xX/-]\]/.test(line)) {
				throw new Error('Task line changed. Refresh the dashboard and try again.');
			}
			const marker = nextStatus === 'done' ? 'x' : nextStatus === 'doing' ? '/' : ' ';
			lines[task.line] = line.replace(/\[[ xX/-]\]/, `[${marker}]`);
			return lines.join('\n');
		});
	}

	async writeTodayFeedsArchive(cache: FeedCache): Promise<TFile> {
		const parsedTimestamp = Date.parse(cache.updatedAt);
		const refreshedAt = Number.isFinite(parsedTimestamp)
			? new Date(parsedTimestamp)
			: new Date();
		const date = localDateKey(refreshedAt);
		const archivePath = normalizePath(
			`${this.settings.feedArchiveFolder}/${date.slice(0, 4)}/${date} - Agent Dashboard Feeds.md`,
		);
		const archive = await this.upsertText(
			archivePath,
			this.todayFeedsDocument(cache, refreshedAt, date),
		);
		await this.updateDailyFeedLink(date, archivePath);
		return archive;
	}

	async writeVaultLintReport(data: DashboardData): Promise<TFile> {
		const now = new Date();
		const path = normalizePath(`${DASHBOARD_PATHS.reportsFolder}/vault-lint.md`);
		const report = [
			'---',
			'type: vault-lint',
			`updated: ${now.toISOString()}`,
			'---',
			'',
			'# Vault lint report',
			'',
			`Generated: ${now.toLocaleString()}`,
			'',
			'## Summary',
			'',
			`- Vault health: ${data.metrics.health.value}/100`,
			`- Link integrity: ${data.diagnostics.linkIntegrity}%`,
			`- Metadata coverage: ${data.diagnostics.metadataCoverage}%`,
			`- Broken links: ${data.diagnostics.brokenLinks}`,
			`- Orphan notes: ${data.diagnostics.orphanNotes}`,
			`- Missing front matter: ${data.diagnostics.missingFrontmatter}`,
			`- Inbox backlog: ${data.metrics.inbox.value}`,
			'',
			'## Broken links',
			'',
			...this.reportItems(data.vaultAudit.broken),
			'',
			'## Orphan notes',
			'',
			...this.reportItems(data.vaultAudit.orphans),
			'',
			'## Missing front matter',
			'',
			...this.reportItems(data.vaultAudit.frontmatter),
			'',
		].join('\n');
		const file = await this.upsertText(path, report);
		await this.app.workspace.getLeaf('tab').openFile(file);
		return file;
	}

	async writeAgentReport(markdown: string): Promise<TFile> {
		const now = new Date();
		const stamp = `${localDateKey(now)}-${pad(now.getHours())}${pad(now.getMinutes())}`;
		const path = normalizePath(
			`${DASHBOARD_PATHS.reportsFolder}/deep-research-${stamp}.md`,
		);
		await this.ensureFolder(DASHBOARD_PATHS.reportsFolder);
		const file = await this.app.vault.create(path, markdown.trimEnd() + '\n');
		await this.app.workspace.getLeaf('tab').openFile(file);
		return file;
	}

	async upsertText(path: string, content: string): Promise<TFile> {
		const normalized = normalizePath(path);
		const folder = normalized.slice(0, Math.max(0, normalized.lastIndexOf('/')));
		if (folder) await this.ensureFolder(folder);
		const existing = this.app.vault.getAbstractFileByPath(normalized);
		if (existing instanceof TFile) {
			await this.app.vault.process(existing, () => content);
			return existing;
		}
		return this.app.vault.create(normalized, content);
	}

	private reportItems(items: Array<{ title: string; detail: string }>): string[] {
		return items.length
			? items.map((item) => `- **${item.title}** — ${item.detail}`)
			: ['- None found.'];
	}

	private todayFeedsDocument(
		cache: FeedCache,
		refreshedAt: Date,
		date: string,
	): string {
		const lines = [
			'---',
			'type: agent-dashboard-feeds',
			`date: ${date}`,
			`updated: ${refreshedAt.toISOString()}`,
			'source: agent-dashboard',
			'---',
			'',
			`# Agent Dashboard Feeds · ${date}`,
			'',
			`> [!info] Today feeds archive · Updated ${refreshedAt.toLocaleString()} · ${cache.github.length} GitHub projects · ${cache.articles.length} journal articles`,
			'',
			`- Daily note: [[${this.settings.dailyFolder}/${date}|${date}]]`,
			'',
			'## GitHub projects',
			'',
			...this.feedItems(cache.github),
		];
		const articlesBySource = new Map<string, TodayFeedItem[]>();
		for (const article of cache.articles) {
			const entries = articlesBySource.get(article.source) ?? [];
			entries.push(article);
			articlesBySource.set(article.source, entries);
		}
		for (const [source, articles] of articlesBySource) {
			lines.push(
				'',
				`## Journal · ${markdownText(source)}`,
				'',
				...this.feedItems(articles),
			);
		}
		return `${lines.join('\n')}\n`;
	}

	private feedItems(items: TodayFeedItem[]): string[] {
		if (items.length === 0) return ['_No items returned._'];
		return items.flatMap((item, index) => [
			`${index + 1}. [${markdownText(item.title)}](${item.url})`,
			`   - Published: ${markdownText(item.publishedAt)}`,
			`   - ${markdownText(item.detail)}`,
		]);
	}

	private async updateDailyFeedLink(
		date: string,
		archivePath: string,
	): Promise<void> {
		const dailyPath = normalizePath(`${this.settings.dailyFolder}/${date}.md`);
		const linkTarget = archivePath.replace(/\.md$/i, '');
		const linkBlock = [
			FEED_ARCHIVE_LINK_START,
			'## Agent Dashboard Feeds',
			'',
			`- [[${linkTarget}|Today Feeds · ${date}]] — complete GitHub and journal archive`,
			FEED_ARCHIVE_LINK_END,
		].join('\n');
		await this.ensureFolder(this.settings.dailyFolder);
		const existing = this.app.vault.getAbstractFileByPath(dailyPath);
		if (existing instanceof TFile) {
			await this.app.vault.process(existing, (content) => {
				const migrated = this.removeManagedBlock(
					content,
					LEGACY_TODAY_FEEDS_START,
					LEGACY_TODAY_FEEDS_END,
				);
				return this.upsertManagedBlock(
					migrated,
					FEED_ARCHIVE_LINK_START,
					FEED_ARCHIVE_LINK_END,
					linkBlock,
				);
			});
			return;
		}
		await this.app.vault.create(
			dailyPath,
			`---\ndate: ${date}\ntype: daily\n---\n\n# ${date}\n\n${linkBlock}\n`,
		);
	}

	private removeManagedBlock(
		content: string,
		startMarker: string,
		endMarker: string,
	): string {
		const start = content.indexOf(startMarker);
		const end = content.indexOf(endMarker);
		if (start === -1 && end === -1) return content;
		if (start === -1 || end < start) {
			throw new Error('An Agent Dashboard managed block has invalid markers.');
		}
		const after = end + endMarker.length;
		return `${content.slice(0, start).trimEnd()}\n\n${content.slice(after).trimStart()}`.trimEnd() + '\n';
	}

	private upsertManagedBlock(
		content: string,
		startMarker: string,
		endMarker: string,
		block: string,
	): string {
		const start = content.indexOf(startMarker);
		const end = content.indexOf(endMarker);
		if (start === -1 && end === -1) return `${content.trimEnd()}\n\n${block}\n`;
		if (start === -1 || end < start) {
			throw new Error('An Agent Dashboard managed block has invalid markers.');
		}
		const after = end + endMarker.length;
		return `${content.slice(0, start)}${block}${content.slice(after)}`;
	}

	private uniquePath(folder: string, baseName: string): string {
		let index = 0;
		while (true) {
			const suffix = index === 0 ? '' : `-${index + 1}`;
			const path = normalizePath(`${folder}/${baseName}${suffix}.md`);
			if (!this.app.vault.getAbstractFileByPath(path)) return path;
			index += 1;
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		const normalized = normalizePath(path);
		const segments = normalized.split('/').filter(Boolean);
		let current = '';
		for (const segment of segments) {
			current = current ? `${current}/${segment}` : segment;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (existing instanceof TFolder) continue;
			if (existing) throw new Error(`A file already exists at ${current}.`);
			await this.app.vault.createFolder(current);
		}
	}
}
