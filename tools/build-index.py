#!/usr/bin/env python3
"""トップページ index.html を作り直す。アプリ(フォルダ)を追加・名前変更・削除したら必ず実行する。

  python3 tools/build-index.py

- 一覧の元データは tools/index-apps.json（グループ・表示名・説明）
- index.html を持つフォルダで index-apps.json に無いものは「未分類」に自動で出る（<title> から名前を取る）
- 一覧は暗号化して埋め込む（ページのソースを見ても読めない）。パスワードは不要（tools/index-auth.json の公開鍵を使う）
- 一覧にあるのにフォルダが無いアプリは警告する
"""
import re, json, os, base64, html
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ROOT = Path(__file__).resolve().parent.parent
T = ROOT / "tools"
b64 = lambda b: base64.b64encode(b).decode()

cfg = json.loads((T / "index-apps.json").read_text())
auth = json.loads((T / "index-auth.json").read_text())

listed = {a["dir"] for g in cfg["groups"] for a in g["apps"]}
present = {p.parent.name for p in ROOT.glob("*/index.html")}
for d in sorted(listed - present):
    print(f"警告: 一覧にあるが index.html が無い: {d}")

def title_of(d):
    t = (ROOT / d / "index.html").read_bytes().decode("utf-8", "ignore")
    m = re.search(r"<title>([^<]*)", t)
    return html.unescape(m.group(1)).split("|")[0].strip() if m and m.group(1).strip() else d

groups = [{"id": g["id"], "title": g["title"], "apps": [dict(a) for a in g["apps"] if a["dir"] in present]} for g in cfg["groups"]]
new = sorted(present - listed)
if new:
    groups.append({"id": "new", "title": "🆕 未分類（tools/index-apps.json に追記してください）",
                   "apps": [{"dir": d, "name": title_of(d)} for d in new]})
    print("未分類に出したフォルダ:", ", ".join(new))
groups = [g for g in groups if g["apps"]]

K, iv = os.urandom(32), os.urandom(12)
ct = AESGCM(K).encrypt(iv, json.dumps(groups, ensure_ascii=False).encode(), None)
pub = serialization.load_der_public_key(base64.b64decode(auth["pub"]))
wk = pub.encrypt(K, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
data = {"auth": {k: auth[k] for k in ("iter", "salt", "iv", "priv")}, "iv": b64(iv), "ct": b64(ct), "wk": b64(wk)}

page = (T / "index-template.html").read_text().replace("__DATA__", json.dumps(data))
(ROOT / "index.html").write_text(page)
print(f"index.html を作りました（{sum(len(g['apps']) for g in groups)}アプリ）")
