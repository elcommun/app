#!/usr/bin/env python3
"""Yahoo の「スペック一覧」CSV（列：id,name,path_name,spec_id,spec_name,spec_value_name,spec_value_id,selection_type,data_type。
ストアクリエイターProからのダウンロード。約38MBなのでリポジトリには入れない）から、
code-table.csv で使っている spec_id だけを抜き出して spec-data.js を作る。
使い方: python3 rakuten-yahoo-codes/build-spec.py "<スペック一覧.csv>"
  → rakuten-yahoo-codes/spec-data.js（SPEC_DEF = {spec_id: [項目名, selection_type, data_type, [[値名, 値ID], ...]]}）
作ったら、rakuten-yahoo-codes と rakuten-yahoo の APP_VERSION と spec-data.js?v=N を +1"""
import csv, json, os, sys
csv.field_size_limit(10**9)
here = os.path.dirname(os.path.abspath(__file__))
if len(sys.argv) < 2:
    sys.exit(__doc__)
used = set()
for r in list(csv.reader(open(os.path.join(here, 'code-table.csv'), encoding='utf-8-sig')))[1:]:
    if r and len(r) >= 5 and r[4].strip():
        used.add(r[4].strip())
raw = open(sys.argv[1], 'rb').read()
try:
    text = raw.decode('utf-8-sig')
except UnicodeDecodeError:
    text = raw.decode('cp932', errors='replace')
defs = {}
for r in list(csv.reader(text.splitlines()))[1:]:
    if len(r) < 9 or r[3] not in used:
        continue
    d = defs.setdefault(r[3], [r[4], r[7], r[8], []])
    if r[6] and [r[5], r[6]] not in d[3]:
        d[3].append([r[5], r[6]])
missing = sorted(used - set(defs))
with open(os.path.join(here, 'spec-data.js'), 'w', encoding='utf-8') as f:
    f.write('// 自動生成（build-spec.py）。直接編集しない\nconst SPEC_DEF=')
    f.write(json.dumps(defs, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
print(f'spec_id {len(defs)} 種 / 値 {sum(len(d[3]) for d in defs.values())} 件 / spec-data.js {os.path.getsize(os.path.join(here, "spec-data.js"))} バイト')
if missing:
    print('⚠ スペック一覧に無い spec_id:', missing)
