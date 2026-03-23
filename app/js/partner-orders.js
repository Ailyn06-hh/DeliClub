// js/partner-orders.js — Partner order management
import { API, getSession, showScreen } from './app.js';

let allPartnerOrders = [];
let clientCache = {};
let currentTab = 'recibidos';

export function openPartnerOrders() {
  showScreen('screen-partner-orders');
  currentTab = 'recibidos';
  setActiveTab('recibidos');
  loadPartnerOrders();
}

export function closePartnerOrders() {
  showScreen('screen-restaurant-dashboard');
}

function setActiveTab(tab) {
  document.querySelectorAll('.po-tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById(`po-tab-${tab}`);
  if (el) el.classList.add('active');
}

async function loadPartnerOrders() {
  const session = getSession();
  if (!session) return;

  const container = document.getElementById('po-orders-list');
  if (!container) return;
  container.innerHTML = '<div class="loading">Cargando pedidos...</div>';

  try {
    const res = await fetch(`${API}/api/orders?userId=${session.id}&role=Partner`);
    if (res.ok) {
      allPartnerOrders = await res.json();
      // Sort by date descending
      allPartnerOrders.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    } else {
      allPartnerOrders = [];
    }
  } catch (e) {
    console.error('Error loading partner orders:', e);
    allPartnerOrders = [];
  }

  // Pre-fetch all unique client info
  const clientIds = [...new Set(allPartnerOrders.map(o => o.clientId))];
  await Promise.all(clientIds.map(async (cid) => {
    if (clientCache[cid]) return;
    try {
      const r = await fetch(`${API}/api/users/${cid}`);
      if (r.ok) clientCache[cid] = await r.json();
    } catch {}
  }));

  filterPartnerOrders(currentTab);
}

export function filterPartnerOrders(tab) {
  currentTab = tab;
  setActiveTab(tab);

  let filtered = [];
  if (tab === 'recibidos') {
    filtered = allPartnerOrders.filter(o => o.status === 'confirmed');
  } else if (tab === 'completados') {
    filtered = allPartnerOrders.filter(o => o.status === 'accepted');
  } else if (tab === 'cancelados') {
    filtered = allPartnerOrders.filter(o => o.status === 'rejected');
  }

  renderPartnerOrders(filtered, tab);
}

function renderPartnerOrders(orders, tab) {
  const container = document.getElementById('po-orders-list');
  if (!container) return;

  if (orders.length === 0) {
    const msgs = {
      recibidos: 'No hay pedidos pendientes.',
      completados: 'No hay pedidos completados aún.',
      cancelados: 'No hay pedidos cancelados.'
    };
    container.innerHTML = `<div class="po-empty">${msgs[tab] || 'Sin pedidos.'}</div>`;
    return;
  }

  container.innerHTML = orders.map((order, idx) => {
    const client = clientCache[order.clientId] || {};
    const orderNum = order.id.slice(-4);

    // Format date
    let dateStr = '—';
    try {
      if (order.timestamp) {
        const d = new Date(order.timestamp);
        let m = d.toLocaleDateString('es-MX', { month: 'long' });
        m = m.charAt(0).toUpperCase() + m.slice(1);
        dateStr = `${d.getDate()} - ${m} - ${d.getFullYear()}`;
      }
    } catch {}

    // Items list
    const itemsHtml = (order.items || []).map(i =>
      `<div class="po-item-row"><span class="po-item-qty">${i.qty}x</span> <span class="po-item-name">${i.name}</span> <span class="po-item-price">$${parseFloat(i.price || 0).toFixed(2)}</span></div>`
    ).join('');

    const total = order.totalMXN || order.total || 0;

    // Check if new (less than 2 hours old)
    const isNew = order.timestamp && (Date.now() - new Date(order.timestamp).getTime()) < 2 * 60 * 60 * 1000;

    // Buttons based on tab
    let actionsHtml = '';
    if (tab === 'recibidos') {
      actionsHtml = `
        <div class="po-actions">
          <button class="po-btn-accept" onclick="acceptOrder('${order.id}')">Aceptar pedido</button>
          <button class="po-btn-reject" onclick="rejectOrder('${order.id}')">Descartar pedido</button>
        </div>`;
    } else if (tab === 'completados') {
      actionsHtml = `<div class="po-status-badge po-status-accepted">✓ Pedido Aceptado</div>`;
    } else if (tab === 'cancelados') {
      actionsHtml = `<div class="po-status-badge po-status-rejected">✗ Pedido Descartado</div>`;
      if (order.refundedAmount) {
        actionsHtml += `<div class="po-refund-note">Reembolso: $${order.refundedAmount.toFixed(2)} MXN</div>`;
      }
    }

    return `
      <div class="po-order-card">
        <div class="po-order-header">
          <h3 class="po-order-title">Pedido</h3>
          <span class="po-order-num">N:${orderNum}</span>
        </div>

        <div class="po-items-section">
          ${itemsHtml}
        </div>

        <div class="po-order-total">Total: $${total.toFixed(2)} MXN</div>
        <div class="po-order-date">Fecha: ${dateStr}</div>

        <hr class="po-divider">

        <div class="po-client-info">
          <div class="po-client-row">Teléfono: <strong>${client.phone || '—'}</strong></div>
          <div class="po-client-row">Correo: <strong>${client.email || '—'}</strong></div>
          <div class="po-client-row">Nombre: <strong>${client.name || order.clientName || '—'}</strong></div>
        </div>

        ${isNew && tab === 'recibidos' ? '<div class="po-new-badge">NUEVO PEDIDO</div>' : ''}

        ${actionsHtml}
      </div>`;
  }).join('');
}

export async function acceptOrder(orderId) {
  if (!confirm('¿Aceptar este pedido?')) return;
  try {
    const res = await fetch(`${API}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' })
    });
    if (res.ok) {
      // Update local data
      const order = allPartnerOrders.find(o => o.id === orderId);
      if (order) order.status = 'accepted';
      filterPartnerOrders(currentTab);
    } else {
      alert('Error al aceptar el pedido.');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

export async function rejectOrder(orderId) {
  if (!confirm('¿Descartar este pedido? Se reembolsará el dinero al cliente.')) return;
  try {
    const res = await fetch(`${API}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    });
    if (res.ok) {
      const data = await res.json();
      // Update local data
      const order = allPartnerOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'rejected';
        order.refundedAmount = data.order.refundedAmount;
      }
      filterPartnerOrders(currentTab);
    } else {
      alert('Error al descartar el pedido.');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
}
