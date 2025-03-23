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

import createGameSession from "./createGameSession";

export interface Env {
	DB: D1Database;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		switch (url.pathname) {
			case '/message':
				return Response.json('Hello, World!');
			case '/random':
				return Response.json(crypto.randomUUID());
			case '/createGameSession':
				return await createGameSession(env as Env);
			default:
				return Response.json('Not Found', { status: 404 });
		}
	},
} satisfies ExportedHandler<Env>;
