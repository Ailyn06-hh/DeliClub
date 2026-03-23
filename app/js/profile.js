// js/profile.js — User Profile screen
import { getSession, showScreen, SOL_RATE, API, shortAddr } from './app.js';

export function confirmLogout() {
  const ok = confirm('¿Estás seguro de que deseas cerrar sesión?');
  if (ok) {
    localStorage.removeItem('solana_session');
    location.reload();
  }
}

export function openEditProfile() {
  const session = getSession();
  if (!session) return;
  document.getElementById('edit-profile-name').value = session.name || '';
  document.getElementById('edit-profile-bio').value = session.bio || '';
  document.getElementById('edit-profile-avatar').value = session.avatar || '';
  document.getElementById('edit-profile-wallet').value = session.wallet || '';
  document.getElementById('profile-edit-modal').style.display = 'flex';
}

export function closeEditProfile() {
  document.getElementById('profile-edit-modal').style.display = 'none';
}

export async function saveProfileChanges() {
  const session = getSession();
  if (!session) return;
  session.name = document.getElementById('edit-profile-name').value.trim();
  session.bio = document.getElementById('edit-profile-bio').value.trim();
  session.avatar = document.getElementById('edit-profile-avatar').value.trim();
  session.wallet = document.getElementById('edit-profile-wallet').value.trim();

  try {
    const res = await fetch(`${API}/api/users/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: session.name,
        bio: session.bio,
        avatar: session.avatar,
        wallet: session.wallet
      })
    });
    if (!res.ok) console.error('Failed to sync profile changes to server');
  } catch (err) {
    console.error('Error syncing profile:', err);
  }

  localStorage.setItem('solana_session', JSON.stringify(session));
  closeEditProfile();
  renderProfileInfo(session);
  renderWalletCard(session);
  
  const headerAvatarEl = document.getElementById('header-avatar');
  const avatarUrl = session.avatar || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80';
  if (headerAvatarEl) headerAvatarEl.style.backgroundImage = `url('${avatarUrl}')`;
  
  const labelRoleEl = document.getElementById('label-role');
  if (labelRoleEl) labelRoleEl.innerText = session.name || '';
}

// ── Calendar state ──────────────────────────────────────────────
let calDate = new Date();
let reservationDates = []; // array of 'YYYY-MM-DD' strings
let allUserReservations = []; // array of full objects

// ── Open / Close ────────────────────────────────────────────────
export function openProfile() {
  const session = getSession();
  if (!session) return;
  showScreen('screen-profile');
  renderProfileInfo(session);
  renderWalletCard(session);
  loadPurchaseHistory(session);
  initCalendar(session);
}

export function closeProfile() {
  showScreen('screen-main');
}

// ── Profile info ────────────────────────────────────────────────
function renderProfileInfo(session) {
  // Avatar (use the same dog avatar or session photo)
  const avatarEl = document.getElementById('profile-avatar-img');
  const headerAvatarEl = document.getElementById('header-avatar');
  const avatarUrl = session.avatar || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80';
  
  if (avatarEl) {
    avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
  }
  if (headerAvatarEl) {
    headerAvatarEl.style.backgroundImage = `url('${avatarUrl}')`;
  }

  // Name
  const nameEl = document.getElementById('profile-username');
  if (nameEl) nameEl.textContent = session.name || 'Usuario';

  // Bio / description
  const bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.textContent = session.bio || 'Usuario experto en gastronomía';

  // Delipoints (show only for clients)
  const delipointsCard = document.getElementById('profile-delipoints-card');
  if (session.type === 'Restaurante' || session.type === 'Partner') {
    if (delipointsCard) delipointsCard.style.display = 'none';
  } else {
    if (delipointsCard) delipointsCard.style.display = 'flex';
    const points = session.delipoints || 0; // 1 point = 1 MXN
    const mxn = points.toFixed(2);
    const sol = (points / SOL_RATE).toFixed(4);
    const mxnEl = document.getElementById('profile-delipoints-mxn');
    const solEl = document.getElementById('profile-delipoints-sol');
    if (mxnEl) mxnEl.textContent = `$ ${mxn} MXN`;
    if (solEl) solEl.textContent = `${sol} SOL`;
  }
}

// ── Wallet card ─────────────────────────────────────────────────
function renderWalletCard(session) {
  const statusEl  = document.getElementById('profile-wallet-status-label');
  const addrEl    = document.getElementById('profile-wallet-address');
  const linkEl    = document.getElementById('profile-wallet-link');

  const addr = session.wallet || '';
  if (addr) {
    if (statusEl) {
      statusEl.textContent = 'Wallet conectada';
      statusEl.classList.add('connected');
    }
    if (addrEl) addrEl.textContent = shortAddr(addr);
    if (linkEl) {
      linkEl.style.display = 'flex';
      linkEl.href = `https://explorer.solana.com/address/${addr}?cluster=devnet`;
    }
  } else {
    if (statusEl) statusEl.textContent = 'Sin wallet conectada';
    if (addrEl) addrEl.textContent = '—';
    if (linkEl) linkEl.style.display = 'none';
  }
}

// ── Reservation Calendar ────────────────────────────────────────
async function initCalendar(session) {
  // Load reservations from API
  try {
    const res = await fetch(`${API}/api/reservations?userId=${session.id}`);
    if (res.ok) {
      const data = await res.json();
      allUserReservations = data;
      reservationDates = data.map(r => r.date); // expected 'YYYY-MM-DD'
    } else {
      reservationDates = session.reservations || [];
      allUserReservations = [];
    }
  } catch {
    reservationDates = session.reservations || [];
    allUserReservations = [];
  }
  calDate = new Date();
  buildCalSelectors();
  profileCalRender();
}

function buildCalSelectors() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monthSel = document.getElementById('cal-month');
  const yearSel  = document.getElementById('cal-year');
  if (!monthSel || !yearSel) return;

  monthSel.innerHTML = months.map((m, i) =>
    `<option value="${i}" ${i === calDate.getMonth() ? 'selected' : ''}>${m}</option>`
  ).join('');

  const curYear = calDate.getFullYear();
  yearSel.innerHTML = '';
  for (let y = curYear - 2; y <= curYear + 2; y++) {
    yearSel.innerHTML += `<option value="${y}" ${y === curYear ? 'selected' : ''}>${y}</option>`;
  }
}

export function profileCalRender() {
  const monthSel = document.getElementById('cal-month');
  const yearSel  = document.getElementById('cal-year');
  if (!monthSel || !yearSel) return;
  const month = parseInt(monthSel.value);
  const year  = parseInt(yearSel.value);
  calDate = new Date(year, month, 1);
  renderCalGrid(year, month);
}

export function profileCalPrev() {
  calDate.setMonth(calDate.getMonth() - 1);
  const monthSel = document.getElementById('cal-month');
  const yearSel  = document.getElementById('cal-year');
  if (monthSel) monthSel.value = calDate.getMonth();
  if (yearSel)  yearSel.value  = calDate.getFullYear();
  renderCalGrid(calDate.getFullYear(), calDate.getMonth());
}

export function profileCalNext() {
  calDate.setMonth(calDate.getMonth() + 1);
  const monthSel = document.getElementById('cal-month');
  const yearSel  = document.getElementById('cal-year');
  if (monthSel) monthSel.value = calDate.getMonth();
  if (yearSel)  yearSel.value  = calDate.getFullYear();
  renderCalGrid(calDate.getFullYear(), calDate.getMonth());
}

function renderCalGrid(year, month) {
  const grid = document.getElementById('profile-cal-grid');
  if (!grid) return;

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayHeaders = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = dayHeaders.map(d => `<div class="cal-day-header-new">${d}</div>`).join('');

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-day-new empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${year}-${pad(month + 1)}-${pad(d)}`;
    const isToday =
      d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasReservation = reservationDates.includes(dateStr);
    const classes = [
      'cal-day-new',
      isToday ? 'today' : '',
      hasReservation ? 'has-reservation' : ''
    ].filter(Boolean).join(' ');
    
    const onClickAttr = hasReservation ? `onclick="window.openReservationsList('${dateStr}')" style="cursor:pointer;"` : '';
    html += `<div class="${classes}" ${onClickAttr}>${d}</div>`;
  }

  grid.innerHTML = html;
}

// ── Purchase History ────────────────────────────────────────────
async function loadPurchaseHistory(session) {
  const container = document.getElementById('profile-purchases-list');
  if (!container) return;

  let purchases = [];
  try {
    const res = await fetch(`${API}/api/orders?userId=${session.id}&role=${session.type || 'Cliente'}`);
    if (res.ok) {
      purchases = await res.json();
    } else {
      purchases = session.purchases || [];
    }
  } catch {
    purchases = session.purchases || [];
  }

  if (!purchases.length) {
    container.innerHTML = `<div class="profile-empty" style="text-align: center; color: #999;">Aún no tienes compras registradas.</div>`;
    return;
  }

  // Sort by date descending
  purchases.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));

  let totalHistoricalPoints = 0;

  container.innerHTML = purchases.map(p => {
    let dateStr = '—';
    const dateVal = p.timestamp || p.date;
    try {
      if(dateVal) {
        let d = new Date(dateVal);
        let m = d.toLocaleDateString('es-MX', { month: 'long' });
        m = m.charAt(0).toUpperCase() + m.slice(1);
        dateStr = `${d.getDate()} - ${m} - ${d.getFullYear()}`;
      }
    } catch(e) {}
    
    const itemsHtml = (p.items && p.items.length > 0)
      ? p.items.map(i => `${i.qty}x ${i.name}`).join(', ')
      : '';

    const total = p.totalMXN || p.total || 0;
    const earned = p.earnedDelipoints != null ? p.earnedDelipoints : Math.round(total * 0.05);
    const used = p.usedDelipoints || 0;
    
    totalHistoricalPoints += (earned - used);

    return `
      <div class="purchase-card-new">
        <div class="purchase-title-new">${p.restaurantName || p.businessName || p.restaurant || 'Negocio'}</div>
        ${itemsHtml ? `<div class="purchase-row-new" style="color: #555; font-size: 13px; margin-bottom: 6px;">Productos: ${itemsHtml}</div>` : ''}
        <div class="purchase-row-new">Total: $${total.toFixed(2)}</div>
        <div class="purchase-row-new">Fecha: ${dateStr}</div>
        <div class="purchase-row-new" style="color: var(--primary-color); font-weight: bold;">Delipoints ganados: 🎁 $${earned.toFixed(2)}</div>
        ${used > 0 ? `<div class="purchase-row-new" style="color: #8b5b3f;">Delipoints usados: -$${used.toFixed(2)}</div>` : ''}
      </div>`;
  }).join('');
  
  if (totalHistoricalPoints !== session.delipoints) {
    session.delipoints = totalHistoricalPoints > 0 ? totalHistoricalPoints : 0;
    localStorage.setItem('solana_session', JSON.stringify(session));
    const mxn = session.delipoints.toFixed(2);
    const sol = (session.delipoints / SOL_RATE).toFixed(4);
    const mxnEl = document.getElementById('profile-delipoints-mxn');
    const solEl = document.getElementById('profile-delipoints-sol');
    if (mxnEl) mxnEl.textContent = `$ ${mxn} MXN`;
    if (solEl) solEl.textContent = `${sol} SOL`;
  }
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Profile Reservations View ────────────────────────────────────
export function openReservationsList(dateStr) {
  const listEl = document.getElementById('user-res-list');
  if(!listEl) return;
  
  const dailyRes = allUserReservations.filter(r => r.date === dateStr);
  const session = getSession();
  
  if(dailyRes.length === 0) {
    listEl.innerHTML = '<p style="text-align:center;color:#888;">No hay reservaciones para esta fecha.</p>';
  } else {
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const [y, m, d] = dateStr.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    
    listEl.innerHTML = dailyRes.map(r => `
      <div class="user-res-card">
        <h3 class="user-res-card-title">Reservacion</h3>
        <div class="user-res-row">Restaurante: <span>${r.restaurantName.toLowerCase() || 'Restaurante'}</span></div>
        <div class="user-res-row">Cantidad: <span>${r.guests}</span></div>
        <div class="user-res-row">Hora: <span>${r.time}</span></div>
        <div class="user-res-row">Fecha: <span>${formattedDate}</span></div>
        <div class="user-res-row">Nombre: <span>${(r.reservationName || session.name).toLowerCase()}</span></div>
        <div class="user-res-row">Zona de restaurante: <span>${r.zone || 'Terraza'}</span></div>
        <div class="user-res-row">Telefono: <span>${session.phone || '4444444444'}</span></div>
        <div class="user-res-row">Correo: <span>${(session.email || 'usuario@gmail.com').toLowerCase()}</span></div>
        
        <button class="user-res-new-btn" onclick="window.backToDiscovery()">Nueva reservacion</button>
      </div>
    `).join('');
  }
  showScreen('screen-user-reservations');
}

export function backToProfile() {
  showScreen('screen-profile');
}
