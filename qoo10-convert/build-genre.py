#!/usr/bin/env python3
"""genre-table.csv（楽天ジャンルID,Qoo10小分類コード）を index.html の DEFAULT_GENRE に埋め込む。
対応表を差し替えたら: python3 qoo10-convert/build-genre.py（その後 APP_VERSION を +1）"""
import csv, json, re, pathlib
d = pathlib.Path(__file__).parent
m = {}
for r in list(csv.reader(open(d / 'genre-table.csv', encoding='utf-8-sig')))[1:]:
    if len(r) >= 2 and r[0].strip() and r[1].strip():
        m[r[0].strip()] = r[1].strip()
p = d / 'index.html'
t = p.read_text(encoding='utf-8')
new = 'const DEFAULT_GENRE = ' + json.dumps(m, separators=(',', ':')) + ';'
t, n = re.subn(r'^const DEFAULT_GENRE = .*;$', lambda _: new, t, count=1, flags=re.M)
assert n == 1, 'DEFAULT_GENRE の行が見つかりません'
p.write_text(t, encoding='utf-8')
print(f'{len(m)} 件を埋め込みました')
