import { Env, ApiResponse } from './types';

interface RegisterUserRequest {
	id: string;
	name?: string;
}

interface GetUserNameRequest {
	id: string;
}

const validateRegisterRequest = (body: any): body is RegisterUserRequest => {
	return (
		typeof body === 'object' && body !== null && typeof body.id === 'string' && (body.name === undefined || typeof body.name === 'string')
	);
};

const validateGetUserNameRequest = (body: any): body is GetUserNameRequest => {
	return typeof body === 'object' && body !== null && typeof body.id === 'string';
};

export const getUserName = async (request: Request, env: Env): Promise<ApiResponse<{ name: string }>> => {
	try {
		const requestBody = await request.json();
		if (!validateGetUserNameRequest(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { id } = requestBody;
		const user = await env.DB.prepare('SELECT Name FROM User WHERE UserId = ?').bind(id).first<{ Name: string }>();

		if (!user) {
			return { success: false, error: 'User does not exist' };
		}

		return { success: true, data: { name: user.Name } };
	} catch (error: any) {
		console.error('Error getting user name:', error);
		return { success: false, error: 'Internal Server Error' };
	}
};

const registerUser = async (request: Request, env: Env): Promise<ApiResponse> => {
	try {
		const requestBody = await request.json();
		if (!validateRegisterRequest(requestBody)) {
			return { success: false, error: 'Invalid request body' };
		}

		const { id, name = '' } = requestBody;
		const now = new Date().toISOString();

		const userExists = await env.DB.prepare('SELECT 1 FROM User WHERE UserId = ?').bind(id).first();

		if (!userExists) {
			await env.DB.prepare('INSERT INTO User (UserId, Name, CreatedAt) VALUES (?, ?, ?)').bind(id, name, now).run();
		} else {
			await env.DB.prepare('UPDATE User SET Name = ? WHERE UserId = ?').bind(name, id).run();
		}

		return { success: true };
	} catch (error: any) {
		console.error('Error registering user:', error);
		return { success: false, error: 'Internal Server Error' };
	}
};

export default registerUser;
