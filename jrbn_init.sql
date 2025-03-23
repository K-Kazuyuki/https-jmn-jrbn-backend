CREATE TABLE GameSession (
	SessionId INTEGER PRIMARY KEY AUTOINCREMENT,
	GameName TEXT,
	UserLimit INTEGER,
	TimeLimit INTEGER,
	GamePhase INTEGER
);

CREATE TABLE GameSessionEntryWord (
	SessionId INTEGER,
	EntryWord TEXT,
	PRIMARY KEY (SessionId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId)
);

CREATE TABLE User (
	UserId INTEGER PRIMARY KEY AUTOINCREMENT,
	Name TEXT
);

CREATE TABLE GameSessionUser (
	SessionId INTEGER,
	UserId INTEGER,
	PRIMARY KEY (SessionId, UserId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

CREATE TABLE GameSessionUserInfo (
	SessionId INTEGER,
	UserId INTEGER,
	RandomNum INTEGER,
	InGameUserName TEXT,
	PRIMARY KEY (SessionId, UserId),
	FOREIGN KEY (SessionId) REFERENCES GameSession(SessionId),
	FOREIGN KEY (UserId) REFERENCES User(UserId)
);

-- INSERT INTO GameSession (GameName, UserLimit, TimeLimit, GamePhase) VALUES ('test', 4, 60, 0);
-- INSERT INTO GameSessionEntryWord (SessionId, EntryWord) VALUES (1, 'test');
-- INSERT INTO User (Name) VALUES ('test1');
-- INSERT INTO User (Name) VALUES ('test2');
-- INSERT INTO User (Name) VALUES ('test3');
-- INSERT INTO User (Name) VALUES ('test4');
-- INSERT INTO GameSessionUser (SessionId, UserId) VALUES (1, 1);
-- INSERT INTO GameSessionUser (SessionId, UserId) VALUES (1, 2);
-- INSERT INTO GameSessionUser (SessionId, UserId) VALUES (1, 3);
-- INSERT INTO GameSessionUser (SessionId, UserId) VALUES (1, 4);
-- INSERT INTO GameSessionUserInfo (SessionId, UserId, RandomNum, InGameUserName) VALUES (1, 1, 42, 'Player1');
-- INSERT INTO GameSessionUserInfo (SessionId, UserId, RandomNum, InGameUserName) VALUES (1, 2, 17, 'Player2');
-- INSERT INTO GameSessionUserInfo (SessionId, UserId, RandomNum, InGameUserName) VALUES (1, 3, 23, 'Player3');
-- INSERT INTO GameSessionUserInfo (SessionId, UserId, RandomNum, InGameUserName) VALUES (1, 4, 8, 'Player4');
