-- じゃれぼん データベーススキーマ
-- 既存テーブルを削除

DROP TABLE IF EXISTS GameStoryText;
DROP TABLE IF EXISTS GameStory;
DROP TABLE IF EXISTS GameSessionUserInfo;
DROP TABLE IF EXISTS GameSessionUser;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS GameSessionEntryWord;
DROP TABLE IF EXISTS GameSession;
DROP TABLE IF EXISTS Settings;

-- 設定テーブル
CREATE TABLE Settings (
	SettingKey TEXT PRIMARY KEY,
	SettingValue TEXT,
	Description TEXT
);

-- 初期設定値
INSERT INTO Settings (SettingKey, SettingValue, Description) VALUES
	('DISCONNECT_TIMEOUT_SEC', '30', 'ユーザー切断判定までの秒数'),
	('POLLING_INTERVAL_MS', '3000', 'ポーリング間隔（ミリ秒）'),
	('DEFAULT_TIME_LIMIT_MIN', '4', 'デフォルトの制限時間（分）');

-- ゲームセッション
CREATE TABLE GameSession (
	SessionId TEXT PRIMARY KEY,
	GameName TEXT NOT NULL,
	UserLimit INTEGER NOT NULL,
	TimeLimit INTEGER NOT NULL,
	GamePhase INTEGER NOT NULL DEFAULT 0,
	CurrentRound INTEGER NOT NULL DEFAULT 0,
	ProgressMode TEXT NOT NULL DEFAULT 'all_ready',
	CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
	StartedAt TEXT,
	EndedAt TEXT
);
-- GamePhase: 0=待機中, 1=執筆中, 2=終了
-- ProgressMode: 'all_ready'=全員完了で進む, 'time_limit'=時間経過で進む

-- ゲームセッションの合言葉
CREATE TABLE GameSessionEntryWord (
	SessionId TEXT PRIMARY KEY,
	EntryWord TEXT NOT NULL UNIQUE,
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId)
);

-- ユーザー
CREATE TABLE User (
	UserId TEXT PRIMARY KEY,
	Name TEXT NOT NULL,
	CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ゲームセッション参加者
CREATE TABLE GameSessionUser (
	SessionId TEXT NOT NULL,
	UserId TEXT NOT NULL,
	JoinOrder INTEGER NOT NULL,
	LastActiveAt TEXT NOT NULL DEFAULT (datetime('now')),
	IsActive INTEGER NOT NULL DEFAULT 1,
	PRIMARY KEY (SessionId, UserId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

-- ゲームセッション参加者情報
CREATE TABLE GameSessionUserInfo (
	SessionId TEXT NOT NULL,
	UserId TEXT NOT NULL,
	InGameUserName TEXT NOT NULL,
	PRIMARY KEY (SessionId, UserId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

-- 物語（各セッションでプレイヤー数分の物語が生成される）
CREATE TABLE GameStory (
	StoryId TEXT PRIMARY KEY,
	SessionId TEXT NOT NULL,
	StoryIndex INTEGER NOT NULL,
	CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId)
);

-- 物語のテキストパート
CREATE TABLE GameStoryText (
	TextId TEXT PRIMARY KEY,
	StoryId TEXT NOT NULL,
	UserId TEXT NOT NULL,
	TextOrder INTEGER NOT NULL,
	Content TEXT NOT NULL,
	CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
	FOREIGN KEY (StoryId) REFERENCES GameStory(StoryId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

-- ラウンド完了通知
CREATE TABLE GameRoundReady (
	SessionId TEXT NOT NULL,
	UserId TEXT NOT NULL,
	Round INTEGER NOT NULL,
	ReadyAt TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (SessionId, UserId, Round),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

-- ゲストユーザー
INSERT INTO User (UserId, Name) VALUES ('', 'GUEST');
