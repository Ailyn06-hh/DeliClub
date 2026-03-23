// js/discovery.js — Restaurant discovery and menu viewing
import { API, SOL_RATE, shortAddr } from './app.js';
import { addToCart, cart, currentRestaurant, updateCartUI, clearCart } from './cart.js';

const catImages = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80'
];

// Restaurant images for cards (high quality)
const restaurantImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80'
];

let allRestaurants = [];
let activeFilter = 'Todo';
let searchQuery = '';

function renderStars(rating) {
  const r = parseFloat(rating) || 0;
  const full = Math.floor(r);
  const half = r - full >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '☆' : '') + '<span style="color:#ddd;">' + '★'.repeat(empty) + '</span>';
}

function renderFilterChips(restaurants) {
  const chipsContainer = document.getElementById('filter-chips');
  if (!chipsContainer) return;

  // Collect unique food categories/tags
  const categories = new Set();
  restaurants.forEach(r => {
    if (r.tags) {
      r.tags.split(',').forEach(t => {
        const tag = t.trim();
        if (tag) categories.add(tag);
      });
    }
  });

  const chips = ['Todo', ...Array.from(categories)];
  chipsContainer.innerHTML = chips.map(cat =>
    `<button class="filter-chip ${cat === activeFilter ? 'active' : ''}" onclick="filterByCategory('${cat.replace(/'/g, "\\'")}')">${cat}</button>`
  ).join('');
}

function getFilteredRestaurants() {
  let filtered = allRestaurants;

  // Filter by category
  if (activeFilter !== 'Todo') {
    filtered = filtered.filter(r =>
      r.tags && r.tags.toLowerCase().includes(activeFilter.toLowerCase())
    );
  }

  // Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.tags && r.tags.toLowerCase().includes(q)) ||
      (r.desc && r.desc.toLowerCase().includes(q))
    );
  }

  return filtered;
}

function renderRestaurantCards(restaurants) {
  const list = document.getElementById('client-discovery-list');
  if (!list) return;

  if (restaurants.length === 0) {
    list.innerHTML = '<p style="color:#aaa;text-align:center;padding:30px 0;">No se encontraron restaurantes.</p>';
    return;
  }

  list.innerHTML = restaurants.map((r, idx) => {
    const img = r.img || restaurantImages[idx % restaurantImages.length];
    const rating = r.rating || '5.0';
    const tags = r.tags || '';
    const isFirstCard = idx === 0 && activeFilter === 'Todo' && !searchQuery;

    return `
      <div class="res-card" onclick="viewMenu('${r.id}')">
        <div class="res-img" style="background-image: url('${img}')"></div>
        <div class="res-info">
          <div class="res-name-row">
            <h3 class="res-name">${r.name}</h3>
            <div class="res-rating">
              <span>${rating}</span>
              <span class="stars">${renderStars(rating)}</span>
            </div>
          </div>
          <div class="res-tags">${tags}${r.desc ? ' · ' + r.desc : ''}</div>
          ${isFirstCard ? '<div class="res-location"><span class="loc-dot"></span> Ahora mismo te encuentras en este restaurante</div>' : `<div class="res-location"><span class="loc-dot"></span> ${r.status || 'Abierto'}</div>`}
          ${r.wallet ? '<div class="res-sol-badge">🟣 Acepta SOL</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

export function filterByCategory(category) {
  activeFilter = category;
  renderFilterChips(allRestaurants);
  renderRestaurantCards(getFilteredRestaurants());
}

export function searchRestaurants(query) {
  searchQuery = query;
  renderRestaurantCards(getFilteredRestaurants());
}

export async function renderDiscovery() {
  const list = document.getElementById('client-discovery-list');
  if(!list) return;
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const res = await fetch(API+'/api/restaurants');
    allRestaurants = await res.json();
    activeFilter = 'Todo';
    searchQuery = '';
    renderFilterChips(allRestaurants);
    renderRestaurantCards(allRestaurants);
  } catch(e) { list.innerHTML = '<p style="color:red">Error cargando restaurantes.</p>'; }
}

export async function viewMenu(restaurantId) {
  try {
    const res = await fetch(API+'/api/restaurants/'+restaurantId+'/menu');
    const data = await res.json();
    const container = document.getElementById('client-discovery-list');
    // Hide filter chips and search while viewing menu
    const chipsEl = document.getElementById('filter-chips');
    const searchEl = document.getElementById('search-restaurants');
    if (chipsEl) chipsEl.style.display = 'none';
    if (searchEl) searchEl.parentElement.style.display = 'none';

    // Clear cart if switching restaurants
    if (currentRestaurant && currentRestaurant.id !== restaurantId) { clearCart(); }

    let scheduleStr = 'Lun - Dom';
    let html = `
      <div class="detail-header">
        <a class="back-arrow" onclick="backToDiscovery()">←</a>
        <h2 class="rest-name">${data.name}</h2>
        <span class="detail-header rest-rating">${data.rating || '5.0'} <span class="stars" style="color:#e8a84c;font-size:18px;">${renderStars(data.rating)}</span></span>
      </div>
      <div class="detail-schedule"><strong>Horarios:</strong> ${scheduleStr} de 8:00 a.m. a 10 p.m.</div>
      <img class="detail-hero" src="${data.img || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80'}" alt="${data.name}" />
    `;
    if (data.desc) html += `<p class="detail-desc">${data.desc}</p>`;
    if (data.wallet) {
      html += `<div style="text-align:center;margin-bottom:15px;"><span style="background:#1a1a2e;color:#14F195;padding:6px 12px;border-radius:10px;font-size:11px;">🟣 Acepta pagos en SOL · ${shortAddr(data.wallet)}</span></div>`;
    }
    html += `<button class="btn-reserve" onclick="alert('Función de reservación próximamente.')">¿Buscas Reservar?</button>`;
    html += `<div class="menu-section-header"><h3>Menú</h3><input class="menu-search" type="text" placeholder="Buscar platillo..." oninput="filterMenuItems(this.value)" /></div>`;

    if (!data.menu || data.menu.length === 0) {
      html += '<p style="color:#aaa;text-align:center;">Este restaurante aún no tiene menú.</p>';
    } else {
      html += '<div id="menu-cards-container">';
      data.menu.forEach((cat, idx) => {
        const imgUrl = catImages[idx % catImages.length];
        html += `
          <div class="menu-cat-card" data-category>
            <img class="menu-cat-card-img" src="${imgUrl}" alt="${cat.name}" />
            <div class="menu-cat-card-body">
              <h4>${cat.name}</h4>
              <ul>
                ${cat.items.map(it => `
                  <li data-item-name="${it.name.toLowerCase()}" style="display:flex;justify-content:space-between;align-items:center;list-style:none;padding:5px 0;">
                    <div><strong>${it.name}</strong>${it.price ? ' — $'+it.price+' MXN' : ''}<br><span class="sol-price">≈ ◎${((parseFloat(it.price)||0)/SOL_RATE).toFixed(6)} SOL</span></div>
                    ${data.wallet ? `<button class="cart-item-btn" onclick="event.stopPropagation();addToCart({name:'${it.name.replace(/'/g,"\\'")}',price:'${it.price}'},'${restaurantId}','${data.name.replace(/'/g,"\\'")}','${data.wallet}')">+</button>` : ''}
                  </li>
                `).join('')}
              </ul>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }
    container.innerHTML = html;
  } catch(e) { alert("Error cargando menú."); }
}

export function backToDiscovery() {
  // Show filter chips and search again
  const chipsEl = document.getElementById('filter-chips');
  const searchEl = document.getElementById('search-restaurants');
  if (chipsEl) chipsEl.style.display = '';
  if (searchEl) searchEl.parentElement.style.display = '';
  clearCart();
  renderDiscovery();
}

export function filterMenuItems(query) {
  const q = query.toLowerCase();
  document.querySelectorAll('#menu-cards-container [data-category]').forEach(card => {
    const items = card.querySelectorAll('[data-item-name]');
    let hasMatch = false;
    items.forEach(li => {
      const match = !q || li.getAttribute('data-item-name').includes(q);
      li.style.display = match ? '' : 'none';
      if (match) hasMatch = true;
    });
    card.style.display = (!q || hasMatch) ? '' : 'none';
  });
}
