import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { AgentRunner } from './services/AgentRunner';
import { FeedAutomationService } from './services/FeedAutomationService';
import { FeedService } from './services/FeedService';
import { VaultActionService } from './services/VaultActionService';
import { VaultDashboardService } from './services/VaultDashboardService';
import {
	AgentDashboardSettingTab,
	DEFAULT_SETTINGS,
	type AgentDashboardSettings,
} from './settings/AgentDashboardSettings';
import {
	AGENT_DASHBOARD_VIEW_TYPE,
	AgentDashboardView,
	type DashboardViewController,
} from './views/AgentDashboardView';

export default class AgentDashboardPlugin extends Plugin {
	private feedAutomation!: FeedAutomationService;
	settings: AgentDashboardSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
		const vaultActions = new VaultActionService(this.app, this.settings);
		const feedService = new FeedService(this.app, vaultActions, this.settings);
		this.feedAutomation = new FeedAutomationService(feedService, this.settings);
		const agentRunner = new AgentRunner(this.app, vaultActions, this.settings);
		const dashboardService = new VaultDashboardService(this.app, this.settings);
		const controller: DashboardViewController = {
			loadData: async () =>
				dashboardService.load(
					await feedService.readCache(),
					agentRunner.getRuns(),
				),
			createDailyNote: async () => {
				await vaultActions.createDailyNote();
			},
			openTodayFeedsNote: async () => {
				await vaultActions.openTodayFeedsArchive();
			},
			captureInbox: async (title, content) => {
				await vaultActions.captureInbox(title, content);
			},
			updateTaskStatus: async (task, status) => {
				await vaultActions.updateTaskStatus(task, status);
			},
			runDeepResearch: async (feeds) => {
				await agentRunner.runDeepResearch(feeds);
			},
			writeVaultLintReport: async (data) => {
				await vaultActions.writeVaultLintReport(data);
			},
		};
		const runFeedAutomation = (): void => {
			void this.feedAutomation.runIfDue().catch(() => {
				new Notice('Today feeds automation failed. Check agent runs for details.');
			});
		};
		this.app.workspace.onLayoutReady(runFeedAutomation);
		this.registerInterval(window.setInterval(runFeedAutomation, 60_000));
		this.addSettingTab(new AgentDashboardSettingTab(this.app, this));
		this.registerView(
			AGENT_DASHBOARD_VIEW_TYPE,
			(leaf) => new AgentDashboardView(leaf, controller),
		);

		this.addRibbonIcon(
			'layout-dashboard',
			'Open agent dashboard',
			() => {
				void this.activateDashboardView();
			},
		);

		this.addCommand({
			id: 'open-dashboard',
			name: 'Open dashboard',
			callback: () => {
				void this.activateDashboardView();
			},
		});
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as Partial<AgentDashboardSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
		this.settings.feedHour = Math.min(
			23,
			Math.max(0, Math.round(this.settings.feedHour)),
		);
	}

	private async activateDashboardView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | undefined = workspace.getLeavesOfType(
			AGENT_DASHBOARD_VIEW_TYPE,
		)[0];

		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({
				type: AGENT_DASHBOARD_VIEW_TYPE,
				active: true,
			});
		}

		await workspace.revealLeaf(leaf);
	}
}
