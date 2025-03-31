import { Env } from './index';

type RequestBody = {
	gameName: string;
	playerName: string;
	userLimit: number;
	timeLimit: number;
	userId?: number;
};

const createGameSession = async (request: Request, env: Env): Promise<any> => {
	try {
		console.log('Request body:', request.body); // Log the raw body to verify the data
		if (request.body === null) {
			return { error: 'Request body is empty' }; // リクエストボディが空の場合のエラー処理
		}
		const requestBody = (await request.json()) as RequestBody; // Parse the JSON body
		const userId = requestBody.userId ?? '';

		// Check if the user exists in the User table
		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?;').bind(userId).all();
		if (userExists.results.length === 0) {
			return { error: 'User does not exist' }; // エラー処理: ユーザーが存在しない場合
		}

		const sessionId: String = crypto.randomUUID();
		console.log(requestBody); // Log the parsed body to verify the data
		const createGame = await env.DB.prepare(
			'INSERT INTO GameSession (SessionId, GameName, UserLimit, TimeLimit, GamePhase) VALUES (?, ?, ?, ?, 0);'
		)
			.bind(sessionId, requestBody.gameName, requestBody.userLimit, requestBody.timeLimit)
			.run();

		// ゲームの合言葉を生成
		let entryWord: string;
		do {
			entryWord = Math.floor(10000 + Math.random() * 90000).toString();
			const checkEntryWord = await env.DB.prepare('SELECT 1 FROM GameSessionEntryWord WHERE EntryWord = ?;').bind(entryWord).all();
			if (checkEntryWord.results.length === 0) {
				await env.DB.prepare('INSERT INTO GameSessionEntryWord (SessionId, EntryWord) VALUES (?, ?);').bind(sessionId, entryWord).run();
				break;
			}
		} while (true);

		// プレイヤーを登録
		await env.DB.prepare('INSERT INTO GameSessionUser (SessionId, UserId) VALUES (?, ?);').bind(sessionId, userId).run();
		await env.DB.prepare('INSERT INTO GameSessionUserInfo (SessionId, UserId, RandomNum, InGameUserName) VALUES (?, ?, ?, ?);')
			.bind(sessionId, userId, Math.floor(100000 + Math.random() * 900000), requestBody.playerName)
			.run();

		return [{ SessionId: sessionId, EntryWord: entryWord }];
	} catch (e: any) {
		console.error('Error parsing JSON body:', e.message);
		return { error: 'Invalid JSON body' };
	}
};

export default createGameSession;
