import { Env } from './index';
const getUserDatas = async (request: Request, env: Env): Promise<any> => {
	const session = await env.DB.prepare('SELECT * FROM User').bind().all();
	return session.results;
};

export default getUserDatas;
