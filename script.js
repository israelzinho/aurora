// ========================================
// CertDigital - Static Site JavaScript
// ========================================

const API_BASE = "https://aurora-production-de38.up.railway.app";

// guarda o id entre cliques (se recarregar a página, ainda segura na session)
let downloadId = sessionStorage.getItem("download_id") || null;

document.addEventListener("DOMContentLoaded", function () {
  const validationForm = document.getElementById("validationForm");
  if (validationForm) initValidationForm();

  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) initDownloadButton();

  initSmoothScroll();
});

// ========================================
// Smooth Scroll
// ========================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ========================================
// Form Validation (VALIDAR -> /validate)
// ========================================
function initValidationForm() {
  const form = document.getElementById("validationForm");
  const formCard = document.getElementById("formCard");
  const successCard = document.getElementById("successCard");
  const submitBtn = document.getElementById("submitBtn");

  const cpfInput = document.getElementById("cpf");
  const telefoneInput = document.getElementById("telefone");

  if (cpfInput) cpfInput.addEventListener("input", e => (e.target.value = formatCPF(e.target.value)));
  if (telefoneInput) telefoneInput.addEventListener("input", e => (e.target.value = formatPhone(e.target.value)));

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearErrors();

    const formData = {
      nome: document.getElementById("nome").value.trim(),
      email: document.getElementById("email").value.trim(),
      telefone: document.getElementById("telefone").value.trim(),
      cpf: document.getElementById("cpf").value.trim(),
      endereco: document.getElementById("endereco").value.trim()
    };

    const errors = validateForm(formData);
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }

    setLoading(true);

    try {
      // ✅ 1) chama /validate (gera e guarda) -> retorna download_id (JSON)
      const response = await fetch(`${API_BASE}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        let msg = "Erro ao validar/gerar certificado";
        try {
          const data = await response.json();
          if (data?.detail) msg = data.detail;
        } catch (_) {}
        throw new Error(msg);
      }

      const data = await response.json();
      if (!data?.download_id) throw new Error("API não retornou download_id");

      downloadId = data.download_id;
      sessionStorage.setItem("download_id", downloadId);

      // ✅ 2) mostra o card com botão de download
      formCard.style.display = "none";
      successCard.style.display = "block";
    } catch (err) {
      alert(err.message || "Ocorreu um erro ao validar. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  });

  function setLoading(loading) {
    if (loading) {
      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      submitBtn.innerHTML = "Validando...";
    } else {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Validar Certificado";
    }
  }
}

// ========================================
// Download Certificate (BAIXAR -> /download/{id})
// ========================================
function initDownloadButton() {
  const downloadBtn = document.getElementById("downloadBtn");
  const downloadError = document.getElementById("downloadError");
  const downloadErrorText = document.getElementById("downloadErrorText");

  downloadBtn.addEventListener("click", async function () {
    downloadError.style.display = "none";
    setDownloadLoading(true);

    try {
      if (!downloadId) downloadId = sessionStorage.getItem("download_id");
      if (!downloadId) throw new Error("Nenhum certificado gerado. Clique em 'Validar Certificado' primeiro.");

      // ✅ chama /download/{id} (binário)
      const response = await fetch(`${API_BASE}/download/${downloadId}`);

      if (!response.ok) {
        let msg = "Erro ao baixar certificado";
        try {
          const data = await response.json();
          if (data?.detail) msg = data.detail;
        } catch (_) {}
        throw new Error(msg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "certificado.pfx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // limpa o id depois de baixar (o backend também apaga)
      sessionStorage.removeItem("download_id");
      downloadId = null;
    } catch (err) {
      downloadErrorText.textContent = err.message || "Erro ao baixar. Tente novamente.";
      downloadError.style.display = "flex";
      console.error(err);
    } finally {
      setDownloadLoading(false);
    }
  });

  function setDownloadLoading(loading) {
    downloadBtn.disabled = loading;
    if (loading) {
      downloadBtn.classList.add("loading");
      downloadBtn.innerHTML = "Baixando...";
    } else {
      downloadBtn.classList.remove("loading");
      downloadBtn.innerHTML = "Baixar Certificado";
    }
  }
}

// ========================================
// Validation + helpers
// ========================================
function validateForm(data) {
  const errors = {};

  if (!data.nome || data.nome.length < 3) errors.nome = "Nome deve ter pelo menos 3 caracteres";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) errors.email = "E-mail inválido";

  const phoneNumbers = data.telefone.replace(/\D/g, "");
  if (phoneNumbers.length < 10 || phoneNumbers.length > 11) errors.telefone = "Telefone deve ter 10 ou 11 dígitos";

  const cpfNumbers = data.cpf.replace(/\D/g, "");
  if (cpfNumbers.length !== 11) errors.cpf = "CPF inválido";

  if (!data.endereco || data.endereco.length < 10) errors.endereco = "Endereço deve ter pelo menos 10 caracteres";

  return errors;
}

function showErrors(errors) {
  Object.keys(errors).forEach(field => {
    const input = document.getElementById(field);
    const errorSpan = document.getElementById(field + "
