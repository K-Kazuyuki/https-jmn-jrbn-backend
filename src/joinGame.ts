import { Env } from './index';

type JoinGame = {
	sessionId: string;
	playerName: string;
	userId: string;
};
const joinGame = async (req: Request, env: Env): Promise<any> => {};
export default joinGame;
