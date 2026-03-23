// js/restaurant-dashboard.js — Restaurant Dashboard logic
import { API, getSession, shortAddr, SOL_RATE } from './app.js';

export async function renderRestaurantDashboard() {
  const session = getSession();
  if (!session) return;

  // Set restaurant name
  const nameEl = document.getElementById('rd-restaurant-name');
  if (nameEl) nameEl.textContent = session.name;

  const labelEl = document.getElementById('rd-label-role');
  if (labelEl) labelEl.textContent = session.name;

  // Set avatar
  const avatarEl = document.getElementById('rd-header-avatar');
  if (avatarEl) {
    avatarEl.style.backgroundImage = `url('${session.avatar || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80'}')`;
  }

  // Wallet balance
  await renderWalletCard();

  // Fetch restaurant data
  try {
    const resAll = await fetch(API + '/api/restaurants');
    const restaurants = await resAll.json();
    const mine = restaurants.find(r => r.ownerId === session.id);

    // Fetch orders for this restaurant
    const resOrders = await fetch(API + `/api/orders?userId=${session.id}&role=Partner`);
    const orders = await resOrders.json();

    // Top selling article
    renderTopArticle(orders);

    // Alerts / Notifications
    renderAlerts(mine, orders);
  } catch (e) {
    console.error('Error loading restaurant dashboard:', e);
  }
}

async function renderWalletCard() {
  const addressEl = document.getElementById('rd-wallet-address');
  const mxnEl = document.getElementById('rd-wallet-mxn');
  const solEl = document.getElementById('rd-wallet-sol');

  try {
    // Try Phantom wallet
    const phantom = window.phantom?.solana?.isPhantom ? window.phantom.solana
                   : window.solana?.isPhantom ? window.solana : null;

    if (!phantom) {
      addressEl.textContent = 'Sin wallet';
      return;
    }

    if (!phantom.isConnected) await phantom.connect();
    const pubKey = phantom.publicKey.toString();
    addressEl.textContent = shortAddr(pubKey);

    const conn = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
    const balance = await conn.getBalance(phantom.publicKey);
    const sol = (balance / solanaWeb3.LAMPORTS_PER_SOL);
    const mxn = sol * SOL_RATE;

    mxnEl.textContent = `$ ${mxn.toFixed(2)} MXN`;
    solEl.textContent = `${sol.toFixed(3)} SOL`;
  } catch (e) {
    addressEl.textContent = 'Error de wallet';
    console.error('Wallet error:', e);
  }
}

function renderTopArticle(orders) {
  const el = document.getElementById('rd-top-article');
  if (!el) return;

  // Count item frequency across all orders
  const itemCount = {};
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const name = item.name || 'Desconocido';
      itemCount[name] = (itemCount[name] || 0) + (item.qty || 1);
    }
  }

  // Find top item
  let topName = '---';
  let topQty = 0;
  for (const [name, qty] of Object.entries(itemCount)) {
    if (qty > topQty) { topName = name; topQty = qty; }
  }

  el.textContent = `TOP: ${topName}`;
}

function renderAlerts(restaurant, orders) {
  const container = document.getElementById('rd-alerts-container');
  if (!container) return;

  const alerts = [];
  const restName = restaurant ? restaurant.name : 'Tu restaurante';

  // Check rating
  if (restaurant && parseFloat(restaurant.rating) >= 4.5) {
    alerts.push({ icon: '🏆', text: 'Te colocaste en las primeras listas' });
  }

  // New orders count (last 24h)
  const now = Date.now();
  const recentOrders = orders.filter(o => {
    const diff = now - new Date(o.timestamp).getTime();
    return diff < 24 * 60 * 60 * 1000;
  });
  if (recentOrders.length > 0) {
    alerts.push({ icon: '🔔', text: `La sucursal ${restName} tiene ${recentOrders.length} nuevos pedidos` });
  }

  // Reservations placeholder (simulated)
  const reservationCount = Math.floor(Math.random() * 4);
  if (reservationCount > 0) {
    alerts.push({ icon: '📅', text: `La sucursal ${restName} tiene ${reservationCount} Reservaciones` });
  }

  // New rating alert
  alerts.push({ icon: '💬', text: `${restName} tiene nueva calificacion` });

  // Render
  container.innerHTML = alerts.map(a =>
    `<div class="rd-alert-item">
      <span class="rd-alert-icon">${a.icon}</span>
      <span class="rd-alert-text">${a.text}</span>
    </div>`
  ).join('');
}

export function showTrendsModal() {
  const modal = document.getElementById('rd-trends-modal');
  if (modal) modal.style.display = 'flex';
}

export function closeTrendsModal() {
  const modal = document.getElementById('rd-trends-modal');
  if (modal) modal.style.display = 'none';
}
