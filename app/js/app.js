// js/app.js — Main entry point, router, constants, view loader
// ========== CONSTANTS (shared across modules) ==========
export const API = '';
export const SOL_RATE = 2500; // 1 SOL ≈ 2500 MXN
export const days = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
export const programIdStr = "D6E6bhYFzxJfmpKZAyxHpv9k7faX7ETUQDfYT7wj9KtJ";

// ========== UTILITY ==========
export function getSession() { 
  try { return JSON.parse(localStorage.getItem("solana_session")); } catch(e) { return null; } 
}

export function shortAddr(addr) { 
  return addr ? addr.slice(0,4)+'...'+addr.slice(-4) : ''; 
}

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

// ========== DYNAMIC VIEW LOADING ==========
async function loadViews() {
  const container = document.getElementById('app-container');
  const viewFiles = [
    'views/welcome.html',
    'views/login.html',
    'views/register-user.html',
    'views/register-restaurant.html',
    'views/dashboard.html',
    'views/profile.html',
    'views/restaurant-dashboard.html',
    'views/sucursales.html',
    'views/crear-sucursal.html',
    'views/reservations.html',
    'views/user-reservations.html',
    'views/restaurant-details.html',
    'views/partner-orders.html'

  ];
  
  for (const file of viewFiles) {
    try {
      const res = await fetch(file);
      const html = await res.text();
      container.insertAdjacentHTML('beforeend', html);
    } catch(e) {
      console.error(`Error loading view ${file}:`, e);
    }
  }
}

// ========== MAIN ==========
// Import all modules
import { connectWallet, connectWalletForReg, showWalletBalance } from './wallet.js';
import { register, login, logout } from './auth.js';
import { addToCart, removeFromCart, updateCartUI, showCart, payWithSOL, clearCart } from './cart.js';
import { renderDiscovery, viewMenu, viewCategory, showAddedBadge, filterMenuItems, filterByCategory, searchRestaurants, backToDiscovery } from './discovery.js';
import { renderSchedule, syncSchedule, addCategory, addItem, renderPartnerMenu, savePartnerInfo, setPartnerMenu, partnerMenu } from './partner.js';
import { createCampaign, fetchCampaigns, donate } from './solana.js';
import { renderRestaurantDashboard, showTrendsModal, closeTrendsModal } from './restaurant-dashboard.js';
import { openSucursales, backToRestaurantDashboard, searchSucursales, createNewSucursal } from './sucursales.js';
import { openCrearSucursal, submitNuevaSucursal } from './crear-sucursal.js';
import { openProfile, closeProfile, profileCalRender, profileCalPrev, profileCalNext, confirmLogout, openEditProfile, closeEditProfile, saveProfileChanges, openReservationsList, backToProfile, toggleAllPurchases } from './profile.js';
import { openReservations, resChangeQty, resCalRender, resCalPrev, resCalNext, resSelectDate, confirmReservation } from './reservations.js';
import { renderRestaurantDetails, saveRestaurantSchedule } from './restaurant-details.js';
import { openPartnerOrders, closePartnerOrders, filterPartnerOrders, acceptOrder, rejectOrder } from './partner-orders.js';

// Restaurant Details logic
export function openRestaurantDetails(id) {
  showScreen('screen-restaurant-details');
  if(id) {
    renderRestaurantDetails(id);
  }
}
export function backToSucursales() {
  showScreen('screen-sucursales');
}


export async function showMain() {
  const session = getSession();
  if(!session) { showScreen('screen-welcome'); return; }
  
  const isClient = session.type === 'Cliente';
  
  // Partner goes to restaurant dashboard
  if (!isClient) {
    showScreen('screen-restaurant-dashboard');
    renderRestaurantDashboard();
    return;
  }
  
  // Client flow
  showScreen('screen-main');
  
  const headerAvatar = document.getElementById("header-avatar");
  if(headerAvatar) {
    headerAvatar.style.backgroundImage = `url('${session.avatar || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80'}')`;
  }
  
  document.getElementById("user-name-display").innerText = session.name;
  const labelRoleEl = document.getElementById("label-role");
  if (labelRoleEl) labelRoleEl.innerText = session.name || '';
  document.getElementById('view-client').style.display = 'block';
  document.getElementById('view-partner').style.display = 'none';
  showWalletBalance();
  renderDiscovery(); fetchCampaigns();
}

// ========== EXPOSE FUNCTIONS TO GLOBAL SCOPE ==========
// (needed for onclick handlers in HTML)
window.showScreen = showScreen;
window.connectWallet = connectWallet;
window.connectWalletForReg = connectWalletForReg;
window.register = register;
window.login = login;
window.logout = logout;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.showCart = showCart;
window.payWithSOL = payWithSOL;
window.clearCart = clearCart;
window.renderDiscovery = renderDiscovery;
window.viewMenu = viewMenu;
window.viewCategory = viewCategory;
window.showAddedBadge = showAddedBadge;
window.filterMenuItems = filterMenuItems;
window.filterByCategory = filterByCategory;
window.searchRestaurants = searchRestaurants;
window.backToDiscovery = backToDiscovery;
window.renderSchedule = renderSchedule;
window.syncSchedule = syncSchedule;
window.addCategory = addCategory;
window.addItem = addItem;
window.savePartnerInfo = savePartnerInfo;
window.createCampaign = createCampaign;
window.fetchCampaigns = fetchCampaigns;
window.donate = donate;
window.openProfile = openProfile;
window.closeProfile = closeProfile;
window.profileCalRender = profileCalRender;
window.profileCalPrev = profileCalPrev;
window.profileCalNext = profileCalNext;
window.confirmLogout = confirmLogout;
window.openEditProfile = openEditProfile;
window.closeEditProfile = closeEditProfile;
window.saveProfileChanges = saveProfileChanges;
window.renderRestaurantDashboard = renderRestaurantDashboard;
window.showTrendsModal = showTrendsModal;
window.closeTrendsModal = closeTrendsModal;
window.openSucursales = openSucursales;
window.backToRestaurantDashboard = backToRestaurantDashboard;
window.searchSucursales = searchSucursales;
window.createNewSucursal = createNewSucursal;
window.openCrearSucursal = openCrearSucursal;
window.submitNuevaSucursal = submitNuevaSucursal;
window.openReservationsList = openReservationsList;
window.backToProfile = backToProfile;
window.toggleAllPurchases = toggleAllPurchases;
window.openRestaurantDetails = openRestaurantDetails;
window.backToSucursales = backToSucursales;
window.saveRestaurantSchedule = saveRestaurantSchedule;
window.openPartnerOrders = openPartnerOrders;
window.closePartnerOrders = closePartnerOrders;
window.filterPartnerOrders = filterPartnerOrders;
window.acceptOrder = acceptOrder;
window.rejectOrder = rejectOrder;


window.openReservations = openReservations;
window.resChangeQty = resChangeQty;
window.resCalRender = resCalRender;
window.resCalPrev = resCalPrev;
window.resCalNext = resCalNext;
window.resSelectDate = resSelectDate;
window.confirmReservation = confirmReservation;

// ========== INITIALIZE ==========
try { if(typeof buffer!=='undefined') window.Buffer=buffer.Buffer; } catch(e) {}

// Load views then start
await loadViews();
showMain();