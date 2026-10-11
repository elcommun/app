#!/usr/bin/env python3
"""トップページ(index.html)のログイン用データ tools/index-auth.json を作る（最初の1回だけ）。

ID・パスワードは環境変数で渡す（ファイルには残さない）:
  INDEX_ID=... INDEX_PW=... python3 tools/setup-index-auth.py
作られる index-auth.json には「パスワードで暗号化した秘密鍵」と公開鍵だけが入る。
以後 tools/build-index.py は公開鍵だけで一覧を暗号化できるので、パスワード無しで更新できる。
ID/パスワードを変えるときはこれを再実行する（その後 build-index.py も実行）。
"""
import os, sys, json, base64
from pathlib import Path
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ITER = 600000
b64 = lambda b: base64.b64encode(b).decode()

uid, pw = os.environ.get("INDEX_ID"), os.environ.get("INDEX_PW")
if not uid or not pw:
    sys.exit("INDEX_ID と INDEX_PW を環境変数で指定してください")

priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
priv_der = priv.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
pub_der = priv.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
salt, iv = os.urandom(16), os.urandom(12)
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive((uid + "\n" + pw).encode())
enc = AESGCM(key).encrypt(iv, priv_der, None)
out = {"v": 1, "iter": ITER, "salt": b64(salt), "iv": b64(iv), "priv": b64(enc), "pub": b64(pub_der)}
Path(__file__).with_name("index-auth.json").write_text(json.dumps(out, indent=1))
print("tools/index-auth.json を作りました")
