import { Env } from './index';
type JoinUser = {
	sessionId: string;
	userId: string;
	playerName: string;
};
const joinUser = async (param: JoinUser, env: Env): Promise<any> => {
	// プレイヤーを登録
	await env.DB.prepare('INSERT INTO GameSessionUser (SessionId, UserId, RandomNum, InGameUserName) VALUES (?, ?, ?, ?);')
		.bind(param.sessionId, param.userId, Math.floor(Math.random() * 1000000), param.playerName)
		.run();
};
export default joinUser;
