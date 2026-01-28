import os
import subprocess
import tempfile
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr


# =========================================================
# APP
# =========================================================
app = FastAPI(title="Aurora CA API")

# ⚠️ Para teste deixe "*"
# Em produção: ["https://seuusuario.github.io"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://israelzinho.github.io"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# MODELO DE ENTRADA (bate com seu formulário JS)
# =========================================================
class CertRequest(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    cpf: str
    endereco: str


# =========================================================
# HEALTH CHECK
# =========================================================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "time": datetime.utcnow().isoformat()
    }


# =========================================================
# GERAR CERTIFICADO E DEVOLVER PFX
# =========================================================
@app.post("/generate")
def generate_certificate(payload: CertRequest):
    """
    Gera:
    - chave do cliente
    - CSR
    - certificado assinado pela AC intermediária
    - PFX com cadeia
    """

    # Caminhos fixos da CA
    CA_DIR = "ca"
    OPENSSL_CNF = os.path.join(CA_DIR, "openssl_api.cnf")
    CHAIN_FILE = os.path.join(CA_DIR, "chain.crt")

    if not os.path.exists(OPENSSL_CNF):
        raise HTTPException(status_code=500, detail="openssl_api.cnf não encontrado")

    if not os.path.exists(CHAIN_FILE):
        raise HTTPException(status_code=500, detail="chain.crt não encontrado")

    # Diretório temporário por requisição
    with tempfile.TemporaryDirectory() as tmp:
        key_path = os.path.join(tmp, "client.key")
        csr_path = os.path.join(tmp, "client.csr")
        crt_path = os.path.join(tmp, "client.crt")
        pfx_path = os.path.join(tmp, "client.pfx")

        # Sanitização básica (evita quebrar o openssl)
        safe_nome = payload.nome.replace("/", "-").replace("\\", "-").strip()

        # Subject do certificado do cliente
        subj = (
            f"/C=BR"
            f"/O=Aurora"
            f"/OU=Cliente"
            f"/CN={safe_nome}"
            f"/emailAddress={payload.email}"
        )

        # ⚠️ Senha do PFX (teste)
        PFX_PASSWORD = "1234"

        try:
            # -------------------------------------------------
            # 1) Gerar chave privada do cliente
            subprocess.run(
                ["openssl", "genrsa", "-out", key_path, "2048"],
                check=True,
                capture_output=True,
                text=True,
            )

            # -------------------------------------------------
            # 2) Gerar CSR do cliente
            subprocess.run(
                [
                    "openssl", "req",
                    "-new",
                    "-key", key_path,
                    "-out", csr_path,
                    "-subj", subj,
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            # -------------------------------------------------
            # 3) Assinar CSR com AC INTERMEDIÁRIA (modo CA)
            subprocess.run(
                [
                    "openssl", "ca",
                    "-config", OPENSSL_CNF,
                    "-in", csr_path,
                    "-out", crt_path,
                    "-batch",
                ],
                check=True,
                capture_output=True,
                text=True,
            )

            # -------------------------------------------------
            # 4) Gerar PFX com cadeia
            subprocess.run(
                [
                    "openssl", "pkcs12",
                    "-export",
                    "-out", pfx_path,
                    "-inkey", key_path,
                    "-in", crt_path,
                    "-certfile", CHAIN_FILE,
                    "-passout", f"pass:{PFX_PASSWORD}",
                ],
                check=True,
                capture_output=True,
                text=True,
            )

        except subprocess.CalledProcessError as e:
            error_msg = (e.stderr or e.stdout or "Erro desconhecido").strip()
            raise HTTPException(
                status_code=500,
                detail=f"Erro no OpenSSL: {error_msg[:500]}"
            )

        # -----------------------------------------------------
        # Devolver o PFX
        return FileResponse(
            path=pfx_path,
            media_type="application/x-pkcs12",
            filename="certificado.pfx",
        )
