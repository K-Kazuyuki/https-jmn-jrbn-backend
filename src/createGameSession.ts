import { Env } from './index';
const createGameSession = async (env: Env): Promise<any> => {
	const { DB } = env;
	const session = await DB.prepare('INSERT INTO game_sessions (created_at) VALUES (NOW()) RETURNING *').bind().all();
	return session;
}

export default createGameSession;
