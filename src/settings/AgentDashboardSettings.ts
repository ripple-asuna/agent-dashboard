import { App, Platform, Plugin, PluginSettingTab, Setting } from 'obsidian';

export interface AgentDashboardSettings {
	dailyFolder: string;
	dailyTemplate: string;
	projectsFolder: string;
	inProgressStatus: string;
	feedArchiveFolder: string;
	feedHour: number;
	codexCommand: string;
}

export const DEFAULT_SETTINGS: AgentDashboardSettings = {
	dailyFolder: '90-Journal/Daily',
	dailyTemplate: '99-System/Templates/每日笔记模板.md',
	projectsFolder: '10-Projects',
	inProgressStatus: '进行中',
	feedArchiveFolder: '90-Journal/Feeds',
	feedHour: 8,
	codexCommand: Platform.isMacOS
		? '/Applications/ChatGPT.app/Contents/Resources/codex'
		: 'codex',
};

type SettingsPlugin = Plugin & {
	settings: AgentDashboardSettings;
	saveSettings(): Promise<void>;
};

function vaultPath(value: string): string {
	return value.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

export class AgentDashboardSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: SettingsPlugin,
	) {
		super(app, plugin);
	}

	getSettingDefinitions() {
		return [
			{
				type: 'group',
				heading: 'Vault paths',
				items: [
					{
						name: 'Daily folder',
						desc: 'Folder that contains YYYY-MM-DD daily notes.',
						control: {
							type: 'folder',
							key: 'dailyFolder',
							includeRoot: true,
							defaultValue: DEFAULT_SETTINGS.dailyFolder,
						},
					},
					{
						name: 'Daily template',
						desc: 'Template used when New diary creates a missing daily note.',
						control: {
							type: 'file',
							key: 'dailyTemplate',
							defaultValue: DEFAULT_SETTINGS.dailyTemplate,
						},
					},
					{
						name: 'Projects folder',
						desc: 'Folder scanned by Project tracking.',
						control: {
							type: 'folder',
							key: 'projectsFolder',
							includeRoot: true,
							defaultValue: DEFAULT_SETTINGS.projectsFolder,
						},
					},
					{
						name: 'In-progress project status',
						desc: 'Only projects with this exact frontmatter status are shown.',
						control: {
							type: 'text',
							key: 'inProgressStatus',
							placeholder: '进行中',
							defaultValue: DEFAULT_SETTINGS.inProgressStatus,
						},
					},
					{
						name: 'Feed archive folder',
						desc: 'Complete daily GitHub and journal archives are stored here.',
						control: {
							type: 'folder',
							key: 'feedArchiveFolder',
							includeRoot: true,
							defaultValue: DEFAULT_SETTINGS.feedArchiveFolder,
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Automation',
				items: [
					{
						name: 'Today feeds hour',
						desc: 'Local hour for the daily feed refresh. If Obsidian was closed, it runs after the next launch that day.',
						control: {
							type: 'slider',
							key: 'feedHour',
							min: 0,
							max: 23,
							step: 1,
							defaultValue: DEFAULT_SETTINGS.feedHour,
						},
					},
					{
						name: 'Codex command',
						desc: 'Executable name or absolute path used by deep research on desktop.',
						control: {
							type: 'text',
							key: 'codexCommand',
							placeholder: 'Executable path',
							defaultValue: DEFAULT_SETTINGS.codexCommand,
						},
					},
				],
			},
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName('Vault paths').setHeading();
		this.addPathSetting(
			'Daily folder',
			'Folder that contains YYYY-MM-DD daily notes.',
			'dailyFolder',
		);
		this.addPathSetting(
			'Daily template',
			'Template used when New diary creates a missing daily note.',
			'dailyTemplate',
		);
		this.addPathSetting(
			'Projects folder',
			'Folder scanned by Project tracking.',
			'projectsFolder',
		);
		new Setting(containerEl)
			.setName('In-progress project status')
			.setDesc('Only projects with this exact frontmatter status are shown.')
			.addText((text) =>
				text
					.setPlaceholder('进行中')
					.setValue(this.plugin.settings.inProgressStatus)
					.onChange(async (value) => {
						this.plugin.settings.inProgressStatus = value.trim();
						await this.plugin.saveSettings();
					}),
			);
		this.addPathSetting(
			'Feed archive folder',
			'Complete daily GitHub and journal archives are stored here.',
			'feedArchiveFolder',
		);

		new Setting(containerEl).setName('Automation').setHeading();
		new Setting(containerEl)
			.setName('Today feeds hour')
			.setDesc(
				'Local hour for the daily feed refresh. If Obsidian was closed, it runs after the next launch that day.',
			)
			.addSlider((slider) =>
				slider
					.setLimits(0, 23, 1)
					.setDynamicTooltip()
					.setValue(this.plugin.settings.feedHour)
					.onChange(async (value) => {
						this.plugin.settings.feedHour = value;
						await this.plugin.saveSettings();
					}),
			);
		new Setting(containerEl)
			.setName('Codex command')
			.setDesc(
				'Executable name or absolute path used by deep research on desktop.',
			)
			.addText((text) =>
				text
					.setPlaceholder('Executable path')
					.setValue(this.plugin.settings.codexCommand)
					.onChange(async (value) => {
						this.plugin.settings.codexCommand = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}

	private addPathSetting(
		name: string,
		description: string,
		key: 'dailyFolder' | 'dailyTemplate' | 'projectsFolder' | 'feedArchiveFolder',
	): void {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(description)
			.addText((text) =>
				text
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => {
						this.plugin.settings[key] = vaultPath(value);
						await this.plugin.saveSettings();
					}),
			);
	}
}
