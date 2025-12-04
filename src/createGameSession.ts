import { Env, ApiResponse } from './types';

interface CreateGameSessionRequest {
	gameName: string;
	playerName: string;
	userLimit: number;
	timeLimit: number;
	userId: string;
	progressMode?: 'all_ready' | 'time_limit';
}

interface CreateGameSessionResponse {
	sessionId: string;
	entryWord: string;
}

const validateRequestBody = (body: any): body is CreateGameSessionRequest => {
	return (
		typeof body === 'object' &&
		body !== null &&
		typeof body.gameName === 'string' &&
		body.gameName.trim() !== '' &&
		typeof body.playerName === 'string' &&
		body.playerName.trim() !== '' &&
		typeof body.userLimit === 'number' &&
		body.userLimit >= 2 &&
		body.userLimit <= 10 &&
		typeof body.timeLimit === 'number' &&
		body.timeLimit >= 1 &&
		typeof body.userId === 'string'
	);
};

const createGameSession = async (request: Request, env: Env): Promise<ApiResponse<CreateGameSessionResponse>> => {
	try {
		if (request.body === null) {
			return { success: false, error: 'Request body is empty' };
		}

		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const userId = requestBody.userId;
		const progressMode = requestBody.progressMode || 'all_ready';
		const sessionId = crypto.randomUUID();
		const now = new Date().toISOString();

		// ユーザーの存在確認（存在しない場合は自動作成）
		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?').bind(userId).first();
		if (!userExists) {
			await env.DB.prepare('INSERT INTO User (UserId, Name, CreatedAt) VALUES (?, ?, ?)')
				.bind(userId, requestBody.playerName.trim(), now)
				.run();
		}

		// ゲームセッション作成
		await env.DB.prepare(
			`INSERT INTO GameSession (SessionId, GameName, UserLimit, TimeLimit, GamePhase, CurrentRound, ProgressMode, CreatedAt)
			 VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
		)
			.bind(sessionId, requestBody.gameName.trim(), requestBody.userLimit, requestBody.timeLimit, progressMode, now)
			.run();

		// 合言葉を生成（5桁のユニークな数字）
		let entryWord: string;
		let attempts = 0;
		do {
			entryWord = Math.floor(10000 + Math.random() * 90000).toString();
			const existing = await env.DB.prepare('SELECT 1 FROM GameSessionEntryWord WHERE EntryWord = ?').bind(entryWord).first();
			if (!existing) {
				await env.DB.prepare('INSERT INTO GameSessionEntryWord (SessionId, EntryWord) VALUES (?, ?)').bind(sessionId, entryWord).run();
				break;
			}
			attempts++;
		} while (attempts < 100);

		if (attempts >= 100) {
			return { success: false, error: 'Failed to generate unique entry word' };
		}

		// 作成者を参加者として登録
		await env.DB.prepare(
			`INSERT INTO GameSessionUser (SessionId, UserId, JoinOrder, LastActiveAt, IsActive)
			 VALUES (?, ?, 1, ?, 1)`
		)
			.bind(sessionId, userId, now)
			.run();

		await env.DB.prepare(
			`INSERT INTO GameSessionUserInfo (SessionId, UserId, InGameUserName)
			 VALUES (?, ?, ?)`
		)
			.bind(sessionId, userId, requestBody.playerName.trim())
			.run();

		return {
			success: true,
			data: { sessionId, entryWord },
		};
	} catch (e: any) {
		console.error('Error creating game session:', e.message);
		return { success: false, error: e.message };
	}
};

export default createGameSession;
