/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono';
import createGameSession from './createGameSession';
import { gameStream } from './gameStream';
import { getSessionDatas, getSessionId } from './getSessionDatas';
import getUserDatas from './getUserDatas';
import registerUser, { getUserName } from './userName';

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const app = new Hono();
		gameStream(request, env, app);
		try {
			switch (url.pathname) {
				case '/api/message':
					return Response.json('Hello, World!');
				case '/api/random':
					return Response.json(crypto.randomUUID());
				case '/api/createGameSession':
					const results = await createGameSession(request, env);
					if (results.error) {
						return Response.json(results.error, { status: 400, statusText: results.error });
					}
					return Response.json(results);
				case '/api/registerUser':
					return Response.json(await registerUser(request, env));
				case '/api/getUserName':
					return Response.json(await getUserName(request, env));
				case '/api/getSessionDatas':
					return Response.json(await getSessionDatas(request, env));
				case '/api/getSessionId':
					return Response.json(await getSessionId(request, env));
				case '/api/getUserDatas':
					return Response.json(await getUserDatas(request, env));
				default:
					return app.request(request); // Hono にリクエストを渡す
			}
		} catch (e: any) {
			return Response.json(e.message, { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
