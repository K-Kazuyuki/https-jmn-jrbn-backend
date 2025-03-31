#!/bin/bash

# 削除するテーブルのリスト
TABLES=(
  "GameSessionUserInfo"
  "GameSessionUser"
  "User"
  "GameSessionEntryWord"
  "GameSession"
)

# 各テーブルを DROP するコマンドを生成
DROP_COMMANDS=""
for TABLE in "${TABLES[@]}"; do
  DROP_COMMANDS+="DROP TABLE IF EXISTS $TABLE; "
done

echo $DROP_COMMANDS
# DROP コマンドを実行
wrangler d1 execute DB --local --command="$DROP_COMMANDS"

echo "All specified tables dropped successfully."
