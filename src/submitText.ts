import { Env, ApiResponse, GameSession, GameStory, GameSessionUser } from './types';

interface SubmitTextRequest {
	sessionId: string;
	userId: string;
	content: string;
}

const validateRequestBody = (body: any): body is SubmitTextRequest => {
	return (
		typeof body === 'object' &&
		body !== null &&
		typeof body.sessionId === 'string' &&
		typeof body.userId === 'string' &&
		typeof body.content === 'string'
	);
};

// ユーザーが担当する物語のインデックスを計算
function getStoryIndexForPlayer(joinOrder: number, round: number, numPlayers: number): number {
	return (joinOrder - 1 + round - 1) % numPlayers;
}

const submitText = async (request: Request, env: Env): Promise<ApiResponse> => {
	try {
		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { sessionId, userId, content } = requestBody;

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

		// 参加者数を取得
		const playerCount = await env.DB.prepare('SELECT COUNT(*) as count FROM GameSessionUser WHERE SessionId = ?')
			.bind(sessionId)
			.first<{ count: number }>();

		const numPlayers = playerCount?.count || 0;

		// 担当する物語のインデックスを計算
		const storyIndex = getStoryIndexForPlayer(userRecord.JoinOrder, session.CurrentRound, numPlayers);

		// 物語を取得
		const story = await env.DB.prepare('SELECT * FROM GameStory WHERE SessionId = ? AND StoryIndex = ?')
			.bind(sessionId, storyIndex)
			.first<GameStory>();

		if (!story) {
			return { success: false, error: 'Story not found' };
		}

		const now = new Date().toISOString();

		// 既に投稿済みか確認
		const existingText = await env.DB.prepare('SELECT TextId FROM GameStoryText WHERE StoryId = ? AND UserId = ? AND TextOrder = ?')
			.bind(story.StoryId, userId, session.CurrentRound)
			.first<{ TextId: string }>();

		if (existingText) {
			// 既存のテキストを更新（再投稿）
			await env.DB.prepare('UPDATE GameStoryText SET Content = ?, CreatedAt = ? WHERE TextId = ?')
				.bind(content, now, existingText.TextId)
				.run();
		} else {
			// 新規投稿
			const textId = crypto.randomUUID();
			await env.DB.prepare(
				`INSERT INTO GameStoryText (TextId, StoryId, UserId, TextOrder, Content, CreatedAt)
				 VALUES (?, ?, ?, ?, ?, ?)`
			)
				.bind(textId, story.StoryId, userId, session.CurrentRound, content, now)
				.run();
		}

		// LastActiveAtを更新
		await env.DB.prepare('UPDATE GameSessionUser SET LastActiveAt = ? WHERE SessionId = ? AND UserId = ?')
			.bind(now, sessionId, userId)
			.run();

		return { success: true };
	} catch (e: any) {
		console.error('Error submitting text:', e.message);
		return { success: false, error: e.message };
	}
};

export default submitText;
