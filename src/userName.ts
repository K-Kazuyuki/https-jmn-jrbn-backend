import { Env } from './index';

type RequestBody = {
	id: string;
	name?: string;
};

export const getUserName = async (request: Request, env: Env): Promise<any> => {
	try {
		const requestBody = (await request.json()) as RequestBody;
		const user = await env.DB.prepare('SELECT Name FROM User WHERE UserId = ?;').bind(requestBody.id).first();
		if (!user) {
			return { error: 'User does not exist' };
		}
		return { name: user.Name };
	} catch (error) {
		console.error('Error getting user name:', error);
		return { error: 'Internal Server Error' };
	}
};

const registerUser = async (req: Request, env: Env): Promise<any> => {
	try {
		const requestBody = (await req.json()) as RequestBody;
		const id = requestBody.id;
		const name = requestBody.name ?? '';
		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?;').bind(id).all();
		if (userExists.results.length === 0) {
			return await env.DB.prepare('INSERT INTO User (UserId, Name) VALUES (?, ?);').bind(id, name).run();
		} else {
			return await env.DB.prepare('UPDATE User SET Name = ? WHERE UserId = ?;').bind(name, id).run();
		}
	} catch (error) {
		console.error('Error registering user:', error);
		return { error: 'Internal Server Error', status: 500, ok: false };
	}
};

export default registerUser;
