import { API, SOL_RATE, getSession, showScreen } from './app.js';

export function openAgregarMenu() {
  showScreen('screen-agregar-menu');
  amDiscardDraft(); // clear on open
}

export function amUpdateSolConversion() {
  const mxnInput = document.getElementById('am-price-mxn');
  const solDisplay = document.getElementById('am-price-sol');
  
  const mxnValue = parseFloat(mxnInput.value) || 0;
  const solValue = mxnValue / SOL_RATE;
  solDisplay.innerHTML = `☀️ ${solValue.toFixed(4)} SOL`;
}

export function amUpdateStatusLabel() {
  const cb = document.getElementById('am-status');
  const label = document.getElementById('am-status-label');
  if (cb.checked) {
    label.innerText = 'Disponible';
    label.className = 'am-status-text am-status-active';
  } else {
    label.innerText = 'No Disponible';
    label.className = 'am-status-text am-status-inactive';
  }
}

export function amPreviewImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('am-image-preview');
      const icon = document.querySelector('.am-camera-icon');
      const text = document.querySelector('.am-camera-text');
      if (preview) {
        preview.src = e.target.result;
        preview.style.display = 'block';
      }
      if (icon) icon.style.display = 'none';
      if (text) text.style.display = 'none';
    }
    reader.readAsDataURL(file);
  }
}

export function amDiscardDraft() {
  document.getElementById('am-name').value = '';
  document.getElementById('am-desc').value = '';
  document.getElementById('am-image').value = '';
  
  const preview = document.getElementById('am-image-preview');
  if (preview) {
    preview.style.display = 'none';
    preview.src = '';
  }
  const icon = document.querySelector('.am-camera-icon');
  const text = document.querySelector('.am-camera-text');
  if (icon) icon.style.display = 'block';
  if (text) text.style.display = 'block';

  const categoryCbs = document.querySelectorAll('.am-cat-cb');
  categoryCbs.forEach(cb => cb.checked = false);
  
  document.getElementById('am-price-mxn').value = '';
  document.getElementById('am-status-select').value = 'true';
  amUpdateSolConversion();
}

export async function amSubmitForm() {
  const session = getSession();
  if (!session) return alert("No iniciaste sesión");

  const name = document.getElementById('am-name').value.trim();
  const desc = document.getElementById('am-desc').value.trim();
  
  const categoryCbs = document.querySelectorAll('.am-cat-cb:checked');
  const category = Array.from(categoryCbs).map(cb => cb.value).join(', ');
  
  const price = parseFloat(document.getElementById('am-price-mxn').value) || 0;
  const isActive = document.getElementById('am-status-select').value === 'true';

  if (!name || isNaN(price) || price <= 0) {
    alert("Por favor completa el nombre y un precio válido.");
    return;
  }

  const payload = {
    name,
    description: desc,
    category,
    price,
    isActive,
    restaurantId: session.id // Or could map to specific branch if the partner has multiple, but we'll use session id for simplicity
  };

  try {
    const res = await fetch(`${API}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("Platillo creado exitosamente!");
      window.backToMenuActivo();
    } else {
      alert("Error al crear platillo");
    }
  } catch (e) {
    console.error(e);
    alert("Error de conexión");
  }
}
