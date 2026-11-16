#!/usr/bin/env python3
"""code-table.csv（楽天ジャンルID → Yahoo product-category / spec_id の対応表・UTF-8）から data.js を作る。
対応表を差し替えたら: python3 rakuten-yahoo-codes/build-data.py → index.html の APP_VERSION と data.js?v=N を +1"""
import csv, json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
rows = list(csv.reader(open(os.path.join(here, 'code-table.csv'), encoding='utf-8-sig')))[1:]
groups, order, warn = {}, [], []
for r in rows:
    if not r or not r[0].strip():
        continue
    gid, path, ycat, yname, spec = [c.strip() for c in r[:5]]
    g = groups.get(gid)
    if g is None:
        g = groups[gid] = [gid, path, ycat, yname, []]
        order.append(gid)
    elif (g[1], g[2], g[3]) != (path, ycat, yname):
        warn.append(gid)
    if spec and spec not in g[4]:
        g[4].append(spec)
out = [groups[k] for k in order]
with open(os.path.join(here, 'data.js'), 'w', encoding='utf-8') as f:
    f.write('// 自動生成（build-data.py）。直接編集しない\nconst CODE_TABLE=')
    f.write(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
print(f'行 {len(rows)} → 楽天ジャンル {len(out)} 件 / Yahooカテゴリ {len({g[2] for g in out})} 種 / spec_id {len({s for g in out for s in g[4]})} 種')
if warn:
    print('⚠ 同じ楽天ジャンルIDで内容が食い違う行:', sorted(set(warn))); sys.exit(1)
