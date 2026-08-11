import { FeedService } from './FeedService';
import type { AgentDashboardSettings } from '../settings/AgentDashboardSettings';

function pad(value: number): string {
	return String(value).padStart(2, '0');
}

function localDateKey(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export class FeedAutomationService {
	private checking = false;

	constructor(
		private readonly feedService: FeedService,
		private readonly settings: AgentDashboardSettings,
	) {}

	async runIfDue(now = new Date()): Promise<boolean> {
		if (now.getHours() < this.settings.feedHour || this.checking) return false;
		this.checking = true;
		try {
			const today = localDateKey(now);
			const cache = await this.feedService.readCache();
			const alreadyAttempted = cache.runs.some((run) => {
				if (run.trigger !== 'scheduled') return false;
				const timestamp = Date.parse(run.startedAt);
				return (
					Number.isFinite(timestamp) &&
					localDateKey(new Date(timestamp)) === today
				);
			});
			if (alreadyAttempted) return false;
			await this.feedService.refresh('scheduled');
			return true;
		} finally {
			this.checking = false;
		}
	}
}
