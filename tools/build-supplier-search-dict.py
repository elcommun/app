#!/usr/bin/env python3
"""仕入れ商品アプリ（supplier-ranking）の検索辞書 search-dict.js を作る。

自社商品アプリ（ranking/index.html）の検索同義語辞書（TRANS と TRANS_GROUPS）をそのまま取り出し、
「日本語＝英語」の語のグループの一覧として supplier-ranking/search-dict.js に書き出す。
ranking の辞書に語を足したら、このスクリプトをもう一度実行し、
supplier-ranking/index.html の <script src="search-dict.js?v=N"> の N とバージョン番号を上げる。

使い方: python3 tools/build-supplier-search-dict.py
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'ranking', 'index.html')
OUT = os.path.join(ROOT, 'supplier-ranking', 'search-dict.js')

html = open(SRC, encoding='utf-8').read()
a = html.index('const TRANS={')
b = html.index('for(const g of TRANS_GROUPS){', a)
code = html[a:b]
# TRANS_N の組み立て（normalize を使う）は除き、TRANS と TRANS_GROUPS の値だけを評価する
cut = code.index('const TRANS_N={};')
g0 = code.index('const TRANS_GROUPS=[')
js = code[:cut] + code[g0:] + '\nprocess.stdout.write(JSON.stringify({t:TRANS,g:TRANS_GROUPS}));'
out = subprocess.run(['node', '-e', js], capture_output=True, text=True)
if out.returncode:
    sys.exit('ranking の辞書を読めませんでした:\n' + out.stderr)
d = json.loads(out.stdout)

groups, seen = [], set()
def add(g):
    g = [str(w) for w in g if str(w).strip()]
    key = tuple(sorted(set(w.lower() for w in g)))
    if len(key) >= 2 and key not in seen:
        seen.add(key)
        groups.append(g)
for k, v in d['t'].items():
    add([k] + list(v))
for g in d['g']:
    add(g)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// 自動生成（tools/build-supplier-search-dict.py）。ranking/index.html の検索同義語辞書（TRANS・TRANS_GROUPS）の写し。直接編集しない\n')
    f.write('// 仕入れ商品だけの語は supplier-ranking/index.html の SUP_TRANS_GROUPS に足す\n')
    f.write('const SEARCH_DICT=' + json.dumps(groups, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'{os.path.relpath(OUT, ROOT)}: {len(groups)} グループ（{os.path.getsize(OUT)//1024}KB）')
