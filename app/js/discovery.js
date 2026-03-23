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
  if (!list) return;
  list.innerHTML = '<div class="loading">Cargando...</div>';
  try {
    const res = await fetch(API + '/api/restaurants');
    allRestaurants = await res.json();
    activeFilter = 'Todo';
    searchQuery = '';
    renderFilterChips(allRestaurants);
    renderRestaurantCards(allRestaurants);
  } catch (e) { list.innerHTML = '<p style="color:red">Error cargando restaurantes.</p>'; }
}

export async function viewMenu(restaurantId) {
  try {
    const res = await fetch(API + '/api/restaurants/' + restaurantId + '/menu');
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
        <span class="detail-header-rating">
          <span class="rating-num">${data.rating || '5.0'}</span>
          <span class="stars" style="color:#e8a84c;font-size:18px;">${renderStars(data.rating)}</span>
        </span>
      </div>
      <div class="detail-schedule-wrap">
        <span class="schedule-label">Horarios:</span> <span class="schedule-text">${scheduleStr} de 8:00 a.m. a 10 p.m.</span>
      </div>
      <img class="detail-hero" src="${data.img || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80'}" alt="${data.name}" />
    `;
    if (data.desc) html += `<p class="detail-desc">${data.desc}</p>`;
    if (data.wallet) {
      html += `<div style="text-align:center;margin-bottom:15px;"><span style="background:#1a1a2e;color:#14F195;padding:6px 12px;border-radius:10px;font-size:11px;">🟣 Acepta pagos en SOL · ${shortAddr(data.wallet)}</span></div>`;
    }
    html += `<button class="btn-reserve-new" onclick="alert('Función de reservación próximamente.')">¿Buscas Reservar?</button>`;
    html += `<hr class="menu-divider" />`;

    html += `
      <div class="menu-section-header-new">
        <h3>Menú</h3>
        <div class="menu-search-wrapper">
          <input class="menu-search-new" type="text" placeholder="Buscar platillo..." oninput="filterMenuItems(this.value)" />
          <span class="search-icon-new">🔍</span>
        </div>
      </div>
    `;

    if (!data.menu || data.menu.length === 0) {
      html += '<p style="color:#aaa;text-align:center;">Este restaurante aún no tiene menú.</p>';
    } else {
      html += '<div id="menu-cards-container">';
      data.menu.forEach((cat, idx) => {
        const imgUrl = catImages[idx % catImages.length];
        html += `
          <div class="menu-cat-card-new" data-category>
            <h4>${cat.name}</h4>
            <img class="menu-cat-card-img-new" src="${cat.catImg || imgUrl}" alt="${cat.name}" />
            <div class="menu-cat-footer">
              <ul class="menu-item-list-bullets">
                ${cat.items.map(it => `
                  <li data-item-name="${it.name.toLowerCase()}">${it.name}</li>
                `).join('')}
              </ul>
              <button class="btn-ver" onclick="viewCategory('${restaurantId}', '${cat.name.replace(/'/g, "\\'")}')">Ver</button>>
            </div>
          </div>
        `;
      });
      html += '</div>';
    }
    container.innerHTML = html;
  } catch (e) { alert("Error cargando menú."); }
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

export async function viewCategory(restaurantId, categoryName) {
  try {
    const res = await fetch(API + '/api/restaurants/' + restaurantId + '/menu');
    const data = await res.json();
    const container = document.getElementById('client-discovery-list');

    const cat = data.menu.find(c => c.name === categoryName);
    if (!cat) return;

    let html = `
      <div class="detail-header">
        <a class="back-arrow" onclick="viewMenu('${restaurantId}')">←</a>
        <h2 class="rest-name">${data.name}</h2>
        <span class="detail-header-rating">
          <span class="rating-num">${data.rating || '5.0'}</span>
          <span class="stars" style="color:#e8a84c;font-size:18px;">${renderStars(data.rating)}</span>
        </span>
      </div>
      <h3 class="category-hero-title">${cat.name}</h3>
      <img class="category-hero-img" src="${cat.catImg || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80'}" alt="${cat.name}" />
    `;

    html += '<div class="category-items-container">';
    cat.items.forEach((it, idx) => {
      const escapedName = it.name.replace(/'/g, "\\'");
      const itemId = 'item-' + idx;
      const defaultImg = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80';
      html += `
        <div class="item-card-detail">
          <div class="item-card-col-left">
            <h4 class="item-detail-name">${it.name}</h4>
            <p class="item-detail-desc">${it.desc || ''}</p>
            <div class="item-price">$ ${it.price || '0.0'}</div>
            <button class="btn-add-order" onclick="event.stopPropagation(); addToCart({name:'${escapedName}',price:'${it.price || 0}'},'${restaurantId}','${data.name.replace(/'/g, "\\'")}', '${data.wallet || ''}'); showAddedBadge('${itemId}')">Agregar al pedido</button>
          </div>
          <div class="item-card-col-right">
            <img class="item-detail-img" src="${it.itemImg || defaultImg}" alt="${it.name}" />
            <div id="added-badge-${itemId}" class="added-to-order-badge" style="display:none;">Agregaste este producto a tu pedido</div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  } catch (e) { console.error(e); alert("Error cargando categoría."); }
}

export function showAddedBadge(itemId) {
  const badge = document.getElementById('added-badge-' + itemId);
  if (badge) {
    badge.style.display = 'block';
    setTimeout(() => { badge.style.display = 'none'; }, 3000);
  }
}

