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
    'views/reservations.html'
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
import { openProfile, closeProfile, profileCalRender, profileCalPrev, profileCalNext, confirmLogout, openEditProfile, closeEditProfile, saveProfileChanges } from './profile.js';
import { openReservations, resChangeQty, resCalRender, resCalPrev, resCalNext, resSelectDate, confirmReservation } from './reservations.js';

export async function showMain() {
  const session = getSession();
  if(!session) { showScreen('screen-welcome'); return; }
  showScreen('screen-main');
  
  const headerAvatar = document.getElementById("header-avatar");
  if(headerAvatar) {
    headerAvatar.style.backgroundImage = `url('${session.avatar || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80'}')`;
  }
  
  document.getElementById("user-name-display").innerText = session.name;
  const labelRoleEl = document.getElementById("label-role");
  if (labelRoleEl) labelRoleEl.innerText = session.name || '';
  const isClient = session.type === 'Cliente';
  document.getElementById('view-client').style.display = isClient ? 'block' : 'none';
  document.getElementById('view-partner').style.display = isClient ? 'none' : 'block';
  showWalletBalance();
  if(isClient) { renderDiscovery(); fetchCampaigns(); }
  else {
    try { 
      const res=await fetch(API+'/api/restaurants'); 
      const all=await res.json(); 
      const mine=all.find(r=>r.ownerId===session.id);
      if(mine){
        document.getElementById('biz-name').value=mine.name||'';
        document.getElementById('biz-desc').value=mine.desc||'';
        setPartnerMenu(mine.menu||[]);
        renderPartnerMenu();
      }
    } catch(e){}
    renderSchedule();
  }
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