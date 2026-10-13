#!/bin/bash
# Mac のターミナルで1回だけ実行する:
#   curl -fsSL https://raw.githubusercontent.com/elcommun/app/main/tools/mac-backup/install.sh | bash
# GitHub の app を、デスクトップに「ネット無しでも開けるバックアップ」として保存し、10分ごと／ログイン時に自動更新する。
set -eu
REPO_URL="${REPO_URL:-https://github.com/elcommun/app.git}"
BASE="$HOME/.elcommun-app-backup"
DEST="$HOME/Desktop/EL COMMUNアプリ バックアップ"
PLIST="$HOME/Library/LaunchAgents/jp.co.elcommun.app-backup.plist"
LABEL="jp.co.elcommun.app-backup"
INTERVAL="${INTERVAL:-600}"

command -v git >/dev/null 2>&1 || { echo "git が使えません。ターミナルに出る「コマンドライン・デベロッパ・ツール」のインストールを済ませてから、もう一度実行してください。"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 が使えません。「コマンドライン・デベロッパ・ツール」のインストールを済ませてから、もう一度実行してください。"; exit 1; }

mkdir -p "$BASE" "$HOME/Library/LaunchAgents"
if [ ! -d "$BASE/repo/.git" ]; then
  echo "▶ GitHub から取得します（約0.5GB。初回だけ数分かかります）..."
  git clone ${SHALLOW:+--depth 1} "$REPO_URL" "$BASE/repo"
fi
cd "$BASE/repo" && git fetch -q origin main && git reset -q --hard origin/main

# 実行用のスクリプトは、更新で消えないよう $BASE にコピーして使う
mkdir -p "$BASE/bin"
cp "$BASE/repo/tools/mac-backup/backup.sh" "$BASE/repo/tools/mac-backup/make-offline.py" "$BASE/bin/"
chmod +x "$BASE/bin/backup.sh"

cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$BASE/bin/backup.sh</string></array>
  <key>RunAtLoad</key><true/>
  <key>StartInterval</key><integer>$INTERVAL</integer>
  <key>StandardErrorPath</key><string>$BASE/launchd.err</string>
</dict></plist>
PL

echo "▶ デスクトップにバックアップを作ります（ライブラリのダウンロードを含む。数分かかります）..."
rm -f "$BASE/last-sha"
/bin/bash "$BASE/bin/backup.sh"

launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo
if [ -f "$DEST/index.html" ]; then
  echo "✅ 完了: $DEST"
  echo "   ・index.html をダブルクリックで開けます（ネット無しでも動きます）"
  echo "   ・自動更新: ログイン時と ${INTERVAL} 秒ごと"
else
  echo "⚠ デスクトップにコピーできていません。ログ: $BASE/backup.log"
  echo "  システム設定 > プライバシーとセキュリティ > フルディスクアクセス で /bin/bash を許可してから、もう一度実行してください。"
fi
tail -3 "$BASE/backup.log" 2>/dev/null || true
