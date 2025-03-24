DROP TABLE IF EXISTS GameSessionUserInfo;
DROP TABLE IF EXISTS GameSessionUser;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS GameSessionEntryWord;
DROP TABLE IF EXISTS GameSession;

CREATE TABLE GameSession (
	SessionId TEXT PRIMARY KEY,
	GameName TEXT,
	UserLimit INTEGER,
	TimeLimit INTEGER,
	GamePhase INTEGER
);

CREATE TABLE GameSessionEntryWord (
	SessionId TEXT,
	EntryWord TEXT,
	PRIMARY KEY (SessionId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId)
);

CREATE TABLE User (
	UserId TEXT PRIMARY KEY,
	Name TEXT
);

CREATE TABLE GameSessionUser (
	SessionId TEXT,
	UserId INTEGER,
	PRIMARY KEY (SessionId, UserId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

CREATE TABLE GameSessionUserInfo (
	SessionId TEXT,
	UserId INTEGER,
	RandomNum INTEGER,
	InGameUserName TEXT,
	PRIMARY KEY (SessionId, UserId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);
INSERT INTO User (UserId, Name) VALUES ('', 'GUEST');
