/**
 * じゃれぼん バックエンドAPI
 * Cloudflare Workers + D1
 */

import { Env } from './types';
import createGameSession from './createGameSession';
import joinGameSession from './joinGameSession';
import startGame from './startGame';
import getGameStatus from './getGameStatus';
import getSessionDatas from './getSessionDatas';
import submitText from './submitText';
import markReady, { checkTimeLimit } from './markReady';
import { getUserHistory, getSessionStories } from './getUserHistory';
import registerUser, { getUserName } from './userName';
import { getSettingsApi, updateSettingsApi } from './settings';

export type { Env };

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			let result: any;

			switch (url.pathname) {
				// ユーザー管理
				case '/api/registerUser':
					result = await registerUser(request, env);
					break;

				case '/api/getUserName':
					result = await getUserName(request, env);
					break;

				// ゲームセッション管理
				case '/api/createGameSession':
					result = await createGameSession(request, env);
					break;

				case '/api/joinGameSession':
					result = await joinGameSession(request, env);
					break;

				case '/api/startGame':
					result = await startGame(request, env);
					break;

				case '/api/getSessionDatas':
					result = await getSessionDatas(request, env);
					break;

				// ゲームプレイ
				case '/api/getGameStatus':
					result = await getGameStatus(request, env);
					break;

				case '/api/submitText':
					result = await submitText(request, env);
					break;

				case '/api/markReady':
					result = await markReady(request, env);
					break;

				// 履歴・プロフィール
				case '/api/getUserHistory':
					result = await getUserHistory(request, env);
					break;

				case '/api/getSessionStories':
					result = await getSessionStories(request, env);
					break;

				// 設定
				case '/api/getSettings':
					result = await getSettingsApi(request, env);
					break;

				case '/api/updateSettings':
					result = await updateSettingsApi(request, env);
					break;

				// テスト用
				case '/api/message':
					result = { success: true, data: 'Hello, じゃれぼん!' };
					break;

				case '/api/random':
					result = { success: true, data: crypto.randomUUID() };
					break;

				default:
					return Response.json({ success: false, error: 'Not Found' }, { status: 404, headers: corsHeaders });
			}

			return Response.json(result, { headers: corsHeaders });
		} catch (e: any) {
			console.error('Unhandled error:', e.message);
			return Response.json({ success: false, error: e.message }, { status: 500, headers: corsHeaders });
		}
	},
} satisfies ExportedHandler<Env>;
