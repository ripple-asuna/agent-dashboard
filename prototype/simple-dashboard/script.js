const FALLBACK_DATA = {
	syncTime: '09:42',
	agentStatus: { state: 'live', ready: 3 },
	metrics: {
		health: { value: 86, delta: '+4 this week' },
		inbox: { value: 17, oldestDays: 9, needsRouting: 4 },
		taskFlow: { value: 67, today: 12, overdue: 3 },
	},
	diagnostics: { linkIntegrity: 72, metadataCoverage: 78 },
	heatmap: { startDate: '2025-07-01', endDate: '2026-06-30', activeDays: 180, seed: 43891 },
	tasks: [
		{ id: 'task-1', title: 'Review weekly vault health report', context: 'Dashboard spec', status: 'done', priority: 'normal', due: '08:30' },
		{ id: 'task-2', title: 'Route four notes from inbox', context: 'Inbox', status: 'doing', priority: 'high', due: '10:00' },
		{ id: 'task-3', title: 'Summarize agent research output', context: 'Research/AI agents', status: 'todo', priority: 'high', due: '13:30' },
		{ id: 'task-4', title: 'Link project notes to current MOC', context: 'Projects/Ripple', status: 'todo', priority: 'normal', due: '15:00' },
		{ id: 'task-5', title: 'Write evening diary checkpoint', context: 'Diary/2026', status: 'todo', priority: 'low', due: '21:30' },
	],
	recentNotes: [
		{ title: 'Agent Dashboard architecture', detail: 'Projects/Agent Dashboard/architecture.md', meta: '18m ago' },
		{ title: 'Local-first research workflow', detail: 'Research/Agent workflows/local-first.md', meta: '1h ago' },
		{ title: 'Daily note — 2026-08-11', detail: 'Diary/2026/08/2026-08-11.md', meta: 'Today' },
		{ title: 'MOC — Personal knowledge systems', detail: 'MOC/Personal knowledge systems.md', meta: 'Yesterday' },
		{ title: 'Plugin review checklist', detail: 'Projects/Agent Dashboard/review.md', meta: 'Yesterday' },
	],
	agentRuns: [
		{ title: 'Inbox classification', detail: '42s · 17 notes scanned', meta: 'Complete', status: 'complete' },
		{ title: 'Vault health scan', detail: '1m 18s · 1,420 notes', meta: 'Complete', status: 'complete' },
		{ title: 'Today feeds digest', detail: 'RSS + GitHub · 8 signals', meta: 'Running', status: 'running' },
		{ title: 'Task routing', detail: 'Waiting for inbox ingest', meta: 'Queued', status: 'queued' },
	],
	projects: [
		{ status: 'Active', name: 'Agent Dashboard first release', progress: 72, due: '2026-08-18', path: 'Projects/Agent Dashboard', tags: ['Obsidian', 'plugin'] },
		{ status: 'Active', name: 'Local agent research system', progress: 54, due: '2026-08-22', path: 'Research/Agent workflows', tags: ['agents', 'research'] },
		{ status: 'Review', name: 'Vault metadata cleanup', progress: 88, due: '2026-08-15', path: 'Projects/Vault health', tags: ['metadata'] },
		{ status: 'Planned', name: 'Weekly knowledge digest', progress: 26, due: '2026-08-29', path: 'Projects/Digest', tags: ['automation'] },
	],
	vaultAudit: {
		inbox: [
			{ title: 'How open formats improve data sharing', detail: 'Inbox/open-formats.md', meta: '9d' },
			{ title: 'MCP server notes', detail: 'Inbox/mcp-server-notes.md', meta: '4d' },
			{ title: 'Reading highlights — local AI', detail: 'Inbox/local-ai-highlights.md', meta: '2d' },
		],
		orphans: [
			{ title: 'GLM evaluation notes', detail: '0 incoming · 2 outgoing', meta: '0 links' },
			{ title: 'Personal operating system', detail: '0 incoming · 5 outgoing', meta: '0 links' },
			{ title: 'Vault folder architecture', detail: '0 incoming · 3 outgoing', meta: '0 links' },
			{ title: 'Agent memory patterns', detail: '0 incoming · 7 outgoing', meta: '0 links' },
		],
		frontmatter: [
			{ title: 'Deep research system prompt', detail: 'Missing: status, tags, updated', meta: '3 fields' },
			{ title: 'AI thinking map', detail: 'Missing: type, created', meta: '2 fields' },
			{ title: 'MiniMax agent notes', detail: 'Missing: status, tags', meta: '2 fields' },
			{ title: 'Reading workflow', detail: 'Missing: updated', meta: '1 field' },
		],
		broken: [
			{ title: 'Deep research system prompt', detail: '[[Dual-chain workflow]]', meta: 'Broken' },
			{ title: 'MOC — AI models', detail: '[[AI news]]', meta: 'Broken' },
			{ title: 'MOC — AI models', detail: '[[Gemini resource set]]', meta: 'Broken' },
			{ title: 'MOC — AI models', detail: '[[Model rankings]]', meta: 'Broken' },
		],
	},
	researchFunnel: [
		{ label: 'Fetched', value: 128, width: 100 },
		{ label: 'Filtered', value: 36, width: 42 },
		{ label: 'Briefed', value: 12, width: 23 },
		{ label: 'Saved', value: 5, width: 12 },
	],
	trends: [
		{ title: 'Coding agents', note: 'Hot · +18%', score: 92 },
		{ title: 'MCP servers', note: 'Rising · +14%', score: 84 },
		{ title: 'Obsidian plugins', note: 'Steady · +6%', score: 68 },
		{ title: 'Local-first AI', note: 'Rising · +11%', score: 79 },
		{ title: 'Agent evaluation', note: 'Watch · +9%', score: 73 },
		{ title: 'Knowledge OS', note: 'Niche · +5%', score: 59 },
	],
	todayFeeds: [
		{ source: 'GitHub', title: 'obsidianmd/obsidian-api updated public type definitions', detail: 'Plugin API · 8.1k stars', meta: '18m' },
		{ source: 'RSS', title: 'Local-first AI coding notebooks', detail: 'Hacker News · 428 points', meta: '34m' },
		{ source: 'GitHub', title: 'anthropics/skills added new design examples', detail: 'Agent skills · 42.6k stars', meta: '1h' },
		{ source: 'RSS', title: 'A practical tour of MCP servers', detail: 'Research feed · 214 points', meta: '2h' },
		{ source: 'GitHub', title: 'obsidian-minimal improved compact layouts', detail: 'Theme release · 4.3k stars', meta: '3h' },
		{ source: 'RSS', title: 'Why developer dashboards should stay local', detail: 'Personal tools · 156 points', meta: '4h' },
		{ source: 'GitHub', title: 'Dataview discussed incremental metadata refresh', detail: 'Issue thread · 8.7k stars', meta: '6h' },
		{ source: 'RSS', title: 'SQLite-backed personal tools are back', detail: 'Engineering · 361 points', meta: '7h' },
	],
};

const STATUS_ORDER = ['todo', 'doing', 'done'];
const STATUS_LABELS = { todo: 'Todo', doing: 'Doing', done: 'Done' };
let toastTimer;

function parseLocalDate(value) {
	const [year, month, day] = value.split('-').map(Number);
	return new Date(year, month - 1, day);
}

function formatIsoDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function addDays(date, days) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function dayDifference(a, b) {
	return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function seededRandom(seed) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

async function loadData() {
	if (window.location.protocol === 'file:') return FALLBACK_DATA;
	try {
		const response = await fetch('./mock-data.json', { cache: 'no-store' });
		if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
		return await response.json();
	} catch (_error) {
		showToast('Using bundled mock data.');
		return FALLBACK_DATA;
	}
}

function renderMetrics(data) {
	const { health, inbox, taskFlow } = data.metrics;
	document.querySelector('#health-value').textContent = health.value;
	document.querySelector('#health-delta').textContent = health.delta;
	document.querySelector('.health-ring span').textContent = `${health.value}%`;
	document.querySelector('.health-ring').setAttribute('aria-label', `Vault health score ${health.value} out of 100`);
	document.querySelector('#inbox-value').textContent = inbox.value;
	document.querySelector('#inbox-detail').textContent = `${inbox.oldestDays}d oldest, ${inbox.needsRouting} need routing`;
	document.querySelector('#task-flow-value').textContent = `${taskFlow.value}%`;
	document.querySelector('#task-flow-detail').textContent = `${taskFlow.today} today, ${taskFlow.overdue} overdue`;
	const flow = document.querySelector('.flow-track');
	flow.setAttribute('aria-valuenow', taskFlow.value);
	flow.querySelector('span').style.width = `${taskFlow.value}%`;
	document.querySelector('[data-diagnostic="health"]').textContent = health.value;
	document.querySelector('[data-diagnostic="links"]').textContent = `${data.diagnostics.linkIntegrity}%`;
	document.querySelector('[data-diagnostic="metadata"]').textContent = `${data.diagnostics.metadataCoverage}%`;
}

function buildHeatmap(config) {
	const grid = document.querySelector('#heatmap-grid');
	const monthRow = document.querySelector('#month-row');
	const rangeStart = parseLocalDate(config.startDate);
	const rangeEnd = parseLocalDate(config.endDate);
	const graphStart = addDays(rangeStart, -rangeStart.getDay());
	const graphEnd = addDays(rangeEnd, 6 - rangeEnd.getDay());
	const days = dayDifference(graphStart, graphEnd) + 1;
	const random = seededRandom(config.seed);
	const candidates = [];

	for (let index = 0; index < days; index += 1) {
		const date = addDays(graphStart, index);
		if (date < rangeStart || date > rangeEnd) continue;
		const weekdayBoost = date.getDay() === 0 || date.getDay() === 6 ? -0.13 : 0.08;
		const seasonalRhythm = Math.sin(index / 24) * 0.11 + Math.cos(index / 61) * 0.08;
		candidates.push({ index, score: random() + weekdayBoost + seasonalRhythm });
	}

	const active = new Map();
	candidates.sort((a, b) => b.score - a.score).slice(0, config.activeDays).forEach((candidate, rank) => {
		const ratio = rank / config.activeDays;
		active.set(candidate.index, ratio < 0.12 ? 4 : ratio < 0.35 ? 3 : ratio < 0.67 ? 2 : 1);
	});

	const fragment = document.createDocumentFragment();
	for (let index = 0; index < days; index += 1) {
		const date = addDays(graphStart, index);
		const isOutside = date < rangeStart || date > rangeEnd;
		const level = isOutside ? 0 : active.get(index) || 0;
		const cell = document.createElement('span');
		cell.className = `heat-cell${isOutside ? ' is-outside' : ''}`;
		cell.dataset.level = level;
		if (!isOutside) {
			const noteCount = level === 0 ? 0 : level + Math.floor(random() * 3);
			cell.title = `${formatIsoDate(date)} · ${noteCount} note${noteCount === 1 ? '' : 's'} created`;
		}
		fragment.appendChild(cell);
	}
	grid.replaceChildren(fragment);

	const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
	const monthFragment = document.createDocumentFragment();
	let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
	while (cursor <= rangeEnd) {
		const label = document.createElement('span');
		const week = Math.max(0, Math.floor(dayDifference(graphStart, cursor) / 7));
		label.textContent = monthFormatter.format(cursor);
		label.style.gridColumn = `${week + 1} / span 3`;
		monthFragment.appendChild(label);
		cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
	}
	monthRow.replaceChildren(monthFragment);
	const summary = `${config.activeDays} active note days · Jul 2025–Jun 2026`;
	document.querySelector('#activity-summary').textContent = summary;
	grid.setAttribute('aria-label', `Note creation heatmap. ${summary}.`);
}

function createCompactItem(item, options = {}) {
	const row = document.createElement('li');
	row.className = 'compact-item';
	const copy = document.createElement('div');
	copy.className = 'compact-copy';
	const title = document.createElement('span');
	title.className = 'compact-title';
	title.textContent = item.title;
	const detail = document.createElement('span');
	detail.className = 'compact-detail';
	if (options.feed) {
		const source = document.createElement('span');
		source.className = 'feed-source';
		source.textContent = `${item.source} · `;
		detail.append(source, document.createTextNode(item.detail));
	} else {
		detail.textContent = item.detail;
	}
	copy.append(title, detail);
	const meta = document.createElement('span');
	meta.className = 'compact-meta';
	meta.textContent = item.meta;
	if (item.status) meta.dataset.status = item.status;
	row.append(copy, meta);
	return row;
}

function renderCompactList(selector, items, options = {}) {
	const fragment = document.createDocumentFragment();
	items.forEach((item) => fragment.appendChild(createCompactItem(item, options)));
	document.querySelector(selector).replaceChildren(fragment);
}

function createTaskItem(task) {
	const item = document.createElement('li');
	item.className = 'task-item';
	item.dataset.status = task.status;
	const toggle = document.createElement('button');
	toggle.className = 'task-toggle';
	toggle.type = 'button';
	toggle.setAttribute('aria-label', `Change status for ${task.title}`);
	const copy = document.createElement('div');
	copy.className = 'task-copy';
	const title = document.createElement('span');
	title.className = 'task-title';
	title.textContent = task.title;
	const meta = document.createElement('span');
	meta.className = 'task-meta';
	meta.textContent = `${task.context} · ${task.due}`;
	copy.append(title, meta);
	const chip = document.createElement('span');
	chip.className = 'status-chip';
	chip.dataset.status = task.status;
	chip.textContent = STATUS_LABELS[task.status];

	toggle.addEventListener('click', () => {
		const currentIndex = STATUS_ORDER.indexOf(item.dataset.status);
		const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
		item.dataset.status = nextStatus;
		chip.dataset.status = nextStatus;
		chip.textContent = STATUS_LABELS[nextStatus];
		updateTaskProgress();
		showToast(`${task.title}: ${STATUS_LABELS[nextStatus].toLowerCase()}.`);
	});
	item.append(toggle, copy, chip);
	return item;
}

function updateTaskProgress() {
	const tasks = [...document.querySelectorAll('.task-item')];
	const done = tasks.filter((task) => task.dataset.status === 'done').length;
	document.querySelector('#task-done-count').textContent = done;
	document.querySelector('.task-progress i b').style.width = `${tasks.length ? (done / tasks.length) * 100 : 0}%`;
}

function renderTasks(tasks) {
	const fragment = document.createDocumentFragment();
	tasks.forEach((task) => fragment.appendChild(createTaskItem(task)));
	document.querySelector('#task-list').replaceChildren(fragment);
	document.querySelector('#task-count').textContent = `${tasks.length} items`;
	updateTaskProgress();
}

function renderProjects(projects) {
	const body = document.querySelector('#project-table-body');
	const fragment = document.createDocumentFragment();
	projects.forEach((project) => {
		const row = document.createElement('tr');
		const status = document.createElement('td');
		status.textContent = project.status;
		const name = document.createElement('td');
		name.className = 'project-name';
		name.textContent = project.name;
		const progress = document.createElement('td');
		const progressTrack = document.createElement('div');
		progressTrack.className = 'project-progress';
		const progressFill = document.createElement('span');
		progressFill.style.width = `${project.progress}%`;
		progressTrack.appendChild(progressFill);
		progress.appendChild(progressTrack);
		const due = document.createElement('td');
		due.textContent = project.due;
		const path = document.createElement('td');
		path.textContent = project.path;
		const tags = document.createElement('td');
		const tagList = document.createElement('div');
		tagList.className = 'tag-list';
		project.tags.forEach((tag) => {
			const tagEl = document.createElement('span');
			tagEl.className = 'tag';
			tagEl.textContent = tag;
			tagList.appendChild(tagEl);
		});
		tags.appendChild(tagList);
		row.append(status, name, progress, due, path, tags);
		fragment.appendChild(row);
	});
	body.replaceChildren(fragment);
	document.querySelector('#project-count').textContent = `${projects.length} projects`;
}

function renderAudit(audit) {
	const mappings = [
		['inbox', '#audit-inbox'],
		['orphans', '#audit-orphans'],
		['frontmatter', '#audit-frontmatter'],
		['broken', '#audit-broken'],
	];
	mappings.forEach(([key, selector]) => {
		renderCompactList(selector, audit[key]);
		document.querySelector(`${selector}-count`).textContent = `${audit[key].length} shown`;
	});
}

function renderFunnel(items) {
	const fragment = document.createDocumentFragment();
	items.forEach((item) => {
		const row = document.createElement('div');
		row.className = 'funnel-row';
		const label = document.createElement('span');
		label.textContent = item.label;
		const track = document.createElement('span');
		track.className = 'funnel-track';
		const fill = document.createElement('b');
		fill.style.width = `${item.width}%`;
		track.appendChild(fill);
		const value = document.createElement('strong');
		value.textContent = item.value;
		row.append(label, track, value);
		fragment.appendChild(row);
	});
	document.querySelector('#research-funnel').replaceChildren(fragment);
}

function renderTrends(items) {
	const fragment = document.createDocumentFragment();
	items.forEach((item) => {
		const card = document.createElement('div');
		card.className = 'trend-item';
		const title = document.createElement('strong');
		title.textContent = item.title;
		const note = document.createElement('small');
		note.textContent = item.note;
		const track = document.createElement('div');
		track.className = 'trend-bar';
		const fill = document.createElement('span');
		fill.style.width = `${item.score}%`;
		track.appendChild(fill);
		card.append(title, note, track);
		fragment.appendChild(card);
	});
	document.querySelector('#trend-matrix').replaceChildren(fragment);
}

function showToast(message) {
	const toast = document.querySelector('#toast');
	toast.textContent = message;
	toast.classList.add('is-visible');
	window.clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

function activateTab(tabName, moveFocus = false) {
	document.querySelectorAll('[role="tab"]').forEach((tab) => {
		const active = tab.dataset.tab === tabName;
		tab.setAttribute('aria-selected', String(active));
		tab.tabIndex = active ? 0 : -1;
		if (active && moveFocus) tab.focus();
	});
	document.querySelectorAll('[role="tabpanel"]').forEach((panel) => {
		panel.hidden = panel.dataset.panel !== tabName;
	});
}

function bindTabs() {
	const tabs = [...document.querySelectorAll('[role="tab"]')];
	tabs.forEach((tab, index) => {
		tab.addEventListener('click', () => activateTab(tab.dataset.tab));
		tab.addEventListener('keydown', (event) => {
			let nextIndex = index;
			if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
			else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
			else if (event.key === 'Home') nextIndex = 0;
			else if (event.key === 'End') nextIndex = tabs.length - 1;
			else return;
			event.preventDefault();
			activateTab(tabs[nextIndex].dataset.tab, true);
		});
	});
}

function bindActions() {
	document.querySelectorAll('.command-button').forEach((button) => {
		button.addEventListener('click', () => {
			if (button.classList.contains('is-running')) return;
			const label = button.querySelector('.command-label');
			const originalLabel = label.textContent;
			button.classList.add('is-running');
			button.classList.remove('is-done');
			button.setAttribute('aria-busy', 'true');
			label.textContent = 'Running…';
			window.setTimeout(() => {
				button.classList.remove('is-running');
				button.classList.add('is-done');
				button.removeAttribute('aria-busy');
				label.textContent = 'Done';
				showToast(`${originalLabel} completed (mock).`);
			}, 850);
			window.setTimeout(() => {
				button.classList.remove('is-done');
				label.textContent = originalLabel;
			}, 2400);
		});
	});

	const refresh = document.querySelector('#refresh-button');
	refresh.addEventListener('click', () => {
		if (refresh.classList.contains('is-refreshing')) return;
		refresh.classList.add('is-refreshing');
		refresh.setAttribute('aria-busy', 'true');
		window.setTimeout(() => {
			const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			document.querySelector('#last-sync').textContent = `Last sync ${time}`;
			refresh.classList.remove('is-refreshing');
			refresh.removeAttribute('aria-busy');
			showToast('Dashboard refreshed with mock data.');
		}, 650);
	});

	document.querySelector('#capture-form').addEventListener('submit', (event) => {
		event.preventDefault();
		const title = document.querySelector('#capture-name').value.trim();
		if (!title) return;
		showToast(`Captured “${title}” to Inbox (mock).`);
		event.currentTarget.reset();
	});
}

async function initializeDashboard() {
	const data = await loadData();
	document.querySelector('#last-sync').textContent = `Last sync ${data.syncTime}`;
	document.querySelector('.agent-count').textContent = `${data.agentStatus.ready} agents ready`;
	renderMetrics(data);
	buildHeatmap(data.heatmap);
	renderCompactList('#recent-notes-list', data.recentNotes);
	renderCompactList('#agent-runs-list', data.agentRuns);
	renderCompactList('#pulse-agent-runs-list', data.agentRuns);
	renderCompactList('#today-feeds-list', data.todayFeeds.slice(0, 5), { feed: true });
	renderTasks(data.tasks);
	renderProjects(data.projects);
	renderAudit(data.vaultAudit);
	renderFunnel(data.researchFunnel);
	renderTrends(data.trends);
	bindTabs();
	bindActions();
}

void initializeDashboard();
