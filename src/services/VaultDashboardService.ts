import { App, getAllTags, normalizePath, TFile } from 'obsidian';
import {
	DASHBOARD_PATHS,
	type CompactListItem,
	type DashboardData,
	type DashboardProject,
	type DashboardTask,
	type FeedCache,
	type HeatmapDay,
	type TodayFeedItem,
	type TrendItem,
} from '../data/dashboardData';
import type { AgentDashboardSettings } from '../settings/AgentDashboardSettings';

const DAY_MS = 86_400_000;
const TASK_PATTERN = /^\s*-\s+\[([ xX/-])\]\s+(.+)$/;
const DATE_PATTERN = /(?:📅|⏳)\s*(\d{4}-\d{2}-\d{2})/g;

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function localDateKey(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function relativeTime(timestamp: number, now: number): string {
	const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
	if (minutes < 1) return 'Now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return 'Yesterday';
	return `${days}d ago`;
}

function numberValue(value: unknown, fallback = 0): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value.replace('%', ''));
		if (Number.isFinite(parsed)) return parsed;
	}
	return fallback;
}

function stringValue(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is string => typeof item === 'string');
	}
	if (typeof value === 'string') {
		return value
			.split(/[ ,]+/)
			.map((item) => item.replace(/^#/, '').trim())
			.filter(Boolean);
	}
	return [];
}

export class VaultDashboardService {
	constructor(
		private readonly app: App,
		private readonly settings: AgentDashboardSettings,
	) {}

	async load(
		feedCache: FeedCache,
		agentRuns: CompactListItem[],
	): Promise<DashboardData> {
		const now = Date.now();
		const today = localDateKey(new Date(now));
		const files = this.app.vault.getMarkdownFiles();
		const fileContents = await Promise.all(
			files.map(async (file) => ({
				file,
				content: await this.app.vault.cachedRead(file),
			})),
		);
		const tasks = this.collectTasks(fileContents, today);
		const todayTasks = tasks.filter((task) => task.due === today);
		const overdue = tasks.filter(
			(task) => task.status !== 'done' && task.due < today,
		).length;
		const inboxFiles = files.filter((file) =>
			file.path.startsWith(`${DASHBOARD_PATHS.inboxFolder}/`),
		);
		const metadataFiles = files.filter(
			(file) => this.app.metadataCache.getFileCache(file)?.frontmatter,
		);
		const missingFrontmatter = files.filter(
			(file) => !this.app.metadataCache.getFileCache(file)?.frontmatter,
		);
		const linkStats = this.calculateLinkStats(files);
		const metadataCoverage = files.length
			? Math.round((metadataFiles.length / files.length) * 100)
			: 100;
		const inboxHealth = Math.max(0, 100 - inboxFiles.length * 3);
		const health = Math.round(
			linkStats.integrity * 0.45 + metadataCoverage * 0.35 + inboxHealth * 0.2,
		);
		const completedToday = todayTasks.filter(
			(task) => task.status === 'done',
		).length;
		const taskFlow = todayTasks.length
			? Math.round((completedToday / todayTasks.length) * 100)
			: 100;
		const oldestInbox = inboxFiles.length
			? Math.max(
					...inboxFiles.map((file) =>
						Math.floor((now - file.stat.ctime) / DAY_MS),
					),
				)
			: 0;
		const allFeeds = this.combineFeeds(feedCache);
		const feedAutomationRuns: CompactListItem[] = feedCache.runs
			.slice(0, 8)
			.map((run) => {
				const timestamp = Date.parse(run.completedAt ?? run.startedAt);
				const detail =
					run.status === 'complete'
						? `${run.githubCount} GitHub projects · ${run.articleCount} journal articles`
						: run.message;
				return {
					title:
						run.trigger === 'scheduled'
							? 'Today feeds · 08:00 automation'
							: 'Today feeds · manual run',
					detail,
					meta: Number.isFinite(timestamp)
						? relativeTime(timestamp, now)
						: 'Recent',
					status: run.status,
				};
			});
		const persistedRuns: CompactListItem[] = files
			.filter((file) =>
				file.path.startsWith(`${DASHBOARD_PATHS.reportsFolder}/deep-research-`),
			)
			.slice()
			.sort((left, right) => right.stat.mtime - left.stat.mtime)
			.slice(0, 6)
			.map((file) => ({
				title: 'Deep research',
				detail: file.path,
				meta: relativeTime(file.stat.mtime, now),
				status: 'complete',
			}));
		const visibleAgentRuns = [
			...feedAutomationRuns,
			...agentRuns,
			...persistedRuns,
		].slice(0, 8);

		return {
			syncTime: new Date(now).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
			}),
			agentsReady: visibleAgentRuns.some((run) => run.status === 'running') ? 0 : 1,
			metrics: {
				health: { value: health, delta: `${files.length} notes scanned` },
				inbox: {
					value: inboxFiles.length,
					oldestDays: oldestInbox,
					needsRouting: inboxFiles.length,
				},
				taskFlow: {
					value: taskFlow,
					today: todayTasks.length,
					overdue,
				},
			},
			diagnostics: {
				linkIntegrity: linkStats.integrity,
				metadataCoverage,
				brokenLinks: linkStats.broken.length,
				orphanNotes: linkStats.orphans.length,
				missingFrontmatter: missingFrontmatter.length,
			},
			heatmap: this.buildHeatmap(files, now),
			tasks: todayTasks.slice(0, 5),
			recentNotes: files
				.slice()
				.sort((left, right) => right.stat.mtime - left.stat.mtime)
				.slice(0, 5)
				.map((file) => ({
					title: file.basename,
					detail: file.path,
					meta: relativeTime(file.stat.mtime, now),
				})),
			agentRuns: visibleAgentRuns,
			projects: this.collectProjects(files),
			vaultAudit: {
				inbox: inboxFiles.slice(0, 30).map((file) => ({
					title: file.basename,
					detail: file.path,
					meta: `${Math.max(0, Math.floor((now - file.stat.ctime) / DAY_MS))}d`,
				})),
				orphans: linkStats.orphans.slice(0, 5),
				frontmatter: missingFrontmatter.slice(0, 30).map((file) => ({
					title: file.basename,
					detail: file.path,
					meta: 'Missing',
				})),
				broken: linkStats.broken.slice(0, 30),
			},
			researchFunnel: this.buildFunnel(feedCache, files),
			sourceMix: this.buildSourceMix(allFeeds),
			trends: this.buildTrends(allFeeds),
			todayFeeds: allFeeds.slice(0, 5),
		};
	}

	private collectTasks(
		files: Array<{ file: TFile; content: string }>,
		today: string,
	): DashboardTask[] {
		const tasks: DashboardTask[] = [];
		for (const { file, content } of files) {
			const dailyPath = normalizePath(
				`${this.settings.dailyFolder}/${today}.md`,
			);
			for (const [lineIndex, line] of content.split('\n').entries()) {
				const match = TASK_PATTERN.exec(line);
				if (!match) continue;
				const marker = match[1] ?? ' ';
				const rawTitle = match[2] ?? '';
				const dates = Array.from(rawTitle.matchAll(DATE_PATTERN), (item) => item[1]);
				const due = dates.find((date): date is string => Boolean(date));
				if (!due && file.path !== dailyPath) continue;
				const title = rawTitle
					.replace(DATE_PATTERN, '')
					.replace(/[⏫🔼🔽]/gu, '')
					.trim();
				const status: DashboardTask['status'] = /[xX]/.test(marker)
					? 'done'
					: marker === '/' || marker === '-'
						? 'doing'
						: 'todo';
				const priority: DashboardTask['priority'] = rawTitle.includes('⏫')
					? 'high'
					: rawTitle.includes('🔽')
						? 'low'
						: 'normal';
				tasks.push({
					id: `${file.path}:${lineIndex}`,
					title: title || 'Untitled task',
					context: file.basename,
					status,
					priority,
					due: due ?? today,
					path: file.path,
					line: lineIndex,
				});
			}
		}
		return tasks.slice().sort((left, right) => {
			if (left.status === right.status) return left.due.localeCompare(right.due);
			if (left.status === 'done') return 1;
			if (right.status === 'done') return -1;
			return left.status === 'doing' ? -1 : 1;
		});
	}

	private calculateLinkStats(files: TFile[]): {
		integrity: number;
		broken: CompactListItem[];
		orphans: CompactListItem[];
	} {
		const resolved = this.app.metadataCache.resolvedLinks;
		const unresolved = this.app.metadataCache.unresolvedLinks;
		let resolvedCount = 0;
		let brokenCount = 0;
		const incoming = new Map<string, number>();
		const broken: CompactListItem[] = [];
		const sources = new Set([...Object.keys(resolved), ...Object.keys(unresolved)]);
		for (const source of sources) {
			const destinations = resolved[source] ?? {};
			for (const [destination, count] of Object.entries(destinations)) {
				resolvedCount += count;
				incoming.set(destination, (incoming.get(destination) ?? 0) + count);
			}
			for (const [destination, count] of Object.entries(unresolved[source] ?? {})) {
				brokenCount += count;
				broken.push({
					title: source.replace(/\.md$/i, ''),
					detail: `[[${destination}]]`,
					meta: `${count} broken`,
				});
			}
		}
		const totalLinks = resolvedCount + brokenCount;
		const integrity = totalLinks
			? Math.round((resolvedCount / totalLinks) * 100)
			: 100;
		const orphans = files
			.filter((file) => (incoming.get(file.path) ?? 0) === 0)
			.map((file) => {
				const outgoing = Object.values(resolved[file.path] ?? {}).reduce(
					(sum, count) => sum + count,
					0,
				);
				return {
					title: file.basename,
					detail: `0 incoming · ${outgoing} outgoing`,
					meta: '0 links',
				};
			});
		return { integrity, broken, orphans };
	}

	private buildHeatmap(files: TFile[], now: number): DashboardData['heatmap'] {
		const today = startOfLocalDay(new Date(now));
		const rangeStart = addDays(today, -364);
		const graphStart = addDays(rangeStart, -rangeStart.getDay());
		const counts = new Map<string, number>();
		for (const file of files) {
			const key = localDateKey(new Date(file.stat.ctime));
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		const days: HeatmapDay[] = [];
		for (let index = 0; index < 53 * 7; index += 1) {
			const date = addDays(graphStart, index);
			const key = localDateKey(date);
			const count = date > today ? 0 : (counts.get(key) ?? 0);
			days.push({ date: key, count, level: 0 });
		}
		const maxCount = Math.max(1, ...days.map((day) => day.count));
		for (const day of days) {
			day.level = day.count === 0 ? 0 : Math.max(1, Math.ceil((day.count / maxCount) * 4));
		}
		const months: string[] = [];
		for (let index = 0; index < 12; index += 1) {
			const date = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + index, 1);
			months.push(date.toLocaleDateString('en', { month: 'short' }));
		}
		return {
			activeDays: days.filter((day) => day.count > 0).length,
			dateRange: `${rangeStart.toLocaleDateString('en', { month: 'short', year: 'numeric' })}–${today.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`,
			months,
			days,
		};
	}

	private collectProjects(files: TFile[]): DashboardProject[] {
		return files
			.filter((file) => file.path.startsWith(`${this.settings.projectsFolder}/`))
			.filter((file) => {
				const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
				return (
					stringValue(frontmatter?.type, '') === 'project' &&
					stringValue(frontmatter?.status, '') === this.settings.inProgressStatus
				);
			})
			.map((file) => {
				const cache = this.app.metadataCache.getFileCache(file);
				const frontmatter = cache?.frontmatter;
				return {
					status: stringValue(
						frontmatter?.status,
						this.settings.inProgressStatus,
					),
					name: stringValue(frontmatter?.name, file.basename),
					progress: Math.min(100, Math.max(0, numberValue(frontmatter?.progress))),
					due: stringValue(frontmatter?.due, '—'),
					path: file.path,
					tags: stringList(frontmatter?.tags).length
						? stringList(frontmatter?.tags)
						: (cache ? (getAllTags(cache) ?? []) : [])
								.map((tag) => tag.replace(/^#/, ''))
								.slice(0, 3),
				};
			})
			.slice(0, 12);
	}

	private combineFeeds(cache: FeedCache): TodayFeedItem[] {
		const github = cache.github
			.slice()
			.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
			.slice(0, 2);
		const sortedArticles = cache.articles
			.slice()
			.sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
		const biology = sortedArticles.find((item) => item.source === 'Cell');
		const physics = sortedArticles.find((item) => item.source === 'PRL');
		const general = sortedArticles.find(
			(item) => item.source === 'Nature' || item.source === 'Science',
		);
		const articles = [biology, physics, general].filter(
			(item): item is TodayFeedItem => item !== undefined,
		);
		return [...github, ...articles];
	}

	private buildFunnel(cache: FeedCache, files: TFile[]): DashboardData['researchFunnel'] {
		const fetched = cache.github.length + cache.articles.length;
		const filtered = Math.min(5, fetched);
		const reports = files.filter((file) =>
			file.path.startsWith(`${DASHBOARD_PATHS.reportsFolder}/deep-research-`),
		).length;
		return [
			{ label: 'Fetched', value: fetched, width: fetched ? 100 : 0 },
			{ label: 'Filtered', value: filtered, width: fetched ? Math.round((filtered / fetched) * 100) : 0 },
			{ label: 'Briefed', value: reports, width: fetched ? Math.min(100, Math.round((reports / fetched) * 100)) : 0 },
			{ label: 'Saved', value: cache.articles.length, width: fetched ? Math.round((cache.articles.length / fetched) * 100) : 0 },
		];
	}

	private buildSourceMix(items: TodayFeedItem[]): DashboardData['sourceMix'] {
		const counts = new Map<string, number>();
		for (const item of items) counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
		const total = Math.max(1, items.length);
		return Array.from(counts, ([label, count]) => ({
			label,
			count,
			percent: Math.round((count / total) * 100),
		}));
	}

	private buildTrends(items: TodayFeedItem[]): TrendItem[] {
		const categories = [
			{ title: 'AI agents', pattern: /agent|llm|model|artificial intelligence|machine learning/i },
			{ title: 'Biology', pattern: /cell|gene|protein|cancer|brain|biology/i },
			{ title: 'Physics', pattern: /physics|quantum|particle|matter|energy/i },
			{ title: 'Quantum systems', pattern: /quantum|qubit|entangl/i },
			{ title: 'Neuroscience', pattern: /brain|neuro|cortex|synap/i },
			{ title: 'Climate science', pattern: /climate|atmosphere|ocean|carbon/i },
		];
		const maxCount = Math.max(
			1,
			...categories.map(
				(category) => items.filter((item) => category.pattern.test(item.title)).length,
			),
		);
		return categories.map((category) => {
			const count = items.filter((item) => category.pattern.test(item.title)).length;
			return {
				title: category.title,
				note: `${count} cached signal${count === 1 ? '' : 's'}`,
				score: Math.round((count / maxCount) * 100),
			};
		});
	}
}
