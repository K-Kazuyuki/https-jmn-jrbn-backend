import { Env, ApiResponse, GameSession } from './types';

interface GetSessionDatasRequest {
	sessionId: string;
}

interface SessionDataResponse {
	session: GameSession;
	entryWord: string;
	playerCount: number;
	players: Array<{
		userId: string;
		inGameName: string;
		isActive: boolean;
		joinOrder: number;
	}>;
}

const validateRequestBody = (body: any): body is GetSessionDatasRequest => {
	return typeof body === 'object' && body !== null && typeof body.sessionId === 'string';
};

const getSessionDatas = async (request: Request, env: Env): Promise<ApiResponse<SessionDataResponse>> => {
	try {
		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { sessionId } = requestBody;

		// セッション情報を取得
		const session = await env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?').bind(sessionId).first<GameSession>();

		if (!session) {
			return { success: false, error: 'Session not found' };
		}

		// 合言葉を取得
		const entryWordRecord = await env.DB.prepare('SELECT EntryWord FROM GameSessionEntryWord WHERE SessionId = ?')
			.bind(sessionId)
			.first<{ EntryWord: string }>();

		// 参加者情報を取得
		const usersResult = await env.DB.prepare(
			`SELECT u.UserId, u.JoinOrder, u.IsActive, ui.InGameUserName
			 FROM GameSessionUser u
			 JOIN GameSessionUserInfo ui ON u.SessionId = ui.SessionId AND u.UserId = ui.UserId
			 WHERE u.SessionId = ?
			 ORDER BY u.JoinOrder`
		)
			.bind(sessionId)
			.all<{ UserId: string; JoinOrder: number; IsActive: number; InGameUserName: string }>();

		const players = usersResult.results.map((u) => ({
			userId: u.UserId,
			inGameName: u.InGameUserName,
			isActive: u.IsActive === 1,
			joinOrder: u.JoinOrder,
		}));

		return {
			success: true,
			data: {
				session,
				entryWord: entryWordRecord?.EntryWord || '',
				playerCount: players.length,
				players,
			},
		};
	} catch (e: any) {
		console.error('Error getting session data:', e.message);
		return { success: false, error: e.message };
	}
};

export default getSessionDatas;
