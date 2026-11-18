#!/usr/bin/env python3
"""楽天ジャンルID → auPAYカテゴリID の「自動対応表」を作って index.html に埋め込む。

使い方:
  python3 rakuten-aupay/build-genre-auto.py <楽天ジャンルCSV(ジャンルID,パス名)> <auPAYカテゴリxlsx>

- 手作業で確認済みの GENRE_MAP（実績データ由来）は変更しない。自動対応はそれに無いジャンルだけ。
- パス名の一致で「確実に近いもの」だけを採用する（迷うものは入れない→従来どおり未登録の警告）。
- このショップに不要そうなジャンル（車・食品・医薬品・CD/DVD・ゲーム・楽器・ゴルフ等）は省く。
- 出力: index.html の GENRE_MAP_AUTO（ジャンルID→auPAYカテゴリID）と AUPAY_CAT_PATH（そのIDのパス名）
"""
import csv, json, re, sys, unicodedata, zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
HTML = 'rakuten-aupay/index.html'


def read_xlsx(path):
    z = zipfile.ZipFile(path)
    ss = [''.join(t.text or '' for t in si.iter('{%s}t' % NS['m']))
          for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS)]
    rows = []
    for r in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter('{%s}row' % NS['m']):
        cells = {}
        for c in r.findall('m:c', NS):
            v = c.find('m:v', NS)
            if v is None:
                continue
            cells[re.match(r'[A-Z]+', c.get('r')).group()] = ss[int(v.text)] if c.get('t') == 's' else v.text
        rows.append(cells)
    return rows


def read_rakuten(path):
    for enc in ('utf-8-sig', 'cp932'):
        try:
            rows = list(csv.reader(open(path, encoding=enc, newline='')))
            break
        except UnicodeDecodeError:
            pass
    return {r[0]: r[1] for r in rows[1:] if len(r) >= 2}


def norm(s):
    s = unicodedata.normalize('NFKC', s)
    return re.sub(r'[\s・,、/／&＆]', '', s).replace('その他', '')


# 楽天の第1階層 → auPAYの第1階層（候補）。ここに無い第1階層は不要として省く
TOP = {
    '日用品雑貨・文房具・手芸': ['日用品・文房具・手芸用品'],
    'インテリア・寝具・収納': ['インテリア・寝具'],
    'キッチン用品・食器・調理器具': ['キッチン・食器・調理'],
    'バッグ・小物・ブランド雑貨': ['バッグ・財布・ファッション小物'],
    'ジュエリー・アクセサリー': ['アクセサリー・ジュエリー'],
    'おもちゃ': ['おもちゃ・趣味'], 'ホビー': ['おもちゃ・趣味'],
    '花・ガーデン・DIY': ['花・ガーデン・DIY工具'],
    'インナー・下着・ナイトウェア': ['インナー・ルームウェア'],
    'レディースファッション': ['レディースファッション'], 'メンズファッション': ['メンズファッション'],
    '靴': ['レディースファッション', 'メンズファッション'],
    '美容・コスメ・香水': ['ビューティ・コスメ'],
    '本・雑誌・コミック': ['本・コミック・雑誌', 'おもちゃ・趣味', '日用品・文房具・手芸用品'],
    'パソコン・周辺機器': ['パソコン・PC周辺機器'],
    '家電': ['家電'],
    'スポーツ・アウトドア': ['スポーツ・アウトドア'],
}
# 第1階層の中でさらに絞る（第2階層の許可リスト。None=全部）
KEEP_SECOND = {
    '本・雑誌・コミック': {'ポスター', 'カレンダー'},
    'パソコン・周辺機器': {'PCアクセサリー'},
    '家電': {'季節・空調家電'},
    'スポーツ・アウトドア': {'アウトドア'},
    '花・ガーデン・DIY': {'ガーデニング・農業', '花・観葉植物', 'ガーデン・エクステリア'},
    '日用品雑貨・文房具・手芸': None,
}
DROP_SECOND = {'日用品雑貨・文房具・手芸': {'宗教用品'}}


def main(rk_path, au_path):
    au = [r for r in read_xlsx(au_path)[1:] if 'A' in r and 'B' in r]
    nodes = {r['A']: r['B'].split('>') for r in au}
    paths = set('>'.join(p) for p in nodes.values())
    leaf = {i: p for i, p in nodes.items()
            if not any(q.startswith('>'.join(p) + '>') for q in paths)}
    rk = read_rakuten(rk_path)

    def cands(rp):
        allowed = TOP[rp[0]]
        return [(i, p) for i, p in leaf.items() if p[0] in allowed]

    def anc(rp, ap):
        ra = [norm(x) for x in rp[1:-1]]
        aa = [norm(x) for x in ap[1:-1]]
        return sum(1 for x in ra if x and any(x == y or (len(x) >= 3 and (x in y or y in x)) for y in aa))

    def score(rp, ap):
        rl, al = norm(rp[-1]), norm(ap[-1])
        s = 0
        if rl and rl == al:
            s += 100
        elif rl and al and (rl in al or al in rl) and min(len(rl), len(al)) >= 2:
            s += 60 * min(len(rl), len(al)) / max(len(rl), len(al)) + 20
        else:
            rt = {t for t in re.split(r'[・、]', unicodedata.normalize('NFKC', rp[-1])) if t and t != 'その他'}
            at = {t for t in re.split(r'[・、]', unicodedata.normalize('NFKC', ap[-1])) if t and t != 'その他'}
            if rt & at:
                s += 40 * len(rt & at) / max(len(rt), len(at))
        return s + 12 * anc(rp, ap)

    def decide(rp):
        if norm(rp[-1]) == '' and len(rp) > 1:  # 楽天の「その他」→ 親に近いauPAYの「その他〜」
            par = rp[:-1]
            best, tie = None, False
            for i, p in cands(rp):
                if not p[-1].startswith('その他'):
                    continue
                a, b = norm(p[-2]), norm(par[-1])
                if a != b and not (len(b) >= 3 and (b in a or a in b)):
                    continue
                s = anc(par, p)
                if best is None or s > best[0]:
                    best, tie = (s, i), False
                elif s == best[0]:
                    tie = True
            return best[1] if best and not tie and best[0] >= 1 else None
        cs = sorted(((score(rp, p), i, p) for i, p in cands(rp)), reverse=True)
        if not cs:
            return None
        s1, i1, p1 = cs[0]
        s2 = cs[1][0] if len(cs) > 1 else 0
        exact = norm(rp[-1]) == norm(p1[-1])
        am = anc(rp, p1)
        if exact and am >= 1 and s1 > s2:
            return i1
        if exact and am == 0 and s1 > s2 + 30 and len(rp) <= 2:
            return i1
        if not exact and s1 >= 70 and s1 > s2 + 15 and am >= 1:
            return i1
        return None

    html = open(HTML, encoding='utf-8').read()
    known = json.loads(re.search(r'const GENRE_MAP = (\{[^;]*\});', html).group(1))

    out = {}
    for g, path in rk.items():
        rp = path.split('>')
        if rp[0] not in TOP or g in known:
            continue
        keep = KEEP_SECOND.get(rp[0])
        if keep is not None and (len(rp) < 2 or rp[1] not in keep):
            continue
        if len(rp) > 1 and rp[1] in DROP_SECOND.get(rp[0], ()):
            continue
        d = decide(rp)
        if d:
            out[g] = d

    used = sorted(set(out.values()), key=int)
    paths_out = {i: ':'.join(nodes[i]) for i in used}
    out = dict(sorted(out.items(), key=lambda kv: int(kv[0])))
    block = ('const GENRE_MAP_AUTO = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
             'const AUPAY_CAT_PATH = ' + json.dumps(paths_out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    if 'const GENRE_MAP_AUTO' in html:
        html = re.sub(r'const GENRE_MAP_AUTO = .*?;\nconst AUPAY_CAT_PATH = .*?;\n', lambda m: block, html, flags=re.S)
    else:
        html = re.sub(r'(const GENRE_MAP = \{[^;]*\};\n)', lambda m: m.group(1) + block, html, count=1)
    open(HTML, 'w', encoding='utf-8').write(html)
    print('自動対応', len(out), '件 / カテゴリ名', len(paths_out), '件')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
