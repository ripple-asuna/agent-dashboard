import { App, requestUrl, TFile } from 'obsidian';
import {
	DASHBOARD_PATHS,
	JOURNAL_FEEDS,
	type FeedCache,
	type FeedAutomationRun,
	type TodayFeedDay,
	type TodayFeedItem,
} from '../data/dashboardData';
import type { AgentDashboardSettings } from '../settings/AgentDashboardSettings';
import { VaultActionService } from './VaultActionService';

const EMPTY_CACHE: FeedCache = {
	version: 1,
	updatedAt: '',
	github: [],
	articles: [],
	days: [],
	runs: [],
};

interface GitHubRepository {
	full_name: string;
	description: string | null;
	html_url: string;
	stargazers_count: number;
	language: string | null;
	updated_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isGitHubRepository(value: unknown): value is GitHubRepository {
	return (
		isRecord(value) &&
		typeof value.full_name === 'string' &&
		(value.description === null || typeof value.description === 'string') &&
		typeof value.html_url === 'string' &&
		typeof value.stargazers_count === 'number' &&
		(value.language === null || typeof value.language === 'string') &&
		typeof value.updated_at === 'string'
	);
}

function isFeedItem(value: unknown): value is TodayFeedItem {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		(value.kind === 'github' || value.kind === 'journal') &&
		typeof value.source === 'string' &&
		typeof value.title === 'string' &&
		typeof value.detail === 'string' &&
		typeof value.meta === 'string' &&
		typeof value.url === 'string' &&
		typeof value.publishedAt === 'string'
	);
}

function isFeedDay(value: unknown): value is TodayFeedDay {
	return (
		isRecord(value) &&
		typeof value.date === 'string' &&
		typeof value.updatedAt === 'string' &&
		typeof value.path === 'string' &&
		typeof value.githubCount === 'number' &&
		typeof value.articleCount === 'number' &&
		Array.isArray(value.highlights) &&
		value.highlights.every((item) => typeof item === 'string')
	);
}

function isFeedAutomationRun(value: unknown): value is FeedAutomationRun {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		(value.trigger === 'scheduled' || value.trigger === 'manual') &&
		(value.status === 'running' ||
			value.status === 'complete' ||
			value.status === 'failed') &&
		typeof value.startedAt === 'string' &&
		(value.completedAt === undefined || typeof value.completedAt === 'string') &&
		typeof value.githubCount === 'number' &&
		typeof value.articleCount === 'number' &&
		typeof value.message === 'string'
	);
}

function relativeTime(value: string): string {
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) return 'Recent';
	const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
	if (minutes < 60) return `${Math.max(1, minutes)}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

function formatStars(value: number): string {
	if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
	return String(value);
}

function normalizeText(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}

function stripMarkup(value: string): string {
	return normalizeText(value.replace(/<[^>]*>/g, ' '));
}

function localDateKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export class FeedService {
	constructor(
		private readonly app: App,
		private readonly vaultActions: VaultActionService,
		private readonly settings: AgentDashboardSettings,
	) {}

	async readCache(): Promise<FeedCache> {
		const file = this.app.vault.getAbstractFileByPath(DASHBOARD_PATHS.feedCache);
		if (!(file instanceof TFile)) return { ...EMPTY_CACHE };
		try {
			const parsed: unknown = JSON.parse(await this.app.vault.cachedRead(file));
			if (!isRecord(parsed)) return { ...EMPTY_CACHE };
			const github = Array.isArray(parsed.github)
				? parsed.github.filter(isFeedItem)
				: [];
			const articles = Array.isArray(parsed.articles)
				? parsed.articles.filter(isFeedItem)
				: [];
			const updatedAt =
				typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '';
			const storedDays = Array.isArray(parsed.days)
				? parsed.days.filter(isFeedDay)
				: [];
			const runs = Array.isArray(parsed.runs)
				? parsed.runs.filter(isFeedAutomationRun)
				: [];
			const migratedDay =
				storedDays.length === 0 && updatedAt && (github.length || articles.length)
					? [this.createDaySummary(updatedAt, github, articles)]
					: storedDays;
			return {
				version: 1,
				updatedAt,
				github,
				articles,
				days: migratedDay,
				runs,
			};
		} catch {
			return { ...EMPTY_CACHE };
		}
	}

	async refresh(
		trigger: FeedAutomationRun['trigger'] = 'manual',
	): Promise<FeedCache> {
		const previous = await this.readCache();
		const startedAt = new Date().toISOString();
		const running: FeedAutomationRun = {
			id: `today-feeds:${startedAt}`,
			trigger,
			status: 'running',
			startedAt,
			githubCount: 0,
			articleCount: 0,
			message: 'Fetching GitHub and journal feeds…',
		};
		await this.writeCache({
			...previous,
			runs: [running, ...previous.runs].slice(0, 30),
		});
		try {
			const [githubResult, ...journalResults] = await Promise.allSettled([
				this.fetchGitHub(),
				...JOURNAL_FEEDS.map((feed) => this.fetchJournal(feed.name, feed.url)),
			]);
			const github =
				githubResult?.status === 'fulfilled'
					? githubResult.value
					: previous.github;
			const fetchedArticles = journalResults.flatMap((result) =>
				result.status === 'fulfilled' ? result.value : [],
			);
			if (github.length === 0 && fetchedArticles.length === 0) {
				throw new Error(
					'No feed source returned data. Check the network and try again.',
				);
			}
			const articles = this.mergeByUrl(previous.articles, fetchedArticles).slice(
				0,
				200,
			);
			const updatedAt = new Date().toISOString();
			const day = this.createDaySummary(updatedAt, github, articles);
			const days = [day, ...previous.days.filter((item) => item.date !== day.date)]
				.sort((left, right) => right.date.localeCompare(left.date))
				.slice(0, 30);
			const completed: FeedAutomationRun = {
				...running,
				status: 'complete',
				completedAt: updatedAt,
				githubCount: github.length,
				articleCount: articles.length,
				message: 'Feed archive updated.',
			};
			const cache: FeedCache = {
				version: 1,
				updatedAt,
				github: github.slice(0, 40),
				articles,
				days,
				runs: [completed, ...previous.runs].slice(0, 30),
			};
			await this.vaultActions.writeTodayFeedsArchive(cache);
			await this.writeCache(cache);
			return cache;
		} catch (error) {
			const failed: FeedAutomationRun = {
				...running,
				status: 'failed',
				completedAt: new Date().toISOString(),
				message: error instanceof Error ? error.message : 'Feed refresh failed.',
			};
			await this.writeCache({
				...previous,
				runs: [failed, ...previous.runs].slice(0, 30),
			});
			throw error;
		}
	}

	private async writeCache(cache: FeedCache): Promise<void> {
		await this.vaultActions.upsertText(
			DASHBOARD_PATHS.feedCache,
			JSON.stringify(cache, null, 2) + '\n',
		);
	}

	private async fetchGitHub(): Promise<TodayFeedItem[]> {
		const query = 'ai agent in:name,description,readme stars:>500';
		const response = await requestUrl({
			url: `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=20`,
			headers: {
				Accept: 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
			},
		});
		const payload: unknown = response.json;
		if (!isRecord(payload) || !Array.isArray(payload.items)) {
			throw new Error('GitHub returned an unexpected response.');
		}
		return payload.items.filter(isGitHubRepository).map((repo) => ({
			id: `github:${repo.full_name}`,
			kind: 'github',
			source: 'GitHub',
			title: repo.full_name,
			detail: `${formatStars(repo.stargazers_count)} stars · ${repo.language ?? 'Mixed'} · ${normalizeText(repo.description ?? 'AI project')}`,
			meta: relativeTime(repo.updated_at),
			url: repo.html_url,
			publishedAt: repo.updated_at,
		}));
	}

	private async fetchJournal(name: string, url: string): Promise<TodayFeedItem[]> {
		const response = await requestUrl({ url });
		const viewWindow = this.app.workspace.containerEl.ownerDocument.defaultView;
		if (!viewWindow) throw new Error('No active window is available to parse feeds.');
		const xml = new viewWindow.DOMParser().parseFromString(
			response.text,
			'application/xml',
		);
		if (xml.querySelector('parsererror')) throw new Error(`${name} returned invalid XML.`);
		const entries = Array.from(xml.querySelectorAll('item, entry'));
		return entries
			.map((entry) => this.parseJournalEntry(entry, name))
			.filter((item): item is TodayFeedItem => item !== null)
			.slice(0, 30);
	}

	private parseJournalEntry(entry: Element, source: string): TodayFeedItem | null {
		const childText = (...names: string[]): string => {
			const child = Array.from(entry.children).find((element) =>
				names.includes(element.localName.toLowerCase()),
			);
			return normalizeText(child?.textContent ?? '');
		};
		const title = childText('title');
		const linkElement = Array.from(entry.children).find(
			(element) => element.localName.toLowerCase() === 'link',
		);
		const url = normalizeText(
			linkElement?.getAttribute('href') ?? linkElement?.textContent ?? '',
		);
		if (!title || !url) return null;
		const rawDate = childText(
			'pubdate',
			'published',
			'updated',
			'date',
			'publicationdate',
		);
		const timestamp = Date.parse(rawDate);
		const publishedAt = Number.isFinite(timestamp)
			? new Date(timestamp).toISOString()
			: new Date().toISOString();
		const summary = stripMarkup(
			childText('description', 'summary', 'abstract', 'encoded'),
		);
		return {
			id: `journal:${url}`,
			kind: 'journal',
			source,
			title,
			detail: summary || `${source} research article`,
			meta: relativeTime(publishedAt),
			url,
			publishedAt,
		};
	}

	private mergeByUrl(
		existing: TodayFeedItem[],
		incoming: TodayFeedItem[],
	): TodayFeedItem[] {
		const items = new Map(existing.map((item) => [item.url, item]));
		for (const item of incoming) items.set(item.url, item);
		return Array.from(items.values()).sort((left, right) =>
			right.publishedAt.localeCompare(left.publishedAt),
		);
	}

	private createDaySummary(
		updatedAt: string,
		github: TodayFeedItem[],
		articles: TodayFeedItem[],
	): TodayFeedDay {
		const timestamp = Date.parse(updatedAt);
		const date = localDateKey(
			Number.isFinite(timestamp) ? new Date(timestamp) : new Date(),
		);
		return {
			date,
			updatedAt,
			path: `${this.settings.feedArchiveFolder}/${date.slice(0, 4)}/${date} - Agent Dashboard Feeds.md`,
			githubCount: github.length,
			articleCount: articles.length,
			highlights: [...github, ...articles].slice(0, 5).map((item) => item.title),
		};
	}
}
