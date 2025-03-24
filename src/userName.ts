import { Env } from './index';

type RequestBody = {
	id: Text;
	name?: string;
};

const validateRequestBody = (body: any): body is RequestBody => {
	return (
		typeof body === 'object' && body !== null && typeof body.id === 'string' && (body.name === undefined || typeof body.name === 'string')
	);
};

export const getUserName = async (request: Request, env: Env): Promise<any> => {
	try {
		const requestBody = await request.json();
		if (!validateRequestBody(requestBody)) {
			return { error: 'Invalid request body' };
		}
		const id = requestBody.id;
		const user = await env.DB.prepare('SELECT Name FROM User WHERE UserId = ?;').bind(id).first();
		if (user === undefined || user === null) {
			return { error: 'User does not exist' };
		}
		return { name: user.Name };
	} catch (error) {
		console.error('Error getting user name:', error);
		return { error: 'Internal Server Error' };
	}
};

const registerUser = async (req: Request, env: Env, res: Response) => {
	try {
		const requestBody = await req.json();
		if (!validateRequestBody(requestBody)) {
			res.status = 400;
			res.statusText = 'Invalid request body';
			return;
		}
		const id = requestBody.id;
		const name = requestBody.name ?? '';
		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?;').bind(id).all();
		if (userExists.results.length === 0) {
			await env.DB.prepare('INSERT INTO User (UserId, Name) VALUES (?, ?);').bind(id, name).run();
		} else {
			await env.DB.prepare('UPDATE User SET Name = ? WHERE UserId = ?;').bind(name, id).run();
		}
		res.status = 200;
		res.statusText = 'OK';
	} catch (error) {
		console.error('Error registering user:', error);
		res.status = 500;
		res.statusText = 'Internal Server Error';
	}
};
export default registerUser;
