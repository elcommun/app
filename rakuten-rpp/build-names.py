#!/usr/bin/env python3
"""ranking/data.js の商品マスタから、RPPアプリ用の「商品管理番号/品番 → 商品名」スナップショットを作る。

  python3 rakuten-rpp/build-names.py

- 出力: rakuten-rpp/item-names.js（window.RPP_NAMES = {page:{...}, code:{...}}）
  - page: 検索コード（楽天の商品管理番号。例 mg-46-）→ その商品ページの商品名（色違いの共通部分）
  - code: 品番（小文字）→ 商品名
- ranking の販売データを更新しても自動では反映されない。更新したいときに再実行し、
  index.html の <script src="item-names.js?v=N"> の ?v=N を上げる
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
s = (ROOT / "ranking" / "data.js").read_text(encoding="utf-8")
i = s.index('"products":') + len('"products":')
products, _ = json.JSONDecoder().raw_decode(s[i:])

def common_name(names):
    """色違いの商品名から共通部分（語単位）を取り出す"""
    if len(names) == 1:
        return names[0]
    words = [n.split(" ") for n in names]
    out = []
    for parts in zip(*words):
        if all(p == parts[0] for p in parts):
            out.append(parts[0])
        else:
            break
    return " ".join(out) if out else names[0]

def natural(code):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", code)]

def year_of(name):
    m = re.search(r"(20\d\d)年", name)
    return m.group(1) if m else ""

pages, codes = {}, {}
for code, (name, _price, sc) in sorted(products.items(), key=lambda kv: natural(kv[0])):
    codes[code.lower()] = name
    sc = (sc or "").strip().lower()
    if sc:
        pages.setdefault(sc, []).append(name)
# 検索コードは年版をまたいで同じなので、いちばん新しい品番と同じ年版の商品だけで共通部分を取る
page = {}
for k, names in pages.items():
    y = year_of(names[-1])
    page[k] = common_name([n for n in names if year_of(n) == y])

out = ROOT / "rakuten-rpp" / "item-names.js"
out.write_text(
    "// ranking/data.js の商品マスタから作った 商品管理番号/品番 → 商品名（自動生成。rakuten-rpp/build-names.py）\n"
    "window.RPP_NAMES = " + json.dumps({"page": page, "code": codes}, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"商品ページ {len(page):,} 件 / 品番 {len(codes):,} 件 → {out.relative_to(ROOT)} ({out.stat().st_size/1024:.0f}KB)")
