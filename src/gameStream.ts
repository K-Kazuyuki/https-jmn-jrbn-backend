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

		let currentStatus: Status | null = null;
		let isStreamActive = true; // ストリームのアクティブ状態を管理

		const sendError = async (stream: any, message: string) => {
			await stream.writeSSE({ data: JSON.stringify({ error: message }) });
		};

		c.req.raw.signal.addEventListener('abort', () => {
			isStreamActive = false; // クライアントが切断された場合、ループを終了
		});

		return streamSSE(c, async (stream) => {
			try {
				while (isStreamActive) {
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

					if (queryResult.results && queryResult.results.length > 0) {
						const updatedStatus: Status = {
							phase: queryResult.results[0].GamePhase as number,
							InGameUserName: queryResult.results.map((row: any) => row.InGameUserName),
						};
						if (JSON.stringify(currentStatus) === JSON.stringify(updatedStatus)) {
							await stream.sleep(1000); // 状態が変わらない場合は待機
							continue;
						}
						// 状態が変わった場合のみクライアントに送信
						currentStatus = updatedStatus;
						const response = JSON.stringify(currentStatus);
						console.log('Status changed:', response);
						await stream.writeSSE({ data: response });
					} else {
						console.log('No data found or empty result.');
					}
					await stream.sleep(1000);
				}
			} catch (error) {
				console.error('Error in gameStream:', error);
				await sendError(stream, 'Internal server error.');
			} finally {
				console.log('Stream ended.');
			}
		});
	});
};
