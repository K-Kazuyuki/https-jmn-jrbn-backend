import { Env } from './index';

type ReqProps = {
	sessionId: string;
};

export const getSessionDatas = async (req: Request, env: Env): Promise<any> => {
	try {
		const data = await req.json();
		const sessionId = (data as ReqProps).sessionId;

		const session = await env.DB.prepare(`SELECT * FROM GameSession WHERE SessionId = ?;`).bind(sessionId).all();
		if (session.results.length === 0) {
			return new Response(JSON.stringify({ error: 'Session does not exist' }), { status: 404 });
		}
		console.log('Session data:', session.results);
		return session.results;
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500 });
	}
};

type ReqPropsEntryWord = {
	entryWord: string;
};

export const getSessionId = async (req: Request, env: Env): Promise<any> => {
	try {
		const data = await req.json();
		const entryWord = (data as ReqPropsEntryWord).entryWord;

		const session = await env.DB.prepare(`SELECT * FROM GameSession WHERE EntryWord = ?;`).bind(entryWord).all();
		if (session.results.length === 0) {
			return new Response(JSON.stringify({ error: 'No sessions found for the given entry word' }), { status: 404 });
		}
		console.log('Session data by entry word:', session.results);
		return session.results;
	} catch (e: any) {
		return new Response(JSON.stringify({ error: e.message }), { status: 500 });
	}
};
export default { getSessionDatas, getSessionId };
