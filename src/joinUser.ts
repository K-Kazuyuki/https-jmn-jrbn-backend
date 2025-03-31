import { Env } from './index';
type JoinUser = {
	sessionId: string;
	userId: string;
	playerName: string;
};
const joinUser = async (param: JoinUser, env: Env): Promise<any> => {
	const existingUsers = await env.DB.prepare('SELECT UserId FROM GameSessionUser WHERE SessionId = ?;').bind(param.sessionId).all();

	if (existingUsers.results.some((user: any) => user.UserId === param.userId)) {
		throw new Error('User already exists in the session.');
	}
	// ユーザの制限を超えていないか確認
	const userLimit = (await env.DB.prepare('SELECT UserLimit FROM GameSession WHERE SessionId = ?;').bind(param.sessionId).all()) as any;
	if (existingUsers.results.length >= userLimit.results[0].UserLimit) {
		throw new Error('User limit exceeded.');
	}
	// プレイヤーを登録
	await env.DB.prepare('INSERT INTO GameSessionUser (SessionId, UserId, RandomNum, InGameUserName) VALUES (?, ?, ?, ?);')
		.bind(param.sessionId, param.userId, Math.floor(Math.random() * 1000000), param.playerName)
		.run();
};

export default joinUser;
