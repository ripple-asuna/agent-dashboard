export type DashboardActionId =
	| 'new-diary'
	| 'deep-research'
	| 'today-feeds'
	| 'inbox-ingest'
	| 'vault-lint';

export type TaskStatus = 'done' | 'doing' | 'todo';
export type AgentRunStatus = 'complete' | 'running' | 'queued' | 'failed';

export interface DashboardAction {
	id: DashboardActionId;
	label: string;
	icon: string;
}

export interface CompactListItem {
	title: string;
	detail: string;
	meta: string;
	status?: AgentRunStatus;
}

export interface DashboardTask {
	id: string;
	title: string;
	context: string;
	status: TaskStatus;
	priority: 'high' | 'normal' | 'low';
	due: string;
	path: string;
	line: number;
}

export interface DashboardProject {
	status: string;
	name: string;
	progress: number;
	due: string;
	path: string;
	tags: string[];
}

export interface FunnelItem {
	label: string;
	value: number;
	width: number;
}

export interface TrendItem {
	title: string;
	note: string;
	score: number;
}

export interface TodayFeedItem {
	id: string;
	kind: 'github' | 'journal';
	source: string;
	title: string;
	detail: string;
	meta: string;
	url: string;
	publishedAt: string;
}

export interface TodayFeedDay {
	date: string;
	updatedAt: string;
	path: string;
	githubCount: number;
	articleCount: number;
	highlights: string[];
}

export interface FeedAutomationRun {
	id: string;
	trigger: 'scheduled' | 'manual';
	status: 'running' | 'complete' | 'failed';
	startedAt: string;
	completedAt?: string;
	githubCount: number;
	articleCount: number;
	message: string;
}

export interface HeatmapDay {
	date: string;
	count: number;
	level: number;
}

export interface DashboardData {
	syncTime: string;
	agentsReady: number;
	metrics: {
		health: { value: number; delta: string };
		inbox: { value: number; oldestDays: number; needsRouting: number };
		taskFlow: { value: number; today: number; overdue: number };
	};
	diagnostics: {
		linkIntegrity: number;
		metadataCoverage: number;
		brokenLinks: number;
		orphanNotes: number;
		missingFrontmatter: number;
	};
	heatmap: {
		activeDays: number;
		dateRange: string;
		months: string[];
		days: HeatmapDay[];
	};
	tasks: DashboardTask[];
	recentNotes: CompactListItem[];
	agentRuns: CompactListItem[];
	projects: DashboardProject[];
	vaultAudit: {
		inbox: CompactListItem[];
		orphans: CompactListItem[];
		frontmatter: CompactListItem[];
		broken: CompactListItem[];
	};
	researchFunnel: FunnelItem[];
	sourceMix: Array<{ label: string; count: number; percent: number }>;
	trends: TrendItem[];
	todayFeeds: TodayFeedItem[];
}

export interface FeedCache {
	version: 1;
	updatedAt: string;
	github: TodayFeedItem[];
	articles: TodayFeedItem[];
	days: TodayFeedDay[];
	runs: FeedAutomationRun[];
}

export const DASHBOARD_ACTIONS: DashboardAction[] = [
	{ id: 'new-diary', label: 'New diary', icon: 'file-plus-2' },
	{ id: 'deep-research', label: 'Deep research', icon: 'search' },
	{ id: 'today-feeds', label: 'Today feeds', icon: 'rss' },
	{ id: 'inbox-ingest', label: 'Inbox ingest', icon: 'inbox' },
	{ id: 'vault-lint', label: 'Vault lint', icon: 'list-checks' },
];

export const DASHBOARD_PATHS = {
	inboxFolder: 'Inbox',
	reportsFolder: 'Reports',
	cacheFolder: 'dashboard/cache',
	feedCache: 'dashboard/cache/today-feeds.json',
} as const;

export const JOURNAL_FEEDS = [
	{ name: 'Nature', url: 'https://www.nature.com/nature.rss' },
	{
		name: 'Science',
		url: 'https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science',
	},
	{ name: 'Cell', url: 'https://www.cell.com/cell/current.rss' },
	{ name: 'PRL', url: 'https://feeds.aps.org/rss/recent/prl.xml' },
] as const;

export const EMPTY_DASHBOARD_DATA: DashboardData = {
	syncTime: '--:--',
	agentsReady: 0,
	metrics: {
		health: { value: 0, delta: 'Waiting for scan' },
		inbox: { value: 0, oldestDays: 0, needsRouting: 0 },
		taskFlow: { value: 0, today: 0, overdue: 0 },
	},
	diagnostics: {
		linkIntegrity: 0,
		metadataCoverage: 0,
		brokenLinks: 0,
		orphanNotes: 0,
		missingFrontmatter: 0,
	},
	heatmap: { activeDays: 0, dateRange: 'No note data', months: [], days: [] },
	tasks: [],
	recentNotes: [],
	agentRuns: [],
	projects: [],
	vaultAudit: { inbox: [], orphans: [], frontmatter: [], broken: [] },
	researchFunnel: [],
	sourceMix: [],
	trends: [],
	todayFeeds: [],
};
