#!/bin/bash
# 自動バックアップを止める（デスクトップのフォルダは消さない）
LABEL="jp.co.elcommun.app-backup"
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "自動バックアップを停止しました。デスクトップのフォルダと ~/.elcommun-app-backup は残してあります。"
