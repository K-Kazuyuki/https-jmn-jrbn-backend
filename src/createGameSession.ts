import { Env } from './index';

const createGameSession = async (request: Request, env: Env): Promise<any> => {
	try {
		console.log('Request body:', request.body); // Log the raw body to verify the data
		if (request.body === null) {
			return { error: 'Request body is empty' }; // リクエストボディが空の場合のエラー処理
		}
		const requestBody = await request.json(); // Parse the JSON body
		if (!requestBody || Object.keys(requestBody).length === 0) {
			return { error: 'Request body is empty or invalid JSON' }; // JSONパース後の空チェック
		}
		console.log(requestBody); // Log the parsed body to verify the data
		const session = await env.DB.prepare('SELECT * FROM User').bind().all();
		return session.results;
	} catch (e: any) {
		console.error('Error parsing JSON body:', e.message);
		return { error: 'Invalid JSON body' };
	}
	// // const { sessionName, playerName, playerLimit, timeLimit } = requestBody;

	// // Example: Log the received data
	// console.log('Session Name:', sessionName);
	// console.log('Player Name:', playerName);
	// console.log('Player Limit:', playerLimit);
	// console.log('Time Limit:', timeLimit);
};

export default createGameSession;
