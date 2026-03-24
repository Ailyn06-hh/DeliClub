import { SOL_RATE, API, getSession, showScreen } from './app.js';

let emCurrentTab = 'eliminar'; // 'eliminar' or 'editar'
let emEditingId = null; // track which item is being edited inline

export function openEliminarEditarMenu() {
  emCurrentTab = 'eliminar';
  emEditingId = null;
  showScreen('screen-eliminar-editar-menu');
  updateTabUI();
  renderEliminarEditarCards();
}

export function setEliminarTab(tab) {
  emCurrentTab = tab;
  emEditingId = null;
  updateTabUI();
  renderEliminarEditarCards();
}

function updateTabUI() {
  const btnEliminar = document.getElementById('em-tab-eliminar');
  const btnEditar = document.getElementById('em-tab-editar');
  if (!btnEliminar || !btnEditar) return;
  btnEliminar.classList.toggle('active', emCurrentTab === 'eliminar');
  btnEditar.classList.toggle('active', emCurrentTab === 'editar');
}

export async function renderEliminarEditarCards() {
  const container = document.getElementById('em-cards-container');
  if (!container) return;

  container.innerHTML = '<p style="text-align:center; color:#7f523c;">Cargando productos...</p>';

  const session = getSession();
  if (!session) {
    container.innerHTML = '<p style="text-align:center;">Inicia sesión primero.</p>';
    return;
  }

  try {
    const res = await fetch(`${API}/api/menu?restaurantId=${session.id}`);
    if (!res.ok) throw new Error('Error fetching');
    const items = await res.json();

    if (!items || items.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#7f523c;">No hay productos en el menú.</p>';
      return;
    }

    container.innerHTML = '';

    items.forEach(item => {
      const priceSOL = item.priceSOL !== undefined ? item.priceSOL : 0;
      const priceMXN = item.priceMXN !== undefined ? item.priceMXN : (item.price || 0);
      const img = item.image || 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=80';
      const descClean = (item.desc || '').replace(/<br\s*\/?>/gi, ' ');

      // Check if we are editing this item
      if (emCurrentTab === 'editar' && emEditingId === item.id) {
        const editCard = `
          <div class="em-card em-card-editing">
            <div class="em-edit-form">
              <label class="em-edit-label">Nombre</label>
              <input type="text" id="em-edit-name" class="em-edit-input" value="${item.name || ''}">
              
              <label class="em-edit-label">Descripción</label>
              <textarea id="em-edit-desc" class="em-edit-textarea">${descClean}</textarea>
              
              <label class="em-edit-label">Precio MXN</label>
              <input type="number" id="em-edit-price" class="em-edit-input" value="${parseFloat(priceMXN) || 0}" step="0.01" oninput="emEditUpdateSol()">
              
              <div class="em-edit-sol-display" id="em-edit-sol">☀️ ${(parseFloat(priceMXN) / SOL_RATE).toFixed(4)} SOL</div>
              
              <label class="em-edit-label">URL de Imagen</label>
              <input type="text" id="em-edit-image" class="em-edit-input" value="${img}">
              <img id="em-edit-image-preview" src="${img}" class="em-edit-preview-img">
              
              <div class="em-edit-actions">
                <button class="em-btn-save" onclick="saveEditItem('${item.id}')">💾 Guardar</button>
                <button class="em-btn-cancel" onclick="cancelEditItem()">✖ Cancelar</button>
              </div>
            </div>
          </div>
        `;
        container.innerHTML += editCard;
      } else {
        // Normal card view
        let actionsHTML = '';
        if (emCurrentTab === 'eliminar') {
          actionsHTML = `
            <div class="em-actions">
              <button class="em-btn-delete" onclick="deleteMenuItem('${item.id}')">🗑️ Borrar</button>
            </div>
          `;
        } else {
          actionsHTML = `
            <div class="em-actions">
              <button class="em-btn-edit" onclick="startEditItem('${item.id}')">✏️ Editar</button>
            </div>
          `;
        }

        const card = `
          <div class="em-card">
            <div class="em-content-row">
              <div class="em-image-container">
                <img src="${img}" class="em-image" alt="${item.name}">
              </div>
              <div class="em-details">
                <h4 class="em-title">${item.name}</h4>
                <p class="em-desc">${descClean}</p>
                <div class="em-price">Sol ${Number(priceSOL).toFixed(3)}/ ${Number(priceMXN).toFixed(2)} MXN</div>
              </div>
            </div>
            <div class="em-divider"></div>
            ${actionsHTML}
          </div>
        `;
        container.innerHTML += card;
      }
    });
  } catch (e) {
    console.error(e);
    container.innerHTML = '<p style="text-align:center; color:red;">Error al cargar productos.</p>';
  }
}

export async function deleteMenuItem(itemId) {
  if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(`${API}/api/menu/${itemId}?restaurantId=${session.id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Producto eliminado exitosamente.');
      renderEliminarEditarCards();
    } else {
      const err = await res.json();
      alert('Error al eliminar: ' + (err.error || 'Desconocido'));
    }
  } catch (e) {
    console.error(e);
    alert('Error de conexión al servidor.');
  }
}

export function startEditItem(itemId) {
  emEditingId = itemId;
  renderEliminarEditarCards();
}

export function cancelEditItem() {
  emEditingId = null;
  renderEliminarEditarCards();
}

export function emEditUpdateSol() {
  const priceInput = document.getElementById('em-edit-price');
  const solDisplay = document.getElementById('em-edit-sol');
  if (!priceInput || !solDisplay) return;
  const mxn = parseFloat(priceInput.value) || 0;
  solDisplay.innerHTML = `☀️ ${(mxn / SOL_RATE).toFixed(4)} SOL`;
}

export async function saveEditItem(itemId) {
  const session = getSession();
  if (!session) return;

  const name = document.getElementById('em-edit-name')?.value.trim();
  const desc = document.getElementById('em-edit-desc')?.value.trim();
  const priceMXNRaw = document.getElementById('em-edit-price')?.value;
  const image = document.getElementById('em-edit-image')?.value.trim();

  const priceMXN = parseFloat(priceMXNRaw) || 0;
  const priceSOL = priceMXN / SOL_RATE;

  if (!name || priceMXN <= 0) {
    alert('Por favor completa el nombre y el precio.');
    return;
  }

  try {
    const res = await fetch(`${API}/api/menu/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: session.id,
        name,
        desc,
        priceMXN,
        priceSOL,
        image
      })
    });

    if (res.ok) {
      alert('Producto actualizado exitosamente.');
      emEditingId = null;
      renderEliminarEditarCards();
    } else {
      const err = await res.json();
      alert('Error al actualizar: ' + (err.error || 'Desconocido'));
    }
  } catch (e) {
    console.error(e);
    alert('Error de conexión al servidor.');
  }
}
