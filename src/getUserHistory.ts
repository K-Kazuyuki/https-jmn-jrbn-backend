import { Env, ApiResponse, GameHistoryItem, StoryDetail } from './types';

interface GetUserHistoryRequest {
	userId: string;
}

interface GetSessionStoriesRequest {
	sessionId: string;
	userId: string;
}

const validateUserHistoryRequest = (body: any): body is GetUserHistoryRequest => {
	return typeof body === 'object' && body !== null && typeof body.userId === 'string';
};

const validateSessionStoriesRequest = (body: any): body is GetSessionStoriesRequest => {
	return typeof body === 'object' && body !== null && typeof body.sessionId === 'string' && typeof body.userId === 'string';
};

// ユーザーの過去のゲーム一覧を取得
export const getUserHistory = async (request: Request, env: Env): Promise<ApiResponse<GameHistoryItem[]>> => {
	try {
		const requestBody = await request.json();
		if (!validateUserHistoryRequest(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { userId } = requestBody;

		const result = await env.DB.prepare(
			`SELECT
				gs.SessionId as sessionId,
				gs.GameName as gameName,
				gs.CreatedAt as createdAt,
				gs.EndedAt as endedAt,
				(SELECT COUNT(*) FROM GameSessionUser WHERE SessionId = gs.SessionId) as playerCount
			 FROM GameSession gs
			 JOIN GameSessionUser gsu ON gs.SessionId = gsu.SessionId
			 WHERE gsu.UserId = ? AND gs.GamePhase = 2
			 ORDER BY gs.CreatedAt DESC`
		)
			.bind(userId)
			.all<GameHistoryItem>();

		return { success: true, data: result.results };
	} catch (e: any) {
		console.error('Error getting user history:', e.message);
		return { success: false, error: e.message };
	}
};

// セッションの物語一覧を取得
export const getSessionStories = async (request: Request, env: Env): Promise<ApiResponse<StoryDetail[]>> => {
	try {
		const requestBody = await request.json();
		if (!validateSessionStoriesRequest(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { sessionId, userId } = requestBody;

		// ユーザーがセッションに参加していたか確認
		const userRecord = await env.DB.prepare('SELECT 1 FROM GameSessionUser WHERE SessionId = ? AND UserId = ?')
			.bind(sessionId, userId)
			.first();

		if (!userRecord) {
			return { success: false, error: 'User was not in this session' };
		}

		// 物語一覧を取得
		const storiesResult = await env.DB.prepare('SELECT StoryId, StoryIndex FROM GameStory WHERE SessionId = ? ORDER BY StoryIndex')
			.bind(sessionId)
			.all<{ StoryId: string; StoryIndex: number }>();

		const stories: StoryDetail[] = [];

		for (const story of storiesResult.results) {
			// 各物語のテキストを取得
			const textsResult = await env.DB.prepare(
				`SELECT
					st.TextOrder as textOrder,
					st.Content as content,
					st.UserId as oduserId,
					COALESCE(ui.InGameUserName, u.Name) as userName
				 FROM GameStoryText st
				 JOIN User u ON st.UserId = u.UserId
				 LEFT JOIN GameSessionUserInfo ui ON st.UserId = ui.UserId AND ui.SessionId = ?
				 WHERE st.StoryId = ?
				 ORDER BY st.TextOrder`
			)
				.bind(sessionId, story.StoryId)
				.all<{ textOrder: number; content: string; oduserId: string; userName: string }>();

			stories.push({
				storyId: story.StoryId,
				storyIndex: story.StoryIndex,
				texts: textsResult.results.map((t) => ({
					textOrder: t.textOrder,
					content: t.content,
					userId: t.oduserId,
					userName: t.userName,
				})),
			});
		}

		return { success: true, data: stories };
	} catch (e: any) {
		console.error('Error getting session stories:', e.message);
		return { success: false, error: e.message };
	}
};

export default getUserHistory;
