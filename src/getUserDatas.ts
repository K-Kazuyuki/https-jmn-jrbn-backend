import { Env, ApiResponse, User } from './types';

const getUserDatas = async (request: Request, env: Env): Promise<ApiResponse<User[]>> => {
	try {
		const result = await env.DB.prepare('SELECT * FROM User').all<User>();
		return { success: true, data: result.results };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
};

export default getUserDatas;
