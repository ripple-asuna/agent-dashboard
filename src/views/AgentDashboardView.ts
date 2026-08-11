import { ItemView, setIcon, WorkspaceLeaf } from 'obsidian';
import {
	DASHBOARD_ACTIONS,
	EMPTY_DASHBOARD_DATA,
	type CompactListItem,
	type DashboardAction,
	type DashboardData,
	type DashboardProject,
	type DashboardTask,
	type TaskStatus,
	type TodayFeedItem,
} from '../data/dashboardData';

export const AGENT_DASHBOARD_VIEW_TYPE = 'agent-dashboard-view';

type DashboardTab = 'overview' | 'today' | 'vault' | 'pulse';

const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string }> = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'today', label: 'Today' },
	{ id: 'vault', label: 'Vault' },
	{ id: 'pulse', label: 'Pulse' },
];
const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done'];
const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	todo: 'TODO',
	doing: 'DOING',
	done: 'DONE',
};
let dashboardViewCounter = 0;

export interface DashboardViewController {
	loadData(): Promise<DashboardData>;
	createDailyNote(): Promise<void>;
	openTodayFeedsNote(): Promise<void>;
	captureInbox(title: string, content: string): Promise<void>;
	updateTaskStatus(task: DashboardTask, status: TaskStatus): Promise<void>;
	runDeepResearch(feeds: TodayFeedItem[]): Promise<void>;
	writeVaultLintReport(data: DashboardData): Promise<void>;
}

export class AgentDashboardView extends ItemView {
	private readonly pendingTimeouts = new Set<number>();
	private readonly instanceId = `agent-dashboard-${dashboardViewCounter++}`;
	private syncTimeEl: HTMLTimeElement | null = null;
	private toastEl: HTMLDivElement | null = null;
	private toastTimeout: number | null = null;
	private vaultReloadTimeout: number | null = null;
	private reloadVersion = 0;
	private data: DashboardData = EMPTY_DASHBOARD_DATA;
	private activeTab: DashboardTab = 'overview';
	private captureTitleEl: HTMLInputElement | null = null;
	private activateTab: ((tab: DashboardTab, moveFocus: boolean) => void) | null =
		null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly controller: DashboardViewController,
	) {
		super(leaf);
	}

	getViewType(): string {
		return AGENT_DASHBOARD_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Agent dashboard';
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('agent-dashboard-view');
		this.contentEl.createDiv({
			cls: 'agent-dashboard-loading',
			text: 'Scanning vault…',
		});
		const scheduleReload = (): void => {
			if (this.vaultReloadTimeout !== null) {
				this.clearScheduledTimeout(this.vaultReloadTimeout);
			}
			this.vaultReloadTimeout = this.schedule(() => {
				this.vaultReloadTimeout = null;
				void this.reloadDashboard();
			}, 300);
		};
		this.registerEvent(this.app.vault.on('create', scheduleReload));
		this.registerEvent(this.app.vault.on('delete', scheduleReload));
		this.registerEvent(this.app.vault.on('modify', scheduleReload));
		this.registerEvent(this.app.vault.on('rename', scheduleReload));
		this.registerEvent(this.app.metadataCache.on('resolved', scheduleReload));
		await this.reloadDashboard();
	}

	async onClose(): Promise<void> {
		this.clearPendingTimeouts();
		this.syncTimeEl = null;
		this.toastEl = null;
		this.vaultReloadTimeout = null;
		this.captureTitleEl = null;
		this.activateTab = null;
		this.contentEl.empty();
		this.contentEl.removeClass('agent-dashboard-view');
	}

	private async reloadDashboard(): Promise<void> {
		const version = ++this.reloadVersion;
		try {
			const data = await this.controller.loadData();
			if (version !== this.reloadVersion) return;
			this.data = data;
			this.renderDashboard();
		} catch (error) {
			this.data = EMPTY_DASHBOARD_DATA;
			this.renderDashboard();
			this.showToast(this.errorMessage(error));
		}
	}

	private renderDashboard(): void {
		this.contentEl.empty();
		const root = this.contentEl.createDiv({ cls: 'agent-dashboard-root' });
		const dashboard = root.createDiv({ cls: 'agent-dashboard-surface' });

		this.renderHeader(dashboard);
		const tabs = this.renderTabs(dashboard);
		const panelContainer = dashboard.createDiv({
			cls: 'agent-dashboard-panels',
		});
		const panels = [
			this.renderOverviewPanel(panelContainer),
			this.renderTodayPanel(panelContainer),
			this.renderVaultPanel(panelContainer),
			this.renderPulsePanel(panelContainer),
		];
		this.bindTabs(tabs, panels);

		const footer = dashboard.createEl('footer', {
			cls: 'agent-dashboard-footer',
		});
		footer.createSpan({ text: 'Agent Dashboard · live Vault data' });
		footer.createSpan({ text: 'Today feeds refresh automatically at 08:00' });

		this.toastEl = root.createDiv({ cls: 'agent-dashboard-toast' });
		this.toastEl.setAttrs({
			role: 'status',
			'aria-live': 'polite',
			'aria-atomic': 'true',
		});
	}

	private renderHeader(container: HTMLElement): void {
		const header = container.createEl('header', {
			cls: 'agent-dashboard-header',
		});
		const identity = header.createDiv({ cls: 'agent-dashboard-identity' });
		const eyebrow = identity.createEl('p', {
			cls: 'agent-dashboard-eyebrow',
		});
		eyebrow.createSpan({
			cls: 'agent-dashboard-signal-dot',
			attr: { 'aria-hidden': 'true' },
		});
		eyebrow.createSpan({ text: 'Agentic vault' });
		identity.createEl('h1', { text: "Ripple's agent dashboard" });

		const controls = header.createDiv({ cls: 'agent-dashboard-header-controls' });
		const liveStatus = controls.createDiv({ cls: 'agent-dashboard-live-status' });
		liveStatus.setAttr(
			'aria-label',
			`${this.data.agentsReady} agents ready`,
		);
		const liveBadge = liveStatus.createSpan({
			cls: 'agent-dashboard-live-badge',
		});
		liveBadge.createSpan({ attr: { 'aria-hidden': 'true' } });
		liveBadge.appendText('Live');
		liveStatus.createSpan({
			cls: 'agent-dashboard-agent-count',
			text: `${this.data.agentsReady} agent${this.data.agentsReady === 1 ? '' : 's'} ready`,
		});

		const syncMeta = controls.createDiv({ cls: 'agent-dashboard-sync-meta' });
		syncMeta.createSpan({
			cls: 'agent-dashboard-sync-label',
			text: 'Vault link',
		});
		this.syncTimeEl = syncMeta.createEl('time', {
			text: `Last sync ${this.data.syncTime}`,
		});

		const refreshButton = controls.createEl('button', {
			cls: 'agent-dashboard-refresh-button',
			attr: { type: 'button' },
		});
		const refreshIcon = refreshButton.createSpan({
			cls: 'agent-dashboard-button-icon',
			attr: { 'aria-hidden': 'true' },
		});
		setIcon(refreshIcon, 'refresh-cw');
		refreshButton.createSpan({ text: 'Refresh' });
		this.registerDomEvent(refreshButton, 'click', () => {
			void this.runRefresh(refreshButton);
		});
	}

	private renderTabs(container: HTMLElement): HTMLButtonElement[] {
		const nav = container.createEl('nav', {
			cls: 'agent-dashboard-tabs',
			attr: { role: 'tablist', 'aria-label': 'Dashboard sections' },
		});
		return DASHBOARD_TABS.map((tab) =>
			nav.createEl('button', {
				cls: 'agent-dashboard-tab',
				text: tab.label,
				attr: {
					id: `${this.instanceId}-tab-${tab.id}`,
					type: 'button',
					role: 'tab',
					'aria-selected': String(tab.id === this.activeTab),
					'aria-controls': `${this.instanceId}-panel-${tab.id}`,
					tabindex: tab.id === this.activeTab ? '0' : '-1',
					'data-tab': tab.id,
				},
			}),
		);
	}

	private bindTabs(
		tabs: HTMLButtonElement[],
		panels: HTMLElement[],
	): void {
		const activateTab = (nextIndex: number, moveFocus: boolean): void => {
			this.activeTab = DASHBOARD_TABS[nextIndex]?.id ?? 'overview';
			for (const [index, tab] of tabs.entries()) {
				const active = index === nextIndex;
				tab.setAttr('aria-selected', String(active));
				tab.tabIndex = active ? 0 : -1;
				panels[index]?.toggleAttribute('hidden', !active);
			}
			if (moveFocus) tabs[nextIndex]?.focus();
		};
		this.activateTab = (tab, moveFocus) => {
			const index = DASHBOARD_TABS.findIndex((item) => item.id === tab);
			if (index >= 0) activateTab(index, moveFocus);
		};

		for (const [index, tab] of tabs.entries()) {
			this.registerDomEvent(tab, 'click', () => activateTab(index, false));
			this.registerDomEvent(tab, 'keydown', (event) => {
				let nextIndex = index;
				if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
				else if (event.key === 'ArrowLeft') {
					nextIndex = (index - 1 + tabs.length) % tabs.length;
				} else if (event.key === 'Home') nextIndex = 0;
				else if (event.key === 'End') nextIndex = tabs.length - 1;
				else return;
				event.preventDefault();
				activateTab(nextIndex, true);
			});
		}
	}

	private createPanel(
		container: HTMLElement,
		tab: DashboardTab,
	): HTMLElement {
		const panel = container.createEl('section', {
			cls: 'agent-dashboard-panel',
			attr: {
				id: `${this.instanceId}-panel-${tab}`,
				role: 'tabpanel',
				'aria-labelledby': `${this.instanceId}-tab-${tab}`,
				'data-panel': tab,
			},
		});
		panel.hidden = tab !== this.activeTab;
		return panel;
	}

	private renderOverviewPanel(container: HTMLElement): HTMLElement {
		const panel = this.createPanel(container, 'overview');
		this.renderStatusRail(panel);
		this.renderStats(panel);
		this.renderHeatmap(panel);
		const lists = panel.createEl('section', {
			cls: ['agent-dashboard-split-grid', 'agent-dashboard-overview-lists'],
		});
		this.renderCompactCard(
			lists,
			'Vault / changed',
			'Recent notes',
			'5 files',
			this.data.recentNotes,
		);
		this.renderCompactCard(
			lists,
			'Agents / latest',
			'Agent runs',
			`${this.data.agentRuns.length} runs`,
			this.data.agentRuns,
		);
		return panel;
	}

	private renderStatusRail(container: HTMLElement): void {
		const rail = container.createEl('section', {
			cls: 'agent-dashboard-status-rail',
			attr: { 'aria-label': 'Current vault summary' },
		});
		const intro = rail.createDiv({ cls: 'agent-dashboard-rail-intro' });
		intro.createSpan({
			cls: 'agent-dashboard-rail-label',
			text: 'Daily operating state',
		});
		intro.createEl('strong', { text: 'Knowledge flow is stable' });
		this.renderRailMetric(
			rail,
			'Capture',
			`${this.data.metrics.taskFlow.today} tasks`,
			this.data.metrics.taskFlow.value,
		);
		this.renderRailMetric(
			rail,
			'Routing',
			`${this.data.metrics.inbox.value} inbox`,
			Math.max(0, 100 - this.data.metrics.inbox.value * 5),
		);
		this.renderRailMetric(
			rail,
			'Agent queue',
			`${this.data.agentRuns.filter((run) => run.status === 'running').length} running`,
			this.data.agentRuns.some((run) => run.status === 'running') ? 65 : 15,
		);
	}

	private renderRailMetric(
		container: HTMLElement,
		label: string,
		value: string,
		fill: number,
	): void {
		const metric = container.createDiv({ cls: 'agent-dashboard-rail-metric' });
		metric.createSpan({ text: label });
		metric.createEl('strong', { text: value });
		const track = metric.createEl('i');
		track.createEl('b', { attr: { 'data-level': String(this.scoreLevel(fill)) } });
	}

	private renderStats(container: HTMLElement): void {
		const stats = container.createEl('section', {
			cls: 'agent-dashboard-stats',
			attr: { 'aria-label': 'Vault metrics' },
		});
		this.renderHealthStat(stats);
		this.renderInboxStat(stats);
		this.renderTaskFlowStat(stats);
	}

	private renderHealthStat(container: HTMLElement): void {
		const data = this.data.metrics.health;
		const card = this.createStatCard(container, 'Vault health score', 'HLT');
		const body = card.createDiv({ cls: 'agent-dashboard-stat-body' });
		const copy = body.createDiv({ cls: 'agent-dashboard-stat-copy' });
		copy.createEl('strong', { text: String(data.value) });
		copy.createSpan({
			cls: 'agent-dashboard-positive-delta',
			text: data.delta,
		});
		const ring = body.createDiv({ cls: 'agent-dashboard-health-ring' });
		ring.setAttrs({
			role: 'img',
			'aria-label': `Vault health score ${data.value} out of 100`,
			'data-level': String(this.scoreLevel(data.value)),
		});
		ring.createSpan({ text: `${data.value}%` });
		card.createEl('p', {
			cls: 'agent-dashboard-stat-caption',
			text: 'Links, metadata, and orphan notes are within range.',
		});
	}

	private renderInboxStat(container: HTMLElement): void {
		const data = this.data.metrics.inbox;
		const card = this.createStatCard(container, 'Inbox backlog', 'INB');
		const body = card.createDiv({
			cls: ['agent-dashboard-stat-body', 'is-stacked'],
		});
		const copy = body.createDiv({ cls: 'agent-dashboard-stat-copy' });
		copy.createEl('strong', { text: String(data.value) });
		copy.createSpan({
			text: `${data.oldestDays}d oldest, ${data.needsRouting} need routing`,
		});
		const ageRail = body.createDiv({ cls: 'agent-dashboard-age-rail' });
		ageRail.setAttr('aria-label', 'Inbox age distribution');
		for (let index = 0; index < 9; index += 1) {
			const level = index < 2 ? 'hot' : index < 4 ? 'warm' : 'normal';
			ageRail.createSpan({
				cls: 'agent-dashboard-age-cell',
				attr: { 'data-level': level },
			});
		}
		card.createEl('p', {
			cls: 'agent-dashboard-stat-caption',
			text:
				data.value === 0
					? 'Inbox is clear.'
					: `${data.needsRouting} note${data.needsRouting === 1 ? '' : 's'} waiting for a destination folder.`,
		});
	}

	private renderTaskFlowStat(container: HTMLElement): void {
		const data = this.data.metrics.taskFlow;
		const card = this.createStatCard(container, 'Task flow', 'TSK');
		const body = card.createDiv({
			cls: ['agent-dashboard-stat-body', 'is-stacked'],
		});
		const copy = body.createDiv({
			cls: ['agent-dashboard-stat-copy', 'is-row'],
		});
		copy.createEl('strong', { text: `${data.value}%` });
		copy.createSpan({ text: `${data.today} today, ${data.overdue} overdue` });
		const progress = body.createDiv({ cls: 'agent-dashboard-progress' });
		progress.setAttrs({
			role: 'progressbar',
			'aria-label': 'Task completion',
			'aria-valuemin': '0',
			'aria-valuemax': '100',
			'aria-valuenow': String(data.value),
			'data-level': String(this.scoreLevel(data.value)),
		});
		progress.createSpan();
		const done = Math.round((data.value / 100) * data.today);
		const legend = body.createDiv({ cls: 'agent-dashboard-progress-legend' });
		legend.createSpan({ text: `Done ${done}` });
		legend.createSpan({ text: `Open ${Math.max(0, data.today - done)}` });
	}

	private createStatCard(
		container: HTMLElement,
		label: string,
		code: string,
	): HTMLDivElement {
		const card = container.createDiv({ cls: 'agent-dashboard-stat-card' });
		const kicker = card.createDiv({ cls: 'agent-dashboard-card-kicker' });
		kicker.createSpan({ text: label });
		kicker.createSpan({ cls: 'agent-dashboard-metric-code', text: code });
		return card;
	}

	private renderHeatmap(container: HTMLElement): void {
		const data = this.data.heatmap;
		const card = container.createEl('section', {
			cls: 'agent-dashboard-activity-card',
			attr: { 'aria-label': 'Vault note creation' },
		});
		this.renderSectionHeader(
			card,
			'Activity / 365d',
			'Vault note creation',
			`${data.activeDays} active note days · ${data.dateRange}`,
		);

		const scroller = card.createDiv({ cls: 'agent-dashboard-heatmap-scroll' });
		scroller.tabIndex = 0;
		scroller.setAttr('aria-label', 'Scrollable note creation heatmap');
		const frame = scroller.createDiv({ cls: 'agent-dashboard-heatmap-frame' });
		const monthRow = frame.createDiv({ cls: 'agent-dashboard-month-row' });
		monthRow.setAttr('aria-hidden', 'true');
		for (const month of data.months) monthRow.createSpan({ text: month });

		const content = frame.createDiv({ cls: 'agent-dashboard-heatmap-content' });
		const weekdays = content.createDiv({
			cls: 'agent-dashboard-weekday-labels',
		});
		weekdays.setAttr('aria-hidden', 'true');
		weekdays.createSpan({ text: 'Mon' });
		weekdays.createSpan({ text: 'Wed' });
		weekdays.createSpan({ text: 'Fri' });

		const grid = content.createDiv({ cls: 'agent-dashboard-heatmap-grid' });
		grid.setAttrs({
			role: 'img',
			'aria-label': `Daily note creation activity. ${data.activeDays} active note days from ${data.dateRange}.`,
		});
		for (const [index, day] of data.days.entries()) {
			grid.createSpan({
				cls: 'agent-dashboard-heat-cell',
				attr: {
					'data-level': String(day.level),
					title: `${day.date} · ${day.count} note${day.count === 1 ? '' : 's'} created · week ${Math.floor(index / 7) + 1}`,
				},
			});
		}

		const footer = card.createDiv({ cls: 'agent-dashboard-activity-footer' });
		const rhythm = footer.createEl('p');
		rhythm.createSpan({
			cls: 'agent-dashboard-pulse-mark',
			attr: { 'aria-hidden': 'true' },
		});
		rhythm.appendText('Steady writing rhythm detected across 12 months.');
		const legend = footer.createDiv({ cls: 'agent-dashboard-heat-legend' });
		legend.setAttr('aria-label', 'Heatmap color legend');
		legend.createSpan({ text: 'Less' });
		for (let level = 0; level <= 4; level += 1) {
			legend.createEl('i', { attr: { 'data-level': String(level) } });
		}
		legend.createSpan({ text: 'More' });
	}

	private renderTodayPanel(container: HTMLElement): HTMLElement {
		const panel = this.createPanel(container, 'today');
		const top = panel.createDiv({
			cls: ['agent-dashboard-split-grid', 'agent-dashboard-today-top'],
		});
		this.renderCapture(top);
		this.renderTasks(top);
		this.renderProjects(panel);
		return panel;
	}

	private renderCapture(container: HTMLElement): void {
		const card = this.createDataCard(
			container,
			'Quick capture',
			'Idea capture',
			'Inbox',
			'agent-dashboard-capture-card',
		);
		const form = card.createEl('form', { cls: 'agent-dashboard-capture-form' });
		const titleId = `${this.instanceId}-capture-title`;
		const contextId = `${this.instanceId}-capture-context`;
		form.createEl('label', { text: 'Note title', attr: { for: titleId } });
		const titleInput = form.createEl('input', {
			attr: {
				id: titleId,
				name: 'title',
				type: 'text',
				placeholder: 'A useful thought to keep…',
				required: 'true',
			},
		});
		form.createEl('label', { text: 'Context', attr: { for: contextId } });
		const contextInput = form.createEl('textarea', {
			attr: {
				id: contextId,
				name: 'body',
				rows: '7',
				placeholder: 'Add enough context for your future self.',
			},
		});
		this.captureTitleEl = titleInput;
		const footer = form.createDiv({ cls: 'agent-dashboard-capture-footer' });
		footer.createSpan({ text: 'Mock destination: /Inbox' });
		footer.createEl('button', {
			text: 'Capture note',
			attr: { type: 'submit' },
		});
		this.registerDomEvent(form, 'submit', (event) => {
			event.preventDefault();
			const title = titleInput.value.trim();
			if (!title) return;
			void this.captureInbox(form, title, contextInput.value);
		});
	}

	private renderTasks(container: HTMLElement): void {
		const card = this.createDataCard(
			container,
			'Focus / today',
			'Today tasks',
			`${this.data.tasks.length} items`,
		);
		const progress = card.createDiv({ cls: 'agent-dashboard-task-progress' });
		const progressLabel = progress.createSpan();
		const doneCount = progressLabel.createEl('b');
		progressLabel.appendText(` of ${this.data.tasks.length} complete`);
		const progressTrack = progress.createEl('i');
		progressTrack.createEl('b');
		const list = card.createEl('ul', {
			cls: ['agent-dashboard-data-list', 'agent-dashboard-task-list'],
		});
		const updateProgress = (): void => {
			const done = list.querySelectorAll('[data-status="done"]').length;
			doneCount.setText(String(done));
			progress.setAttr('data-done-count', String(done));
		};
		for (const task of this.data.tasks) {
			this.renderTask(list, task, updateProgress);
		}
		if (this.data.tasks.length === 0) {
			list.createEl('li', {
				cls: 'agent-dashboard-empty-state',
				text: 'No tasks are scheduled for today.',
			});
		}
		updateProgress();
	}

	private renderTask(
		container: HTMLUListElement,
		task: DashboardTask,
		onStatusChange: () => void,
	): void {
		let currentStatus = task.status;
		const item = container.createEl('li', { cls: 'agent-dashboard-task-item' });
		item.dataset.status = currentStatus;
		const toggle = item.createEl('button', {
			cls: 'agent-dashboard-task-toggle',
			attr: {
				type: 'button',
				'aria-label': `Change status for ${task.title}`,
			},
		});
		const copy = item.createDiv({ cls: 'agent-dashboard-task-copy' });
		copy.createSpan({ cls: 'agent-dashboard-task-title', text: task.title });
		copy.createSpan({
			cls: 'agent-dashboard-task-meta',
			text: `${task.context} · ${task.due}`,
		});
		const chip = item.createEl('button', {
			cls: 'agent-dashboard-status-chip',
			text: TASK_STATUS_LABELS[currentStatus],
			attr: {
				type: 'button',
				'aria-label': `Advance status for ${task.title}`,
			},
		});
		chip.dataset.status = currentStatus;

		const advanceStatus = (): void => {
			toggle.disabled = true;
			chip.disabled = true;
			const currentIndex = TASK_STATUS_ORDER.indexOf(currentStatus);
			currentStatus =
				TASK_STATUS_ORDER[(currentIndex + 1) % TASK_STATUS_ORDER.length] ??
				'todo';
			void this.persistTaskStatus(
				task,
				currentStatus,
				item,
				chip,
				onStatusChange,
			);
		};
		this.registerDomEvent(toggle, 'click', advanceStatus);
		this.registerDomEvent(chip, 'click', advanceStatus);
	}

	private renderProjects(container: HTMLElement): void {
		const card = this.createDataCard(
			container,
			'Execution / in progress',
			'Project tracking',
			`${this.data.projects.length} projects`,
			'agent-dashboard-project-card',
		);
		const scroller = card.createDiv({ cls: 'agent-dashboard-table-scroll' });
		scroller.tabIndex = 0;
		scroller.setAttr('aria-label', 'Scrollable project tracking table');
		const table = scroller.createEl('table');
		const headRow = table.createEl('thead').createEl('tr');
		for (const heading of [
			'Status',
			'Name',
			'Progress',
			'Due date',
			'Path',
			'Tags',
		]) {
			headRow.createEl('th', { text: heading, attr: { scope: 'col' } });
		}
		const body = table.createEl('tbody');
		for (const project of this.data.projects) {
			this.renderProject(body, project);
		}
		if (this.data.projects.length === 0) {
			body
				.createEl('tr')
				.createEl('td', {
					cls: 'agent-dashboard-empty-state',
					text: 'No Markdown projects were found under projects/.',
					attr: { colspan: '6' },
				});
		}
	}

	private renderProject(
		container: HTMLTableSectionElement,
		project: DashboardProject,
	): void {
		const row = container.createEl('tr');
		row.createEl('td', { text: project.status });
		row.createEl('td', {
			cls: 'agent-dashboard-project-name',
			text: project.name,
		});
		const progressCell = row.createEl('td');
		const progress = progressCell.createDiv({
			cls: 'agent-dashboard-project-progress',
			attr: {
				role: 'progressbar',
				'aria-label': `${project.name} progress`,
				'aria-valuemin': '0',
				'aria-valuemax': '100',
				'aria-valuenow': String(project.progress),
				'data-level': String(this.scoreLevel(project.progress)),
			},
		});
		progress.createSpan();
		row.createEl('td', { text: project.due });
		row.createEl('td', { text: project.path });
		const tags = row.createEl('td').createDiv({
			cls: 'agent-dashboard-tag-list',
		});
		for (const tag of project.tags) {
			tags.createSpan({ cls: 'agent-dashboard-tag', text: tag });
		}
	}

	private renderVaultPanel(container: HTMLElement): HTMLElement {
		const panel = this.createPanel(container, 'vault');
		const diagnostics = panel.createEl('section', {
			cls: 'agent-dashboard-diagnostic-grid',
			attr: { 'aria-label': 'Vault diagnostics' },
		});
		this.renderDiagnostic(
			diagnostics,
			'Vault health score',
			String(this.data.metrics.health.value),
			'Score',
			'green',
			'Overall score · +4 this week',
		);
		this.renderDiagnostic(
			diagnostics,
			'Link integrity',
			`${this.data.diagnostics.linkIntegrity}%`,
			'Links',
			'yellow',
			`${this.data.diagnostics.brokenLinks} broken · ${this.data.diagnostics.orphanNotes} orphan notes`,
		);
		this.renderDiagnostic(
			diagnostics,
			'Metadata coverage',
			`${this.data.diagnostics.metadataCoverage}%`,
			'YAML',
			'coral',
			`${this.data.diagnostics.missingFrontmatter} notes missing front matter`,
		);

		const audit = panel.createEl('section', { cls: 'agent-dashboard-audit-grid' });
		this.renderCompactCard(
			audit,
			'Routing',
			'Inbox files',
			`${this.data.vaultAudit.inbox.length} shown`,
			this.data.vaultAudit.inbox,
			'agent-dashboard-audit-card',
		);
		this.renderCompactCard(
			audit,
			'Graph',
			'Orphan notes',
			`${this.data.vaultAudit.orphans.length} shown`,
			this.data.vaultAudit.orphans,
			'agent-dashboard-audit-card',
		);
		this.renderCompactCard(
			audit,
			'Metadata',
			'Missing front matter',
			`${this.data.vaultAudit.frontmatter.length} shown`,
			this.data.vaultAudit.frontmatter,
			'agent-dashboard-audit-card',
		);
		this.renderCompactCard(
			audit,
			'Integrity',
			'Broken links',
			`${this.data.vaultAudit.broken.length} shown`,
			this.data.vaultAudit.broken,
			'agent-dashboard-audit-card',
		);
		return panel;
	}

	private renderDiagnostic(
		container: HTMLElement,
		label: string,
		value: string,
		ringLabel: string,
		tone: 'green' | 'yellow' | 'coral',
		detail: string,
	): void {
		const card = container.createEl('article', {
			cls: 'agent-dashboard-diagnostic-card',
		});
		card.createEl('p', { text: label });
		const body = card.createDiv();
		body.createEl('strong', { text: value });
		body.createSpan({
			cls: ['agent-dashboard-diagnostic-ring', `is-${tone}`],
			text: ringLabel,
			attr: {
				'data-level': String(this.scoreLevel(Number.parseFloat(value) || 0)),
			},
		});
		card.createEl('small', { text: detail });
	}

	private renderPulsePanel(container: HTMLElement): HTMLElement {
		const panel = this.createPanel(container, 'pulse');
		this.renderActions(panel);
		const pulseGrid = panel.createEl('section', {
			cls: 'agent-dashboard-pulse-grid',
		});
		this.renderResearchFunnel(pulseGrid);
		this.renderSourceMix(pulseGrid);
		this.renderTrends(pulseGrid);
		const lists = panel.createEl('section', {
			cls: ['agent-dashboard-split-grid', 'agent-dashboard-pulse-lists'],
		});
		this.renderCompactCard(
			lists,
			'RSS + GitHub',
			'Today feeds',
			`${this.data.todayFeeds.length} signals`,
			this.data.todayFeeds.slice(0, 5),
			undefined,
			true,
		);
		this.renderCompactCard(
			lists,
			'Automation',
			'Agent runs',
			'Live queue',
			this.data.agentRuns,
		);
		return panel;
	}

	private renderActions(container: HTMLElement): void {
		const actions = container.createEl('nav', {
			cls: 'agent-dashboard-actions',
			attr: { 'aria-label': 'Agent actions' },
		});
		for (const action of DASHBOARD_ACTIONS) {
			this.renderActionButton(actions, action);
		}
	}

	private renderActionButton(
		container: HTMLElement,
		action: DashboardAction,
	): void {
		const button = container.createEl('button', {
			cls: 'agent-dashboard-action-button',
			attr: { type: 'button', 'data-action': action.id },
		});
		if (action.id === 'today-feeds') button.addClass('is-highlighted');
		const icon = button.createSpan({
			cls: 'agent-dashboard-action-icon',
			attr: { 'aria-hidden': 'true' },
		});
		setIcon(icon, action.icon);
		button.createSpan({
			cls: 'agent-dashboard-action-label',
			text: action.label,
		});
		this.registerDomEvent(button, 'click', () => {
			void this.runAction(button, action);
		});
	}

	private renderResearchFunnel(container: HTMLElement): void {
		const card = this.createDataCard(
			container,
			'Agent intake',
			'Research funnel',
			'5 saved today',
			'agent-dashboard-pulse-card',
		);
		const list = card.createDiv({ cls: 'agent-dashboard-funnel-list' });
		for (const item of this.data.researchFunnel) {
			const row = list.createDiv({ cls: 'agent-dashboard-funnel-row' });
			row.createSpan({ text: item.label });
			const track = row.createSpan({ cls: 'agent-dashboard-funnel-track' });
			track.createEl('b', {
				attr: { 'data-level': String(this.scoreLevel(item.width)) },
			});
			row.createEl('strong', { text: String(item.value) });
		}
	}

	private renderSourceMix(container: HTMLElement): void {
		const total = this.data.sourceMix.reduce((sum, item) => sum + item.count, 0);
		const card = this.createDataCard(
			container,
			'Signals',
			'Source mix',
			`${total} cached`,
			'agent-dashboard-pulse-card',
		);
		const sourceBar = card.createDiv({ cls: 'agent-dashboard-source-bar' });
		sourceBar.setAttr('aria-label', 'Source mix');
		const tones = ['github', 'rss', 'news', 'mail'];
		for (const [index, source] of this.data.sourceMix.slice(0, 4).entries()) {
			sourceBar.createSpan({
				cls: `agent-dashboard-source-${tones[index] ?? 'mail'}`,
				attr: { 'data-level': String(this.scoreLevel(source.percent)) },
			});
		}
		const legend = card.createEl('ul', { cls: 'agent-dashboard-source-legend' });
		for (const [index, source] of this.data.sourceMix.slice(0, 4).entries()) {
			const item = legend.createEl('li');
			item.createEl('i', {
				cls: `agent-dashboard-source-${tones[index] ?? 'mail'}`,
			});
			item.appendText(`${source.label} ${source.percent}%`);
		}
		if (this.data.sourceMix.length === 0) {
			card.createEl('p', {
				cls: 'agent-dashboard-empty-state',
				text: 'Run today feeds to create the first cache.',
			});
		}
	}

	private renderTrends(container: HTMLElement): void {
		const card = this.createDataCard(
			container,
			'Research field',
			'Agent trend matrix',
			'6 topics',
			'agent-dashboard-trend-card',
		);
		const matrix = card.createDiv({ cls: 'agent-dashboard-trend-matrix' });
		for (const item of this.data.trends) {
			const trend = matrix.createDiv({ cls: 'agent-dashboard-trend-item' });
			trend.createEl('strong', { text: item.title });
			trend.createEl('small', { text: item.note });
			const bar = trend.createDiv({ cls: 'agent-dashboard-trend-bar' });
			bar.createSpan({
				attr: { 'data-level': String(this.scoreLevel(item.score)) },
			});
		}
	}

	private createDataCard(
		container: HTMLElement,
		index: string,
		title: string,
		meta: string,
		extraClass?: string,
	): HTMLElement {
		const classes = ['agent-dashboard-list-card'];
		if (extraClass) classes.push(extraClass);
		const card = container.createEl('article', { cls: classes });
		this.renderSectionHeader(card, index, title, meta);
		return card;
	}

	private renderCompactCard(
		container: HTMLElement,
		index: string,
		title: string,
		meta: string,
		items: CompactListItem[] | TodayFeedItem[],
		extraClass?: string,
		showSource = false,
	): void {
		const card = this.createDataCard(container, index, title, meta, extraClass);
		const list = card.createEl('ul', { cls: 'agent-dashboard-compact-list' });
		for (const item of items) this.renderCompactItem(list, item, showSource);
		if (items.length === 0) {
			list.createEl('li', {
				cls: 'agent-dashboard-empty-state',
				text:
					title === 'Today feeds'
						? 'Today feeds will refresh automatically at 08:00.'
						: 'No items found.',
			});
		}
	}

	private renderCompactItem(
		container: HTMLUListElement,
		item: CompactListItem | TodayFeedItem,
		showSource: boolean,
	): void {
		const row = container.createEl('li', { cls: 'agent-dashboard-compact-item' });
		const copy = row.createDiv({ cls: 'agent-dashboard-compact-copy' });
		if (showSource && 'url' in item) {
			copy.createEl('a', {
				cls: 'agent-dashboard-compact-title',
				text: item.title,
				href: item.url,
				attr: { target: '_blank', rel: 'noopener noreferrer' },
			});
		} else {
			copy.createSpan({ cls: 'agent-dashboard-compact-title', text: item.title });
		}
		const detail = copy.createSpan({ cls: 'agent-dashboard-compact-detail' });
		if (showSource && 'source' in item) {
			detail.createSpan({
				cls: 'agent-dashboard-feed-source',
				text: `${item.source} · `,
			});
		}
		detail.appendText(item.detail);
		const meta = row.createSpan({
			cls: 'agent-dashboard-compact-meta',
			text: item.meta,
		});
		if ('status' in item && item.status) meta.dataset.status = item.status;
	}

	private renderSectionHeader(
		container: HTMLElement,
		index: string,
		title: string,
		meta: string,
	): void {
		const header = container.createEl('header', {
			cls: 'agent-dashboard-section-header',
		});
		const copy = header.createDiv();
		copy.createEl('p', { cls: 'agent-dashboard-section-index', text: index });
		copy.createEl('h2', { text: title });
		header.createSpan({ cls: 'agent-dashboard-list-count', text: meta });
	}

	private scoreLevel(value: number): number {
		if (value <= 0) return 0;
		if (value < 25) return 1;
		if (value < 50) return 2;
		if (value < 75) return 3;
		return 4;
	}

	private async captureInbox(
		form: HTMLFormElement,
		title: string,
		content: string,
	): Promise<void> {
		try {
			await this.controller.captureInbox(title, content);
			form.reset();
			await this.reloadDashboard();
			this.showToast(`Captured “${title}” to Inbox.`);
		} catch (error) {
			this.showToast(this.errorMessage(error));
		}
	}

	private async persistTaskStatus(
		task: DashboardTask,
		status: TaskStatus,
		item: HTMLLIElement,
		chip: HTMLButtonElement,
		onStatusChange: () => void,
	): Promise<void> {
		item.dataset.status = status;
		chip.dataset.status = status;
		chip.setText(TASK_STATUS_LABELS[status]);
		onStatusChange();
		try {
			await this.controller.updateTaskStatus(task, status);
			this.showToast(`${task.title}: ${TASK_STATUS_LABELS[status].toLowerCase()}.`);
		} catch (error) {
			this.showToast(this.errorMessage(error));
		} finally {
			await this.reloadDashboard();
		}
	}

	private async runAction(
		button: HTMLButtonElement,
		action: DashboardAction,
	): Promise<void> {
		if (button.getAttribute('aria-busy') === 'true') return;
		if (action.id === 'inbox-ingest') {
			this.activateTab?.('today', false);
			this.captureTitleEl?.focus();
			this.showToast('Add a title and context, then capture the Inbox note.');
			return;
		}
		if (action.id === 'today-feeds') {
			try {
				await this.controller.openTodayFeedsNote();
			} catch (error) {
				this.showToast(this.errorMessage(error));
			}
			return;
		}
		const labelEl = button.querySelector<HTMLElement>(
			'.agent-dashboard-action-label',
		);
		if (!labelEl) return;
		button.addClass('is-running');
		button.removeClass('is-done');
		button.setAttr('aria-busy', 'true');
		labelEl.setText('Running…');
		try {
			if (action.id === 'new-diary') await this.controller.createDailyNote();
			else if (action.id === 'deep-research') {
				await this.controller.runDeepResearch(this.data.todayFeeds);
			} else if (action.id === 'vault-lint') {
				await this.controller.writeVaultLintReport(this.data);
			}
			button.removeClass('is-running');
			button.addClass('is-done');
			labelEl.setText('Done');
			await this.reloadDashboard();
			this.showToast(`${action.label} completed.`);
		} catch (error) {
			button.removeClass('is-running');
			labelEl.setText(action.label);
			this.showToast(this.errorMessage(error));
		} finally {
			button.removeAttribute('aria-busy');
		}
	}

	private async runRefresh(button: HTMLButtonElement): Promise<void> {
		if (button.getAttribute('aria-busy') === 'true') return;
		button.addClass('is-refreshing');
		button.setAttr('aria-busy', 'true');
		try {
			await this.reloadDashboard();
			this.syncTimeEl?.setText(`Last sync ${this.data.syncTime}`);
			this.showToast('Dashboard refreshed from the current Vault.');
		} catch (error) {
			this.showToast(this.errorMessage(error));
		} finally {
			button.removeClass('is-refreshing');
			button.removeAttribute('aria-busy');
		}
	}

	private errorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'The operation failed.';
	}

	private showToast(message: string): void {
		if (!this.toastEl) return;
		this.toastEl.setText(message);
		this.toastEl.addClass('is-visible');
		if (this.toastTimeout !== null) {
			this.clearScheduledTimeout(this.toastTimeout);
		}
		this.toastTimeout = this.schedule(() => {
			this.toastEl?.removeClass('is-visible');
			this.toastTimeout = null;
		}, 2200);
	}

	private schedule(callback: () => void, delay: number): number | null {
		const viewWindow = this.contentEl.ownerDocument.defaultView;
		if (!viewWindow) return null;
		const timeout = viewWindow.setTimeout(() => {
			this.pendingTimeouts.delete(timeout);
			callback();
		}, delay);
		this.pendingTimeouts.add(timeout);
		return timeout;
	}

	private clearScheduledTimeout(timeout: number): void {
		const viewWindow = this.contentEl.ownerDocument.defaultView;
		viewWindow?.clearTimeout(timeout);
		this.pendingTimeouts.delete(timeout);
	}

	private clearPendingTimeouts(): void {
		const viewWindow = this.contentEl.ownerDocument.defaultView;
		for (const timeout of this.pendingTimeouts) {
			viewWindow?.clearTimeout(timeout);
		}
		this.pendingTimeouts.clear();
		this.toastTimeout = null;
	}
}
