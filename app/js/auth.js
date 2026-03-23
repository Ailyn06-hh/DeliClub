// js/auth.js — Authentication (login, register, logout)
import { API, getSession, showScreen } from './app.js';
import { showMain } from './app.js';

export async function register(type) {
  let body = { type };
  if (type === 'Cliente') {
    body.name = document.getElementById('reg-user-name').value.trim();
    body.phone = document.getElementById('reg-user-phone').value.trim();
    body.email = document.getElementById('reg-user-email').value.trim();
    body.password = document.getElementById('reg-user-password').value;
    body.wallet = document.getElementById('reg-user-wallet').value.trim();
  } else {
    body.name = document.getElementById('reg-res-name').value.trim();
    body.rfc = document.getElementById('reg-res-rfc').value.trim();
    body.address = document.getElementById('reg-res-address').value.trim();
    body.foodCategory = document.getElementById('reg-res-category').value.trim();
    body.wallet = document.getElementById('reg-res-wallet').value.trim();
  }
  if(!body.name) { alert("Ingresa un nombre."); return; }
  if(!body.wallet) { alert("Conecta tu Phantom Wallet antes de registrarte."); return; }
  try {
    const res = await fetch(API+'/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const data = await res.json();
    if(!res.ok) { alert(data.error||'Error'); return; }
    localStorage.setItem("solana_session", JSON.stringify(data.user));
    showMain();
  } catch(e) { alert("Error: "+e.message); }
}

export async function login() {
  const name = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if(!name) { alert("Ingresa usuario."); return; }
  try {
    const res = await fetch(API+'/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,password}) });
    const data = await res.json();
    if(!res.ok) { alert(data.error||'Credenciales inválidas'); return; }
    localStorage.setItem("solana_session", JSON.stringify(data.user));
    showMain();
  } catch(e) { alert("Error: "+e.message); }
}

export function logout() { 
  localStorage.removeItem("solana_session"); 
  location.reload(); 
}
