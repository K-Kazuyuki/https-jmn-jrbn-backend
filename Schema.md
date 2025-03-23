# Schema

## ref

- [cloudflare d1](https://zenn.dev/kameoncloud/articles/6264967e5fd1da)

## Database

```mermaid
erDiagram
	GameSession {
		int SessionId PK
		text GameName
		int UserLimit
		int TimeLimit
		int GamePhase
	}

    GameSessionEntryWord {
        int SessionId PK
        text EntryWord
    }

    User {
        int UserId PK
        text Name
    }

    GameSessionUser {
        int SessionId PK
        int UserId PK
    }

    GameSessionUserInfo {
        int SessionId PK
        int UserId PK
        int RandomNum
        text InGameUserName
    }

    GameSessionEntryWord ||--o{ GameSession : contains
    GameSessionUser ||--o{ GameSession : contains
    GameSessionUserInfo ||--o{ GameSession : contains
    GameSessionUser ||--o{ User : contains
    GameSessionUserInfo ||--o{ User : contains

```
