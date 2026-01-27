// ========================================
// CertDigital - Static Site JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize validation form if present
  const validationForm = document.getElementById('validationForm');
  if (validationForm) {
    initValidationForm();
  }
  
  // Smooth scroll for anchor links
  initSmoothScroll();
});

// ========================================
// Smooth Scroll
// ========================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ========================================
// Form Validation
// ========================================
function initValidationForm() {
  const form = document.getElementById('validationForm');
  const formCard = document.getElementById('formCard');
  const successCard = document.getElementById('successCard');
  const submitBtn = document.getElementById('submitBtn');
  
  // Input masks
  const cpfInput = document.getElementById('cpf');
  const telefoneInput = document.getElementById('telefone');
  
  cpfInput.addEventListener('input', function(e) {
    e.target.value = formatCPF(e.target.value);
  });
  
  telefoneInput.addEventListener('input', function(e) {
    e.target.value = formatPhone(e.target.value);
  });
  
  // Form submission
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Clear previous errors
    clearErrors();
    
    // Get form data
    const formData = {
      nome: document.getElementById('nome').value.trim(),
      email: document.getElementById('email').value.trim(),
      telefone: document.getElementById('telefone').value.trim(),
      cpf: document.getElementById('cpf').value.trim(),
      endereco: document.getElementById('endereco').value.trim()
    };
    
    // Validate
    const errors = validateForm(formData);
    
    if (Object.keys(errors).length > 0) {
      showErrors(errors);
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      // TODO: Substituir pela URL da sua API real
      // const response = await fetch('https://sua-api.com/validar', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Erro ao enviar dados');
      // }
      
      // Simulando chamada de API (remova em produção)
      await simulateAPICall();
      
      // Show success
      formCard.style.display = 'none';
      successCard.style.display = 'block';
      
    } catch (error) {
      alert('Ocorreu um erro ao enviar seus dados. Tente novamente.');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  });
  
  function setLoading(loading) {
    if (loading) {
      submitBtn.classList.add('loading');
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
        </svg>
        Validando...
      `;
    } else {
      submitBtn.classList.remove('loading');
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        Validar Certificado
      `;
    }
  }
}

// ========================================
// Validation Functions
// ========================================
function validateForm(data) {
  const errors = {};
  
  // Nome
  if (!data.nome || data.nome.length < 3) {
    errors.nome = 'Nome deve ter pelo menos 3 caracteres';
  } else if (data.nome.length > 100) {
    errors.nome = 'Nome deve ter no máximo 100 caracteres';
  }
  
  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'E-mail inválido';
  }
  
  // Telefone
  const phoneNumbers = data.telefone.replace(/\D/g, '');
  if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
    errors.telefone = 'Telefone deve ter 10 ou 11 dígitos';
  }
  
  // CPF
  const cpfNumbers = data.cpf.replace(/\D/g, '');
  if (cpfNumbers.length !== 11) {
    errors.cpf = 'CPF inválido';
  }
  
  // Endereço
  if (!data.endereco || data.endereco.length < 10) {
    errors.endereco = 'Endereço deve ter pelo menos 10 caracteres';
  }
  
  return errors;
}

function showErrors(errors) {
  Object.keys(errors).forEach(field => {
    const input = document.getElementById(field);
    const errorSpan = document.getElementById(field + 'Error');
    
    if (input) {
      input.classList.add('error');
    }
    if (errorSpan) {
      errorSpan.textContent = errors[field];
    }
  });
}

function clearErrors() {
  document.querySelectorAll('.form-group input').forEach(input => {
    input.classList.remove('error');
  });
  document.querySelectorAll('.error-message').forEach(span => {
    span.textContent = '';
  });
}

// ========================================
// Format Functions
// ========================================
function formatCPF(value) {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 3) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return numbers.slice(0, 3) + '.' + numbers.slice(3);
  }
  if (numbers.length <= 9) {
    return numbers.slice(0, 3) + '.' + numbers.slice(3, 6) + '.' + numbers.slice(6);
  }
  return numbers.slice(0, 3) + '.' + numbers.slice(3, 6) + '.' + numbers.slice(6, 9) + '-' + numbers.slice(9, 11);
}

function formatPhone(value) {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) {
    return '(' + numbers;
  }
  if (numbers.length <= 7) {
    return '(' + numbers.slice(0, 2) + ') ' + numbers.slice(2);
  }
  return '(' + numbers.slice(0, 2) + ') ' + numbers.slice(2, 7) + '-' + numbers.slice(7, 11);
}

// ========================================
// API Simulation (remove in production)
// ========================================
function simulateAPICall() {
  return new Promise(resolve => {
    setTimeout(resolve, 2000);
  });
}