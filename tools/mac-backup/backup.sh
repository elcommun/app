#!/bin/bash
# GitHub の最新版を取り込んで、デスクトップのバックアップフォルダを更新する。
# launchd から定期的に呼ばれる（変更が無ければすぐ終わる）。手動で実行してもよい。
set -u
BASE="$HOME/.elcommun-app-backup"
REPO="$BASE/repo"
DEST="$HOME/Desktop/EL COMMUNアプリ バックアップ"
LOG="$BASE/backup.log"
LOCK="$BASE/lock"
export PATH="$PATH:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"

log(){ echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }
notify(){ /usr/bin/osascript -e "display notification \"$1\" with title \"アプリのバックアップ\"" >/dev/null 2>&1 || true; }

mkdir -p "$BASE"
# 二重起動を防ぐ
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +60 2>/dev/null)" ]; then rmdir "$LOCK" 2>/dev/null; mkdir "$LOCK" 2>/dev/null || exit 0; else exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

[ -d "$REPO/.git" ] || { log "ERROR: $REPO が見つかりません。install.sh をやり直してください"; notify "バックアップ用フォルダが見つかりません"; exit 1; }
cd "$REPO" || exit 1

if ! git fetch -q origin main 2>>"$LOG"; then
  log "オフラインのため取得できませんでした（次回に再試行）"
  exit 0
fi
NEW="$(git rev-parse origin/main)"
OLD="$(cat "$BASE/last-sha" 2>/dev/null || true)"
if [ "$NEW" = "$OLD" ] && [ -d "$DEST" ]; then exit 0; fi

log "更新を取り込みます: ${OLD:0:7} -> ${NEW:0:7}"
git reset -q --hard origin/main 2>>"$LOG" || { log "ERROR: git reset 失敗"; notify "更新の取り込みに失敗しました"; exit 1; }

mkdir -p "$DEST" 2>>"$LOG" || { log "ERROR: デスクトップに書き込めません（README の「権限」を参照）"; notify "デスクトップに書き込めません。README の権限設定を確認してください"; exit 1; }
if ! rsync -a --delete --exclude='.git' --exclude='_libs' --exclude='バックアップ情報.txt' "$REPO/" "$DEST/" 2>>"$LOG"; then
  log "ERROR: rsync 失敗（デスクトップへの書き込み権限の可能性）"
  notify "デスクトップへのコピーに失敗しました。README の権限設定を確認してください"
  exit 1
fi

python3 "$REPO/tools/mac-backup/make-offline.py" "$DEST" "$BASE/libs" >>"$LOG" 2>&1
RC=$?

{
  echo "EL COMMUN アプリ バックアップ"
  echo "更新日時: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "元の版:   $NEW"
  echo "内容:     $(git log -1 --format=%s origin/main)"
  echo "開き方:   このフォルダの index.html をブラウザで開く（ネット無しでも使えます）"
} > "$DEST/バックアップ情報.txt"

if [ $RC -eq 0 ]; then
  echo "$NEW" > "$BASE/last-sha"
  log "完了"
elif [ $RC -eq 2 ]; then
  log "一部のライブラリを取得できませんでした（次回に再試行）"
else
  log "ERROR: オフライン化に失敗 (rc=$RC)"; notify "オフライン化に失敗しました。ログを確認してください"
fi
exit 0
