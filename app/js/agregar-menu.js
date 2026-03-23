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
  if (!session) {
    alert("No has iniciado sesión o la sesión expiró.");
    return;
  }

  const name = document.getElementById('am-name').value.trim();
  const desc = document.getElementById('am-desc').value.trim();
  
  // Collect categories
  const categoryCbs = document.querySelectorAll('.am-cat-cb:checked');
  const catNames = Array.from(categoryCbs).map(cb => cb.value.trim()).filter(val => val);
  const categoryStr = catNames.length > 0 ? catNames.join(', ') : '';

  const priceMXNRaw = document.getElementById('am-price-mxn').value;
  const priceMXN = parseFloat(priceMXNRaw) || 0;
  const priceSOLText = document.getElementById('am-price-sol').innerText;
  const priceSOL = parseFloat(priceSOLText.replace(/[^0-9.]/g, '')) || 0;

  const statusVal = document.getElementById('am-status-select').value;
  const isActive = statusVal === 'true';

  if (!name || priceMXN <= 0 || !categoryStr) {
    alert("Por favor completa el nombre del platillo, su precio base y selecciona al menos una categoría.");
    return;
  }

  // Get image src from preview if possible
  const preview = document.getElementById('am-image-preview');
  let image = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80"; // Default image fallback
  if (preview && preview.src && preview.src.startsWith('data:')) {
    image = preview.src; 
  }

  const payload = {
    restaurantId: session.id, // Or ownerId
    name,
    desc,
    category: categoryStr,
    priceMXN,
    priceSOL,
    status: isActive,
    image
  };

  try {
    const res = await fetch(`${API}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("¡Platillo creado y guardado exitosamente!");
      amDiscardDraft();
      // Redirect to Consultas Menu so user can see what they just added
      if (window.openConsultasMenu) window.openConsultasMenu();
    } else {
      const errData = await res.json();
      alert("Error al guardar en el servidor: " + (errData.error || 'Desconocido'));
    }
  } catch (e) {
    console.error(e);
    alert("Error de conexión al servidor");
  }
}
