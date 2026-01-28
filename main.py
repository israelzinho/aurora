import os
import time
import uuid
import subprocess
import tempfile
import threading
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Aurora CA API")

# CORS para seu GitHub Pages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://israelzinho.github.io"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CertRequest(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    cpf: str
    endereco: str

# --- Config ---
CA_DIR = "CA"
OPENSSL_CNF = os.path.join(CA_DIR, "openssl_api.cnf")
CHAIN_FILE = os.path.join(CA_DIR, "chain.crt")

# Onde guardar PFX temporário (no container)
PFX_STORE_DIR = "/tmp/pfx_store"
os.makedirs(PFX_STORE_DIR, exist_ok=True)

# “Banco” simples em memória: id -> {path, expires_at}
STORE: dict[str, dict] = {}
TTL_SECONDS = 10 * 60  # 10 minutos

# Lock para evitar corrida no openssl ca (index/serial)
CA_LOCK = threading.Lock()

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

def _cleanup_expired():
    now = time.time()
    expired = [k for k, v in STORE.items() if v["expires_at"] <= now]
    for k in expired:
        path = STORE[k]["path"]
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
        STORE.pop(k, None)

def _generate_pfx(payload: CertRequest) -> str:
    if not os.path.exists(OPENSSL_CNF):
        raise HTTPException(500, "openssl_api.cnf não encontrado")
    if not os.path.exists(CHAIN_FILE):
        raise HTTPException(500, "chain.crt não encontrado")

    safe_nome = payload.nome.replace("/", "-").replace("\\", "-").strip()
    subj = f"/C=BR/O=Aurora/OU=Cliente/CN={safe_nome}/emailAddress={payload.email}"

    # senha do pfx (teste)
    pfx_pass = "1234"

    with tempfile.TemporaryDirectory() as tmp:
        key_path = os.path.join(tmp, "client.key")
        csr_path = os.path.join(tmp, "client.csr")
        crt_path = os.path.join(tmp, "client.crt")

        # 1) chave
        subprocess.run(["openssl", "genrsa", "-out", key_path, "2048"],
                       check=True, capture_output=True, text=True)

        # 2) csr
        subprocess.run(["openssl", "req", "-new", "-key", key_path, "-out", csr_path, "-subj", subj],
                       check=True, capture_output=True, text=True)

        # 3) assina com CA intermediária (modo CA) — PROTEGER COM LOCK
        with CA_LOCK:
            subprocess.run(["openssl", "ca", "-config", OPENSSL_CNF, "-in", csr_path, "-out", crt_path, "-batch"],
                           check=True, capture_output=True, text=True)

        # 4) exporta pfx para pasta persistente temporária
        download_id = uuid.uuid4().hex
        pfx_path = os.path.join(PFX_STORE_DIR, f"{download_id}.pfx")

        subprocess.run([
            "openssl", "pkcs12", "-export",
            "-out", pfx_path,
            "-inkey", key_path,
            "-in", crt_path,
            "-certfile", CHAIN_FILE,
            "-passout", f"pass:{pfx_pass}"
        ], check=True, capture_output=True, text=True)

        return pfx_path

@app.post("/validate")
def validate_and_store(payload: CertRequest):
    # limpa expirados a cada chamada (simples)
    _cleanup_expired()

    try:
        pfx_path = _generate_pfx(payload)
    except subprocess.CalledProcessError as e:
        msg = (e.stderr or e.stdout or "Erro OpenSSL").strip()
        raise HTTPException(500, f"Erro no OpenSSL: {msg[:500]}")

    download_id = os.path.splitext(os.path.basename(pfx_path))[0]
    STORE[download_id] = {"path": pfx_path, "expires_at": time.time() + TTL_SECONDS}

    return {
        "download_id": download_id,
        "expires_in_seconds": TTL_SECONDS
    }

@app.get("/download/{download_id}")
def download(download_id: str, background_tasks: BackgroundTasks):
    _cleanup_expired()

    item = STORE.get(download_id)
    if not item:
        raise HTTPException(404, "Certificado expirou ou não existe mais")

    path = item["path"]
    if not os.path.exists(path):
        STORE.pop(download_id, None)
        raise HTTPException(404, "Arquivo não encontrado (serviço reiniciou?)")

    # Apaga após baixar (bom pra não acumular)
    def _delete_after():
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception:
            pass
        STORE.pop(download_id, None)

    background_tasks.add_task(_delete_after)

    return FileResponse(
        path=path,
        media_type="application/x-pkcs12",
        filename="certificado.pfx"
    )


