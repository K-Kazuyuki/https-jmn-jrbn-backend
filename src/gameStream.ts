import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { Env } from './index';

type Status = {
	phase: number;
	InGameUserName: string[];
};

export const gameStream = async (req: Request, env: Env, app: Hono): Promise<void> => {
	app.get('/api/gameStream', (c) => {
		const sessionId = c.req.query('sessionId');
		if (!sessionId) {
			return c.text('Missing sessionId', 400);
		}

		const initialStatus: Status = {
			phase: 0,
			InGameUserName: [],
		};

		let currentStatus = JSON.stringify(initialStatus);

		return streamSSE(c, async (stream) => {
			try {
				while (true) {
					const queryResult = await env.DB.prepare(
						`SELECT
							GSU.InGameUserName,
							GS.GamePhase
						FROM
							GameSessionUser GSU
						JOIN
							GameSession GS ON GSU.SessionId = GS.SessionId
						WHERE
							GSU.SessionId = ?;`
					)
						.bind(sessionId)
						.all();

					if (queryResult.results) {
						const updatedStatus: Status = {
							phase: queryResult.results[0]?.GamePhase as number,
							InGameUserName: queryResult.results.map((row: any) => row.InGameUserName),
						};

						const updatedStatusString = JSON.stringify(updatedStatus);

						if (currentStatus !== updatedStatusString) {
							currentStatus = updatedStatusString;
							console.log('Status changed:', currentStatus);
							await stream.writeSSE({ data: currentStatus });
						}
					}

					await stream.sleep(100);
				}
			} catch (error) {
				console.error('Error in gameStream:', error);
				await stream.writeSSE({ data: 'Error occurred' });
			}
		});
	});
};
