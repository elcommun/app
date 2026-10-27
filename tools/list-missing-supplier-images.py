#!/usr/bin/env python3
"""仕入れ商品アプリ（supplier-ranking）で画像が登録されていない商品を、楽天の商品管理番号で一覧にする

  python3 tools/list-missing-supplier-images.py --from 2026-10-21 [--to 2026-10-26] [-o 出力.csv]

販売データを取り込んだら、取り込んだ期間を指定して実行する（2026-10-27 ユーザー指示）。
- 標準出力の最後の行が、RMS の「CSVファイルダウンロード」→「商品管理番号で絞り込む」にそのまま貼れる
  コンマ区切りの商品管理番号（その期間の個数の多い順）。これを取り込みの報告に書き、CSV も渡す
- 画像の有無は supplier-ranking/image-index.js で判定する。商品番号はアプリと同じく normalizeApjCode と
  MERGE_CODE_RULES で読み替えてから見る（まとめ先の商品に画像があれば対象外）
- 楽天の商品管理番号は supplier-ranking/index.html の rakutenCodeBase と同じ規則で求める。ただし apj- の商品は、
  apj- の後ろの最初の区切りまで（例: apj-nlf22_31-ブラック-0020248626 → nlf22_31）。色などの選択肢が無い単品
  （バリエーション名が空）は商品番号そのもの（例: sh-305119、rft-GBA-62203）
- CSV は UTF-8（BOM 付き）。Excel でそのまま開ける
"""
import argparse, collections, csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'supplier-ranking')

# supplier-ranking/index.html の APJ_CODE_FIXUPS・MERGE_CODE_RULES と同じ（変えるときはそろえる）
APJ_CODE_FIXUPS = {'apj-wf61_91': 'apj-wf61_91_1'}
MERGE_CODE_RULES = [
    (re.compile(r'^apj-af00_00', re.I), 'apj-af00_00'),
    (re.compile(r'^(made2(WH|BK)|af-made\d(BK|SV|GD|WH))$', re.I), 'apj-af00_00'),
    (re.compile(r'^apj-wf00_00', re.I), 'apj-wf00_00'),
    (re.compile(r'^(apj-wf_tenugui\d+|apj-wf_zaiko-sp\d+[a-z]*|apj-wf99_97)$', re.I), 'apj-wf00_00'),
]


def load_js_object(path, marker):
    with open(path, encoding='utf-8') as f:
        t = f.read()
    i = t.index('{', t.index(marker))
    return json.JSONDecoder().raw_decode(t[i:])[0]


def img_key(code):
    """アプリの imgKey と同じ: 小文字にし、a-z 0-9 _ - 以外を ~16進コードポイント~ にする"""
    return re.sub(r'[^a-z0-9_-]', lambda m: '~%x~' % ord(m.group(0)), str(code or '').strip().lower())


def normalize_apj_code(code):
    """アプリの normalizeApjCode と同じ"""
    c = str(code or '').strip()
    if not c:
        return c
    if re.match(r'^apj-mgt-', c, re.I):
        return c[4:]
    if re.match(r'^(af|wf)\d', c, re.I):
        m = re.match(r'^(af|wf)(\d+)[x_](\d+)', c, re.I)
        if m:
            base = 'apj-%s%s_%s' % (m.group(1).lower(), m.group(2), m.group(3))
            return APJ_CODE_FIXUPS.get(base, base)
        return 'apj-' + c
    if re.match(r'^apj-', c, re.I):
        norm = re.sub(r'(\d)x(\d)', r'\1_\2', c, flags=re.I)
        return APJ_CODE_FIXUPS.get(norm, norm)
    return c


def app_code(code):
    c = normalize_apj_code(code)
    for rx, to in MERGE_CODE_RULES:
        if rx.match(c):
            return to
    return c


def rakuten_item_no(code, vari=''):
    """楽天の商品管理番号（アプリの rakutenCodeBase と同じ規則。apj- は最初の区切りまで。
    色などの選択肢が無い単品（バリエーション名が空）は、商品番号そのもの）"""
    c = str(code or '').strip()
    if re.match(r'^ak-', c, re.I):
        return c
    m = re.match(r'^apj-([^-]+)', c, re.I)
    if m:
        return m.group(1)
    m = re.match(r'^([a-z]+\d+_\d+(_\d+)?)(-|$)', c, re.I)   # apj- が付いていない額縁の品番（nlf30_40-シルバー-… → nlf30_40）
    if m:
        return m.group(1)
    if not str(vari or '').strip():
        return c
    if not re.match(r'^[a-z0-9]', c):
        return ''
    if re.match(r'^ldw001-', c, re.I):
        return 'ldw001-'
    m = re.match(r'^pb-[a-z0-9]*([A-Z][A-Z0-9]*)$', c)
    if m and m.group(1)[:-1]:
        return 'pb-' + m.group(1)[:-1].lower()
    m = re.match(r'^8mw-[^-]+-', c, re.I)
    if m:
        return m.group(0)
    segs = c.split('-')
    if len(segs) < 3:
        return ''
    for i in range(2, len(segs) - 1):
        s = segs[i].lower()
        if s and any(t.lower() == s or t.lower().startswith(s) for t in segs[:i]):
            return '-'.join(segs[:i]) + '-'
    return re.sub(r'[^-]*$', '', c)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--from', dest='dfrom', required=True, help='対象期間の開始日（YYYY-MM-DD）')
    ap.add_argument('--to', dest='dto', help='対象期間の終了日（省略時はデータの最終日）')
    ap.add_argument('-o', '--out', help='一覧を書き出す CSV のパス')
    a = ap.parse_args()

    d = load_js_object(os.path.join(APP, 'data.js'), 'PRELOADED')
    have = load_js_object(os.path.join(APP, 'image-index.js'), 'IMG_INDEX')
    dto = a.dto or d.get('date_to') or '9999-12-31'

    qty = collections.Counter()
    last = {}
    for r in d['records']:
        if a.dfrom <= r[0] <= dto:
            qty[r[2]] += r[3]
            if r[0] > last.get(r[2], ''):
                last[r[2]] = r[0]

    rows = {}
    for pid, q in qty.items():
        p = d['products'].get(pid)
        if not p or not p[3]:
            continue
        code = app_code(p[3])
        if img_key(code) in have:
            continue
        row = rows.get(code)
        if row:
            row['qty'] += q
            row['last'] = max(row['last'], last[pid])
            continue
        rows[code] = {'item': rakuten_item_no(code, p[2]), 'code': code, 'maker': p[0], 'name': p[1],
                      'vari': p[2] or '', 'qty': q, 'last': last[pid]}

    items = sorted(rows.values(), key=lambda r: (-r['qty'], r['code']))
    order, seen = [], set()
    for r in items:
        if r['item'] and r['item'] not in seen:
            seen.add(r['item'])
            order.append(r['item'])

    print(f'期間 {a.dfrom}〜{dto}：画像なし {len(items)} 件（{sum(r["qty"] for r in items)} 個）・楽天の商品管理番号 {len(order)} 件')
    for r in items:
        print(f'  {r["item"] or "（管理番号を出せない）"}\t{r["code"]}\t{r["maker"]}\t{r["name"]}\t{r["vari"]}\t{r["qty"]}個')
    if a.out:
        with open(a.out, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.writer(f)
            w.writerow(['楽天の商品管理番号', '商品番号', 'メーカー', '商品名', 'バリエーション', f'個数（{a.dfrom}〜{dto}）', '最終販売日'])
            for r in items:
                w.writerow([r['item'], r['code'], r['maker'], r['name'], r['vari'], r['qty'], r['last']])
        print(f'CSV: {a.out}')
    print('商品管理番号（コンマ区切り）:')
    print(','.join(order))


if __name__ == '__main__':
    sys.exit(main())
