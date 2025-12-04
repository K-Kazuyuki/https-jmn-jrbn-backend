import { Env, ApiResponse, GameSession, GameSessionUser } from './types';
import { getSetting, SETTING_KEYS } from './settings';

interface MarkReadyRequest {
	sessionId: string;
	userId: string;
}

const validateRequestBody = (body: any): body is MarkReadyRequest => {
	return typeof body === 'object' && body !== null && typeof body.sessionId === 'string' && typeof body.userId === 'string';
};

const markReady = async (request: Request, env: Env): Promise<ApiResponse<{ advancedToNextRound: boolean; gameEnded: boolean }>> => {
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

		// ゲームが進行中か確認
		if (session.GamePhase !== 1) {
			return { success: false, error: 'ゲームは進行中ではありません' };
		}

		// ユーザーがセッションに参加しているか確認
		const userRecord = await env.DB.prepare('SELECT * FROM GameSessionUser WHERE SessionId = ? AND UserId = ?')
			.bind(sessionId, userId)
			.first<GameSessionUser>();

		if (!userRecord) {
			return { success: false, error: 'User not in this session' };
		}

		// 完了通知を登録（既に存在する場合は無視）
		try {
			await env.DB.prepare('INSERT INTO GameRoundReady (SessionId, UserId, Round, ReadyAt) VALUES (?, ?, ?, ?)')
				.bind(sessionId, userId, session.CurrentRound, now)
				.run();
		} catch {
			// 既に登録済みの場合はエラーを無視
		}

		// LastActiveAtを更新
		await env.DB.prepare('UPDATE GameSessionUser SET LastActiveAt = ? WHERE SessionId = ? AND UserId = ?')
			.bind(now, sessionId, userId)
			.run();

		// 全員が完了したかチェック（all_readyモードの場合）
		let advancedToNextRound = false;
		let gameEnded = false;

		if (session.ProgressMode === 'all_ready') {
			// 切断判定の閾値を取得
			const disconnectTimeout = parseInt((await getSetting(env, SETTING_KEYS.DISCONNECT_TIMEOUT_SEC)) || '30');
			const cutoffTime = new Date(Date.now() - disconnectTimeout * 1000).toISOString();

			// アクティブなプレイヤー数を取得
			const activePlayersResult = await env.DB.prepare(
				'SELECT UserId FROM GameSessionUser WHERE SessionId = ? AND IsActive = 1 AND LastActiveAt >= ?'
			)
				.bind(sessionId, cutoffTime)
				.all<{ UserId: string }>();

			const activePlayers = activePlayersResult.results.map((p) => p.UserId);

			// アクティブなプレイヤーで完了通知済みの人数を取得
			const readyCount = await env.DB.prepare(
				`SELECT COUNT(*) as count FROM GameRoundReady
				 WHERE SessionId = ? AND Round = ? AND UserId IN (${activePlayers.map(() => '?').join(',')})`
			)
				.bind(sessionId, session.CurrentRound, ...activePlayers)
				.first<{ count: number }>();

			// 全員完了していたら次のラウンドへ
			if (readyCount && readyCount.count >= activePlayers.length) {
				const result = await advanceRound(env, session, activePlayers.length);
				advancedToNextRound = result.advancedToNextRound;
				gameEnded = result.gameEnded;
			}
		}

		return {
			success: true,
			data: { advancedToNextRound, gameEnded },
		};
	} catch (e: any) {
		console.error('Error marking ready:', e.message);
		return { success: false, error: e.message };
	}
};

// ラウンドを進める
async function advanceRound(
	env: Env,
	session: GameSession,
	numActivePlayers: number
): Promise<{ advancedToNextRound: boolean; gameEnded: boolean }> {
	const totalRounds = numActivePlayers;
	const nextRound = session.CurrentRound + 1;

	if (nextRound > totalRounds) {
		// ゲーム終了
		const now = new Date().toISOString();
		await env.DB.prepare('UPDATE GameSession SET GamePhase = 2, EndedAt = ? WHERE SessionId = ?').bind(now, session.SessionId).run();
		return { advancedToNextRound: false, gameEnded: true };
	} else {
		// 次のラウンドへ
		await env.DB.prepare('UPDATE GameSession SET CurrentRound = ? WHERE SessionId = ?').bind(nextRound, session.SessionId).run();
		return { advancedToNextRound: true, gameEnded: false };
	}
}

export default markReady;

// 時間経過によるラウンド進行（time_limitモード用）
export async function checkTimeLimit(env: Env, sessionId: string): Promise<void> {
	const session = await env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?').bind(sessionId).first<GameSession>();

	if (!session || session.GamePhase !== 1 || session.ProgressMode !== 'time_limit') {
		return;
	}

	const startedAt = new Date(session.StartedAt || session.CreatedAt);
	const timeLimitMs = session.TimeLimit * 60 * 1000;
	const roundDuration = timeLimitMs; // 各ラウンドの制限時間

	// ラウンド開始時刻（簡易計算：ゲーム開始時刻 + (現在ラウンド-1) * 制限時間）
	const roundStartTime = new Date(startedAt.getTime() + (session.CurrentRound - 1) * roundDuration);
	const elapsed = Date.now() - roundStartTime.getTime();

	if (elapsed >= roundDuration) {
		// 参加者数を取得
		const playerCount = await env.DB.prepare('SELECT COUNT(*) as count FROM GameSessionUser WHERE SessionId = ? AND IsActive = 1')
			.bind(sessionId)
			.first<{ count: number }>();

		await advanceRound(env, session, playerCount?.count || 0);
	}
}
