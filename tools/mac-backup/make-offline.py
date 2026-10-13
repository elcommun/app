#!/usr/bin/env python3
"""デスクトップのバックアップコピーを「ネット無しでも開ける」形に直す。

使い方: python3 make-offline.py <バックアップのフォルダ> <ライブラリの保存先(キャッシュ)>

- *.html の中の外部ライブラリ（cdnjs / jsdelivr / unpkg / jQuery CDN）を、初回だけダウンロードして
  <バックアップ>/_libs/ に置き、読み込み先を相対パスに書き換える
- Google Fonts の読み込みは外す（文字は Mac 標準の日本語フォントで表示される）
- https://elcommun.github.io/app/◯◯/ のリンクは、バックアップ内の ◯◯/index.html に書き換える
  （file:// ではフォルダを開いても index.html が自動で開かないため）
- ダウンロードに失敗したライブラリがあれば、終了コード 2 で終わる（次回の実行でやり直す）
"""
import re, sys, hashlib, subprocess, shutil
from pathlib import Path

root, cache = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
cache.mkdir(parents=True, exist_ok=True)
(root / "_libs").mkdir(exist_ok=True)

CDN = re.compile(r"https?://(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|code\.jquery\.com)/[^\"'\s)<>`]+")
FONT_LINK = re.compile(r"<link[^>]+(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>\s*", re.I)
FONT_IMPORT = re.compile(r"@import\s+url\(['\"]?https://fonts\.googleapis\.com[^)]*\)\s*;?", re.I)
SITE = re.compile(r"https://elcommun\.github\.io/app/(?:([A-Za-z0-9_-]+)/?)?(?![A-Za-z0-9_./-])")

def cache_name(url):
    base = url.split("?")[0].rstrip("/").split("/")[-1] or "lib.js"
    return hashlib.sha1(url.encode()).hexdigest()[:10] + "-" + base

failed = []
def fetch(url):
    dst = cache / cache_name(url)
    if dst.exists() and dst.stat().st_size > 0:
        return dst
    tmp = dst.with_suffix(dst.suffix + ".part")
    r = subprocess.run(["curl", "-fsSL", "--max-time", "120", "-o", str(tmp), url], capture_output=True)
    if r.returncode != 0 or not tmp.exists() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        failed.append(url)
        return None
    tmp.rename(dst)
    return dst

changed = 0
for f in sorted(root.rglob("*.html")):
    rel = f.relative_to(root)
    if "_libs" in rel.parts:
        continue
    depth = len(rel.parts) - 1
    up = "../" * depth
    try:
        s = f.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    o = s

    def lib(m):
        url = m.group(0)
        got = fetch(url)
        if not got:
            return url
        shutil.copy2(got, root / "_libs" / got.name)
        return f"{up}_libs/{got.name}"
    s = CDN.sub(lib, s)
    s = FONT_LINK.sub("", s)
    s = FONT_IMPORT.sub("", s)
    s = SITE.sub(lambda m: f"{up}{m.group(1)}/index.html" if m.group(1) else f"{up}index.html", s)
    if s != o:
        f.write_text(s, encoding="utf-8")
        changed += 1

print(f"オフライン化: {changed}ファイルを書き換え / ライブラリ {len(list((root/'_libs').iterdir()))}個")
if failed:
    print("ダウンロードできなかったライブラリ（ネットに繋がった時にもう一度やり直します）:")
    for u in sorted(set(failed)):
        print("  ", u)
    sys.exit(2)
