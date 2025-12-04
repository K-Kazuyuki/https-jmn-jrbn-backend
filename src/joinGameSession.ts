import { Env, ApiResponse, GameSession, GameSessionUser } from './types';

interface JoinGameSessionRequest {
	entryWord: string;
	playerName: string;
	userId: string;
}

interface JoinGameSessionResponse {
	sessionId: string;
	gameName: string;
	isRejoining: boolean;
}

const validateRequestBody = (body: any): body is JoinGameSessionRequest => {
	return (
		typeof body === 'object' &&
		body !== null &&
		typeof body.entryWord === 'string' &&
		body.entryWord.trim() !== '' &&
		typeof body.playerName === 'string' &&
		body.playerName.trim() !== '' &&
		typeof body.userId === 'string'
	);
};

const joinGameSession = async (request: Request, env: Env): Promise<ApiResponse<JoinGameSessionResponse>> => {
	try {
		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { entryWord, playerName, userId } = requestBody;
		const now = new Date().toISOString();

		// ユーザーの存在確認（存在しない場合は自動作成）
		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?').bind(userId).first();
		if (!userExists) {
			// ユーザーを自動作成
			await env.DB.prepare('INSERT INTO User (UserId, Name, CreatedAt) VALUES (?, ?, ?)')
				.bind(userId, playerName.trim(), now)
				.run();
		}

		// 合言葉からセッションIDを取得
		const entryWordRecord = await env.DB.prepare('SELECT SessionId FROM GameSessionEntryWord WHERE EntryWord = ?')
			.bind(entryWord.trim())
			.first<{ SessionId: string }>();

		if (!entryWordRecord) {
			return { success: false, error: '合言葉が見つかりません' };
		}

		const sessionId = entryWordRecord.SessionId;

		// セッション情報を取得
		const session = await env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?').bind(sessionId).first<GameSession>();

		if (!session) {
			return { success: false, error: 'Session not found' };
		}

		// ゲームが終了していないか確認
		if (session.GamePhase === 2) {
			return { success: false, error: 'このゲームは既に終了しています' };
		}

		// 既に参加しているか確認
		const existingUser = await env.DB.prepare('SELECT * FROM GameSessionUser WHERE SessionId = ? AND UserId = ?')
			.bind(sessionId, userId)
			.first<GameSessionUser>();

		if (existingUser) {
			// 再参加の場合
			await env.DB.prepare('UPDATE GameSessionUser SET LastActiveAt = ?, IsActive = 1 WHERE SessionId = ? AND UserId = ?')
				.bind(now, sessionId, userId)
				.run();

			// プレイヤー名を更新
			await env.DB.prepare('UPDATE GameSessionUserInfo SET InGameUserName = ? WHERE SessionId = ? AND UserId = ?')
				.bind(playerName.trim(), sessionId, userId)
				.run();

			return {
				success: true,
				data: {
					sessionId,
					gameName: session.GameName,
					isRejoining: true,
				},
			};
		}

		// 新規参加の場合

		if (session.GamePhase === 0) {
			// ゲーム開始前：通常の参加
			const playerCount = await env.DB.prepare('SELECT COUNT(*) as count FROM GameSessionUser WHERE SessionId = ?')
				.bind(sessionId)
				.first<{ count: number }>();

			if (playerCount && playerCount.count >= session.UserLimit) {
				return { success: false, error: '参加者数の上限に達しています' };
			}

			const joinOrder = (playerCount?.count || 0) + 1;

			await env.DB.prepare(
				`INSERT INTO GameSessionUser (SessionId, UserId, JoinOrder, LastActiveAt, IsActive)
				 VALUES (?, ?, ?, ?, 1)`
			)
				.bind(sessionId, userId, joinOrder, now)
				.run();

			await env.DB.prepare(
				`INSERT INTO GameSessionUserInfo (SessionId, UserId, InGameUserName)
				 VALUES (?, ?, ?)`
			)
				.bind(sessionId, userId, playerName.trim())
				.run();
		} else if (session.GamePhase === 1) {
			// ゲーム進行中：切断者の代わりに途中参加
			// 非アクティブなプレイヤーを探す
			const inactivePlayer = await env.DB.prepare(
				'SELECT * FROM GameSessionUser WHERE SessionId = ? AND IsActive = 0 ORDER BY JoinOrder LIMIT 1'
			)
				.bind(sessionId)
				.first<GameSessionUser>();

			if (!inactivePlayer) {
				return { success: false, error: 'このゲームは既に開始されており、空きがありません' };
			}

			// 切断者のスロットを引き継ぐ
			await env.DB.prepare(
				`INSERT INTO GameSessionUser (SessionId, UserId, JoinOrder, LastActiveAt, IsActive)
				 VALUES (?, ?, ?, ?, 1)`
			)
				.bind(sessionId, userId, inactivePlayer.JoinOrder, now)
				.run();

			await env.DB.prepare(
				`INSERT INTO GameSessionUserInfo (SessionId, UserId, InGameUserName)
				 VALUES (?, ?, ?)`
			)
				.bind(sessionId, userId, playerName.trim())
				.run();

			// 元の切断者を削除（または別テーブルに移動）
			await env.DB.prepare('DELETE FROM GameSessionUser WHERE SessionId = ? AND UserId = ?')
				.bind(sessionId, inactivePlayer.UserId)
				.run();
			await env.DB.prepare('DELETE FROM GameSessionUserInfo WHERE SessionId = ? AND UserId = ?')
				.bind(sessionId, inactivePlayer.UserId)
				.run();
		} else {
			return { success: false, error: 'このゲームは既に終了しています' };
		}

		return {
			success: true,
			data: {
				sessionId,
				gameName: session.GameName,
				isRejoining: false,
			},
		};
	} catch (e: any) {
		console.error('Error joining game session:', e.message);
		return { success: false, error: e.message };
	}
};

export default joinGameSession;
