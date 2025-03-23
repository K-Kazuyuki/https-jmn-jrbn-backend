import { Env } from './index';
const createGameSession = async (env: Env): Promise<any> => {
	const { DB } = env;
	const session = await DB.prepare('SELECT * FROM User').bind().all();
	return new Response(JSON.stringify(session), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export default createGameSession;
