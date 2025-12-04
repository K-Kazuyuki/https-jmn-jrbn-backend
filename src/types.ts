// 共通型定義

export interface Env {
	DB: D1Database;
}

// DBモデル
export interface GameSession {
	SessionId: string;
	GameName: string;
	UserLimit: number;
	TimeLimit: number;
	GamePhase: number;
	CurrentRound: number;
	ProgressMode: 'all_ready' | 'time_limit';
	CreatedAt: string;
	StartedAt: string | null;
	EndedAt: string | null;
}

export interface GameSessionUser {
	SessionId: string;
	UserId: string;
	JoinOrder: number;
	LastActiveAt: string;
	IsActive: number;
}

export interface GameSessionUserInfo {
	SessionId: string;
	UserId: string;
	InGameUserName: string;
}

export interface GameStory {
	StoryId: string;
	SessionId: string;
	StoryIndex: number;
	CreatedAt: string;
}

export interface GameStoryText {
	TextId: string;
	StoryId: string;
	UserId: string;
	TextOrder: number;
	Content: string;
	CreatedAt: string;
}

export interface Settings {
	SettingKey: string;
	SettingValue: string;
	Description: string;
}

export interface User {
	UserId: string;
	Name: string;
	CreatedAt: string;
}

// APIレスポンス
export interface ApiResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: string;
}

// ゲーム状態
export interface GameStatus {
	session: GameSession;
	players: Array<{
		userId: string;
		inGameName: string;
		isActive: boolean;
		joinOrder: number;
	}>;
	currentRound: number;
	totalRounds: number;
	myStoryIndex: number | null;
	previousText: string | null;
	storyTitle: string | null;
	hasSubmittedThisRound: boolean;
	readyPlayers: string[];
	entryWord: string;
	roundStartedAt: string | null;
}

// プロフィール用
export interface GameHistoryItem {
	sessionId: string;
	gameName: string;
	createdAt: string;
	endedAt: string | null;
	playerCount: number;
}

export interface StoryDetail {
	storyId: string;
	storyIndex: number;
	texts: Array<{
		textOrder: number;
		content: string;
		userId: string;
		userName: string;
	}>;
}
