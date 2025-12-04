import { Env, Settings, ApiResponse } from './types';

// 設定値を取得
export async function getSetting(env: Env, key: string): Promise<string | null> {
	const result = await env.DB.prepare('SELECT SettingValue FROM Settings WHERE SettingKey = ?').bind(key).first<{ SettingValue: string }>();
	return result?.SettingValue ?? null;
}

// 設定値を更新
export async function updateSetting(env: Env, key: string, value: string): Promise<boolean> {
	const result = await env.DB.prepare('UPDATE Settings SET SettingValue = ? WHERE SettingKey = ?').bind(value, key).run();
	return result.success;
}

// すべての設定を取得
export async function getAllSettings(env: Env): Promise<Settings[]> {
	const result = await env.DB.prepare('SELECT * FROM Settings').all<Settings>();
	return result.results;
}

// API: 設定取得
export async function getSettingsApi(request: Request, env: Env): Promise<ApiResponse<Settings[]>> {
	try {
		const settings = await getAllSettings(env);
		return { success: true, data: settings };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

// API: 設定更新
export async function updateSettingsApi(request: Request, env: Env): Promise<ApiResponse> {
	try {
		const body = (await request.json()) as { key: string; value: string };
		if (!body.key || body.value === undefined) {
			return { success: false, error: 'Invalid request body' };
		}
		const success = await updateSetting(env, body.key, body.value);
		return { success };
	} catch (error: any) {
		return { success: false, error: error.message };
	}
}

// 設定キー
export const SETTING_KEYS = {
	DISCONNECT_TIMEOUT_SEC: 'DISCONNECT_TIMEOUT_SEC',
	POLLING_INTERVAL_MS: 'POLLING_INTERVAL_MS',
	DEFAULT_TIME_LIMIT_MIN: 'DEFAULT_TIME_LIMIT_MIN',
} as const;
