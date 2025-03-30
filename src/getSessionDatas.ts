import { Env } from './index';

type reqProps = {
	sessionId: string;
};

const getSessionDatas = async (req: Request, env: Env): Promise<Response> => {
	try {
		const data = await req.json();
		const sessionId = (data as reqProps).sessionId;

		const session = await env.DB.prepare('SELECT * FROM GameSession WHERE SessionId = ?;').bind(sessionId).all();
		if (session.results.length === 0) {
			return new Response(JSON.stringify({ error: 'Session does not exist' }), { status: 404 });
		}
		const sessionData = session.results[0];
		console.log('Session data:', sessionData);

		return new Response(JSON.stringify({ sessionData }), { status: 200 });
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500 });
	}
};

export default getSessionDatas;
