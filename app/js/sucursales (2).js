// js/sucursales.js — Sucursales (Branches) management view
import { API, getSession, showScreen } from './app.js';

let allBranches = [];

export async function openSucursales() {
  showScreen('screen-sucursales');
  await loadBranches();
}

export function backToRestaurantDashboard() {
  showScreen('screen-restaurant-dashboard');
}

async function loadBranches() {
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(API + '/api/restaurants');
    const restaurants = await res.json();

    // Find all restaurants owned by this partner
    const mine = restaurants.filter(r => r.ownerId === session.id);

    // If partner has only one, show it as main + allow creating more
    if (mine.length === 0) {
      allBranches = [];
    } else {
      allBranches = mine.map(r => ({
        id: r.id,
        name: r.name || 'Sin nombre',
        status: r.status || 'Abierto'
      }));
    }

    renderBranches(allBranches);
  } catch (e) {
    console.error('Error loading branches:', e);
    allBranches = [];
    renderBranches([]);
  }
}

function renderBranches(branches) {
  const grid = document.getElementById('suc-grid');
  if (!grid) return;

  if (branches.length === 0) {
    grid.innerHTML = '<p style="text-align:center; color:#aaa; padding:30px;">No hay sucursales registradas.</p>';
    return;
  }

  grid.innerHTML = branches.map(b => {
    const isOpen = b.status === 'Abierto';
    const statusClass = isOpen ? 'suc-status-open' : 'suc-status-closed';
    const statusText = isOpen ? 'Abierto' : 'Cerrado';
    return `
      <div class="suc-card">
        <div class="suc-card-name">${b.name}</div>
        <div class="suc-card-status ${statusClass}">${statusText}</div>
      </div>
    `;
  }).join('');
}

export function searchSucursales(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderBranches(allBranches);
    return;
  }
  const filtered = allBranches.filter(b =>
    b.name.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)
  );
  renderBranches(filtered);
}

import { openCrearSucursal } from './crear-sucursal.js';

export function createNewSucursal() {
  openCrearSucursal();
}
