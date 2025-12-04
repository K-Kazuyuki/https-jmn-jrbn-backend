import { Env, ApiResponse, GameSession, GameSessionUser } from './types';
import { getSetting, SETTING_KEYS } from './settings';

interface StartGameRequest {
	sessionId: string;
	userId: string;
}

const validateRequestBody = (body: any): body is StartGameRequest => {
	return typeof body === 'object' && body !== null && typeof body.sessionId === 'string' && typeof body.userId === 'string';
};

const startGame = async (request: Request, env: Env): Promise<ApiResponse> => {
	try {
		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { sessionId, userId } = requestBody;
		const now = new Date().toISOString();

		// セッション情報を取得
		const session = await env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?').bind(sessionId).first<GameSession>();

		if (!session) {
			return { success: false, error: 'Session not found' };
		}

		// ゲームが待機中か確認
		if (session.GamePhase !== 0) {
			return { success: false, error: 'ゲームは既に開始されています' };
		}

		// ユーザーがセッションの作成者（JoinOrder=1）か確認
		const userRecord = await env.DB.prepare('SELECT * FROM GameSessionUser WHERE SessionId = ? AND UserId = ?')
			.bind(sessionId, userId)
			.first<GameSessionUser>();

		if (!userRecord || userRecord.JoinOrder !== 1) {
			return { success: false, error: 'ゲームを開始できるのは作成者のみです' };
		}

		// 切断判定：LastActiveAtが閾値より古いユーザーを非アクティブにする
		const disconnectTimeout = parseInt((await getSetting(env, SETTING_KEYS.DISCONNECT_TIMEOUT_SEC)) || '30');
		const cutoffTime = new Date(Date.now() - disconnectTimeout * 1000).toISOString();

		await env.DB.prepare('UPDATE GameSessionUser SET IsActive = 0 WHERE SessionId = ? AND LastActiveAt < ?')
			.bind(sessionId, cutoffTime)
			.run();

		// アクティブなプレイヤーを取得してJoinOrderを再割り当て
		const activePlayers = await env.DB.prepare(
			'SELECT UserId FROM GameSessionUser WHERE SessionId = ? AND IsActive = 1 ORDER BY JoinOrder'
		)
			.bind(sessionId)
			.all<{ UserId: string }>();

		if (activePlayers.results.length < 2) {
			return { success: false, error: '最低2人のアクティブな参加者が必要です' };
		}

		// JoinOrderを再割り当て
		for (let i = 0; i < activePlayers.results.length; i++) {
			await env.DB.prepare('UPDATE GameSessionUser SET JoinOrder = ? WHERE SessionId = ? AND UserId = ?')
				.bind(i + 1, sessionId, activePlayers.results[i].UserId)
				.run();
		}

		const numPlayers = activePlayers.results.length;

		// ゲームを開始状態に更新
		await env.DB.prepare('UPDATE GameSession SET GamePhase = 1, CurrentRound = 1, StartedAt = ? WHERE SessionId = ?')
			.bind(now, sessionId)
			.run();

		// プレイヤー数分の物語を作成
		for (let i = 0; i < numPlayers; i++) {
			const storyId = crypto.randomUUID();
			await env.DB.prepare('INSERT INTO GameStory (StoryId, SessionId, StoryIndex, CreatedAt) VALUES (?, ?, ?, ?)')
				.bind(storyId, sessionId, i, now)
				.run();
		}

		return { success: true, data: { playerCount: numPlayers } };
	} catch (e: any) {
		console.error('Error starting game:', e.message);
		return { success: false, error: e.message };
	}
};

export default startGame;
