import os
import shutil
import subprocess
import tempfile
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr

app = FastAPI()

# 🔧 Troque pelo seu domínio do GitHub Pages quando souber (ou deixe "*" só pra teste)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # depois troque por ["https://seuusuario.github.io"]
    allow_methods=["*"],
    allow_headers=["*"],
)

class CertRequest(BaseModel):
    nome: str
    email: EmailStr
    telefone: str
    cpf: str
    endereco: str

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.post("/generate")
def generate_pfx(payload: CertRequest):
    # ⚠️ Certificado de TESTE (autoassinado). Não tem validade jurídica.
    # Gera tudo num diretório temporário e apaga depois.

    with tempfile.TemporaryDirectory() as tmp:
        key_path = os.path.join(tmp, "key.pem")
        csr_path = os.path.join(tmp, "req.csr")
        crt_path = os.path.join(tmp, "cert.pem")
        pfx_path = os.path.join(tmp, "certificado.pfx")

        # Subject simples (você pode ajustar)
        # Evite caracteres muito estranhos aqui pra não quebrar o openssl
        safe_nome = payload.nome.replace("/", "-").strip()
        subj = f"/C=BR/ST=GO/L=Goiania/O=Aurora-Teste/OU=Dev/CN={safe_nome}/emailAddress={payload.email}"

        # Senha do PFX (pra teste). Depois você pode pedir pro usuário.
        pfx_pass = "1234"

        try:
            # 1) Gera chave privada
            subprocess.run(
                ["openssl", "genrsa", "-out", key_path, "2048"],
                check=True,
                capture_output=True,
                text=True,
            )

            # 2) CSR
            subprocess.run(
                ["openssl", "req", "-new", "-key", key_path, "-out", csr_path, "-subj", subj],
                check=True,
                capture_output=True,
                text=True,
            )

            # 3) Cert autoassinado (teste)
            subprocess.run(
                ["openssl", "x509", "-req", "-in", csr_path, "-signkey", key_path, "-out", crt_path, "-days", "365"],
                check=True,
                capture_output=True,
                text=True,
            )

            # 4) Empacota PFX
            subprocess.run(
                [
                    "openssl", "pkcs12",
                    "-export",
                    "-out", pfx_path,
                    "-inkey", key_path,
                    "-in", crt_path,
                    "-passout", f"pass:{pfx_pass}",
                ],
                check=True,
                capture_output=True,
                text=True,
            )

        except subprocess.CalledProcessError as e:
            # Dá um erro mais amigável
            err = (e.stderr or e.stdout or "").strip()
            raise HTTPException(status_code=500, detail=f"OpenSSL falhou: {err[:400]}")

        # Devolve o arquivo
        return FileResponse(
            pfx_path,
            media_type="application/x-pkcs12",
            filename="certificado.pfx",
        )

