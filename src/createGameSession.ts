import { Env } from './index';
import joinUser from './joinUser';

type RequestBody = {
	gameName: string;
	playerName: string;
	userLimit: number;
	timeLimit: number;
	userId: string;
};

const createGameSession = async (request: Request, env: Env): Promise<any> => {
	try {
		console.log('Request body:', request.body); // Log the raw body to verify the data
		if (request.body === null) {
			return { error: 'Request body is empty' }; // リクエストボディが空の場合のエラー処理
		}
		const requestBody = (await request.json()) as RequestBody; // Parse the JSON body
		const userId = requestBody.userId;

		// Check if the user exists in the User table
		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?;').bind(userId).all();
		if (userExists.results.length === 0) {
			console.error('User does not exist:', userId);
			return { error: 'User does not exist' }; // エラー処理: ユーザーが存在しない場合
		}

		const sessionId: string = crypto.randomUUID();
		console.log(requestBody); // Log the parsed body to verify the data
		// ゲームの合言葉を生成
		let entryWord: string;
		do {
			entryWord = Math.random().toString(36).substring(2, 7).toUpperCase();
			// EntryWordが重複しないか確認
			const checkEntryWord = await env.DB.prepare('SELECT 1 FROM GameSession WHERE EntryWord = ?;').bind(entryWord).all();
			if (checkEntryWord.results.length === 0) {
				break;
			}
		} while (true);
		const createGame = await env.DB.prepare(
			'INSERT INTO GameSession (SessionId, GameName, UserLimit, TimeLimit, GamePhase, EntryWord) VALUES (?, ?, ?, ?, 0, ?);'
		)
			.bind(sessionId, requestBody.gameName, requestBody.userLimit, requestBody.timeLimit, entryWord)
			.run();

		joinUser(
			{
				sessionId: sessionId,
				userId: userId,
				playerName: requestBody.playerName,
			},
			env
		);

		return [{ SessionId: sessionId, EntryWord: entryWord }];
	} catch (e: any) {
		console.error('Error parsing JSON body:', e.message);
		return { error: 'Invalid JSON body' };
	}
};

export default createGameSession;
