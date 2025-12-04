import { Env, ApiResponse, GameSession, GameStatus, GameStory, GameStoryText, GameSessionUser, GameSessionUserInfo } from './types';
import { getSetting, SETTING_KEYS } from './settings';

interface GetGameStatusRequest {
	sessionId: string;
	userId: string;
}

const validateRequestBody = (body: any): body is GetGameStatusRequest => {
	return typeof body === 'object' && body !== null && typeof body.sessionId === 'string' && typeof body.userId === 'string';
};

// ユーザーが担当する物語のインデックスを計算
// ローテーション方式: ラウンドNでプレイヤーJがインデックス (J-1 + N-1) % numPlayers の物語を担当
function getStoryIndexForPlayer(joinOrder: number, round: number, numPlayers: number): number {
	return (joinOrder - 1 + round - 1) % numPlayers;
}

const getGameStatus = async (request: Request, env: Env): Promise<ApiResponse<GameStatus>> => {
	try {
		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { sessionId, userId } = requestBody;
		const now = new Date().toISOString();

		// ハートビート: LastActiveAt を更新
		await env.DB.prepare('UPDATE GameSessionUser SET LastActiveAt = ?, IsActive = 1 WHERE SessionId = ? AND UserId = ?')
			.bind(now, sessionId, userId)
			.run();

		// 切断判定の閾値を取得
		const disconnectTimeout = parseInt((await getSetting(env, SETTING_KEYS.DISCONNECT_TIMEOUT_SEC)) || '30');
		const cutoffTime = new Date(Date.now() - disconnectTimeout * 1000).toISOString();

		// 非アクティブなユーザーを更新
		await env.DB.prepare('UPDATE GameSessionUser SET IsActive = 0 WHERE SessionId = ? AND LastActiveAt < ? AND IsActive = 1')
			.bind(sessionId, cutoffTime)
			.run();

		// セッション情報を取得
		const session = await env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?').bind(sessionId).first<GameSession>();

		if (!session) {
			return { success: false, error: 'Session not found' };
		}

		// 参加者情報を取得
		const usersResult = await env.DB.prepare(
			`SELECT u.*, ui.InGameUserName
			 FROM GameSessionUser u
			 JOIN GameSessionUserInfo ui ON u.SessionId = ui.SessionId AND u.UserId = ui.UserId
			 WHERE u.SessionId = ?
			 ORDER BY u.JoinOrder`
		)
			.bind(sessionId)
			.all<GameSessionUser & { InGameUserName: string }>();

		const players = usersResult.results.map((u) => ({
			userId: u.UserId,
			inGameName: u.InGameUserName,
			isActive: u.IsActive === 1,
			joinOrder: u.JoinOrder,
		}));

		// 現在のユーザーのJoinOrderを取得
		const currentUser = players.find((p) => p.userId === userId);
		if (!currentUser) {
			return { success: false, error: 'User not in this session' };
		}

		const numPlayers = players.length;
		const totalRounds = numPlayers;

		let myStoryIndex: number | null = null;
		let previousText: string | null = null;
		let storyTitle: string | null = null;
		let hasSubmittedThisRound = false;

		// 合言葉を取得
		const entryWordRecord = await env.DB.prepare('SELECT EntryWord FROM GameSessionEntryWord WHERE SessionId = ?')
			.bind(sessionId)
			.first<{ EntryWord: string }>();
		const entryWord = entryWordRecord?.EntryWord || '';

		// ゲームが進行中の場合
		if (session.GamePhase === 1 && session.CurrentRound > 0) {
			myStoryIndex = getStoryIndexForPlayer(currentUser.joinOrder, session.CurrentRound, numPlayers);

			// 自分が担当する物語を取得
			const story = await env.DB.prepare('SELECT * FROM GameStory WHERE SessionId = ? AND StoryIndex = ?')
				.bind(sessionId, myStoryIndex)
				.first<GameStory>();

			if (story) {
				// このラウンドで既に投稿しているか確認
				const myText = await env.DB.prepare('SELECT 1 FROM GameStoryText WHERE StoryId = ? AND UserId = ? AND TextOrder = ?')
					.bind(story.StoryId, userId, session.CurrentRound)
					.first();

				hasSubmittedThisRound = !!myText;

				// タイトル（ラウンド1のテキスト）を取得
				const titleText = await env.DB.prepare('SELECT Content FROM GameStoryText WHERE StoryId = ? AND TextOrder = 1')
					.bind(story.StoryId)
					.first<{ Content: string }>();
				storyTitle = titleText?.Content || null;

				// 前のテキストを取得（ただし切断者のテキストはスキップ）
				if (session.CurrentRound > 1) {
					// ラウンド1はタイトルなので、ラウンド2以降の最新テキストを取得
					const previousTexts = await env.DB.prepare(
						`SELECT st.Content
						 FROM GameStoryText st
						 WHERE st.StoryId = ? AND st.TextOrder > 1 AND st.TextOrder < ?
						 ORDER BY st.TextOrder DESC
						 LIMIT 1`
					)
						.bind(story.StoryId, session.CurrentRound)
						.first<{ Content: string }>();

					previousText = previousTexts?.Content || null;
				}
			}
		}

		// 完了通知済みのユーザーを取得
		const readyResult = await env.DB.prepare('SELECT UserId FROM GameRoundReady WHERE SessionId = ? AND Round = ?')
			.bind(sessionId, session.CurrentRound)
			.all<{ UserId: string }>();

		const readyPlayers = readyResult.results.map((r) => r.UserId);

		return {
			success: true,
			data: {
				session,
				players,
				currentRound: session.CurrentRound,
				totalRounds,
				myStoryIndex,
				previousText,
				storyTitle,
				hasSubmittedThisRound,
				readyPlayers,
				roundStartedAt: session.StartedAt,
				entryWord,
			},
		};
	} catch (e: any) {
		console.error('Error getting game status:', e.message);
		return { success: false, error: e.message };
	}
};

export default getGameStatus;
