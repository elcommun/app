#!/usr/bin/env python3
# index.html の CDN読み込みを vendor/xlsx.full.min.js の中身で置き換え、
# ネット不要で単体動作する「オフライン版」HTMLを生成する。
# 使い方: python3 build-offline.py
import re, sys, pathlib

BASE = pathlib.Path(__file__).parent
SRC = BASE / "index.html"
LIB = BASE / "vendor" / "xlsx.full.min.js"
OUT = BASE / "raffinart-stock-tool-offline.html"

html = SRC.read_text(encoding="utf-8")
lib = LIB.read_text(encoding="utf-8")

# CDNのscriptタグを検出
pattern = re.compile(r'<script src="https://cdnjs\.cloudflare\.com/[^"]*xlsx[^"]*"></script>')
if not pattern.search(html):
    sys.exit("エラー: index.html にSheetJSのCDN読み込みタグが見つかりません")

# </script> を含まないことを確認（含むとインライン化でHTMLが壊れる）
if "</script>" in lib:
    sys.exit("エラー: ライブラリに </script> が含まれています")

inline = "<script>\n/* SheetJS xlsx.full.min.js を埋め込み（オフライン動作用） */\n" + lib + "\n</script>"
result = pattern.sub(lambda m: inline, html, count=1)

# ダウンロードリンク（オフライン版自身では不要なので削除）
result = re.sub(r'<!--OFFLINE_DL_START-->.*?<!--OFFLINE_DL_END-->', '', result, flags=re.DOTALL)

OUT.write_text(result, encoding="utf-8")
size = OUT.stat().st_size
print(f"生成完了: {OUT.name}（{size:,} bytes）")
