import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Env } from './index';
type Status = {
	phase: number;
	userIds: string[];
};

export const gameStream = async (req: Request, env: Env, app: Hono): Promise<any> => {
	app.get('/api/gameStream', (c) => {
		const DEMO: Status = {
			phase: 0,
			userIds: ['user1', 'user2', 'user3'],
		};
		let Status: string = 'init';
		let tmpStatus: string = JSON.stringify(DEMO);
		env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?;').bind('sessionId').first();
		return streamSSE(c, async (stream) => {
			while (DEMO.phase >= 0) {
				await stream.sleep(100);
				if (tmpStatus != Status) {
					Status = tmpStatus;
					await stream.writeSSE({ data: Status });
				}
			}
		});
	});
};
