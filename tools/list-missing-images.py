#!/usr/bin/env python3
"""販売データ Excel の商品のうち、自社商品アプリ（ranking）に画像が登録されていない商品を一覧にする

  python3 tools/list-missing-images.py <販売データ.xlsx> [...] [-o 出力.csv]

販売データを取り込んだら必ず実行し、件数と一覧を取り込みの報告に書き、CSV をユーザーに渡す
（2026-10-26 ユーザー指示。アプリの画面には出さない）。

- 画像の有無は ranking/image-index.js（アプリが画像を読む基準）で判定する
- 品番はアプリと同じく CODE_REMAP で読み替え、CODE_SKIP_PREFIXES の品番は除く（どちらも ranking/index.html から読む）
- 画像不要とユーザーが言った品番は NO_IMAGE_OK に書いて一覧から外す
- CSV は UTF-8（BOM 付き）。Excel でそのまま開ける
"""
import argparse, collections, csv, json, os, re, sys, zipfile
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

# 画像不要の品番（ユーザー指示）
NO_IMAGE_OK = {
    'XEC-004', 'XEC-005', 'XEC-006',  # EC限定ダイアリー 2022年10月始まり（2026-10-10）
}


def read_rows(path):
    """販売データ Excel の1枚目のシートを {列記号: 値} の行のリストで返す（見出し行は除く）"""
    z = zipfile.ZipFile(path)
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss = [''.join(t.text or '' for t in si.iter(NS + 't'))
              for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(NS + 'si')]
    rows = []
    for r in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(NS + 'row'):
        d = {}
        for c in r.findall(NS + 'c'):
            col = re.match(r'[A-Z]+', c.get('r')).group(0)
            t, v = c.get('t'), c.find(NS + 'v')
            if t == 'inlineStr':
                d[col] = ''.join(x.text or '' for x in c.iter(NS + 't'))
            elif t == 's' and v is not None:
                d[col] = ss[int(v.text)]
            else:
                d[col] = v.text if v is not None else None
        rows.append(d)
    return rows[1:]


def app_rules():
    """ranking/index.html から CODE_REMAP と CODE_SKIP_PREFIXES を読む"""
    s = open(os.path.join(ROOT, 'ranking', 'index.html'), encoding='utf-8').read()
    i = s.index('const CODE_REMAP={')
    body = re.sub(r'//[^\n]*', '', s[i:s.index('};', i)])
    remap = dict(re.findall(r"'([^']+)'\s*:\s*'([^']+)'", body))
    k = s.index('const CODE_SKIP_PREFIXES=[')
    skip = tuple(re.findall(r"'([^']+)'", s[k:s.index(']', k)]))
    return remap, skip


def image_index():
    s = open(os.path.join(ROOT, 'ranking', 'image-index.js'), encoding='utf-8').read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('xlsx', nargs='+')
    ap.add_argument('-o', '--out', help='一覧を書き出す CSV のパス')
    a = ap.parse_args()

    remap, skip = app_rules()
    idx = image_index()
    items = collections.OrderedDict()
    for p in a.xlsx:
        for r in read_rows(p):
            code = (r.get('F') or '').strip()
            if not code:
                continue
            code = remap.get(code, code)
            if code.startswith(skip) or code in NO_IMAGE_OK or code.replace('-', '_') in idx:
                continue
            it = items.setdefault(code, {'name': r.get('E') or '', 'cat': r.get('D') or '',
                                         'qty': 0, 'amt': 0, 'sc': r.get('K') or ''})
            it['qty'] += int(float(r.get('H') or 0))
            it['amt'] += int(float(r.get('I') or 0))
            if not it['sc'] and r.get('K'):
                it['sc'] = r['K']

    rows = sorted(items.items(), key=lambda kv: (-kv[1]['qty'], kv[0]))
    print(f'画像なし {len(rows)}件')
    for code, it in rows:
        print(f"  {code}\t{it['name']}\t{it['cat']}\t{it['qty']}個\t¥{it['amt']:,}")
    if a.out:
        with open(a.out, 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.writer(f)
            w.writerow(['品番', '商品名', 'カテゴリ（小分類）', '今回の個数', '今回の金額', '検索コード'])
            for code, it in rows:
                w.writerow([code, it['name'], it['cat'], it['qty'], it['amt'], it['sc']])
        print(f'CSV: {a.out}')


if __name__ == '__main__':
    sys.exit(main())
