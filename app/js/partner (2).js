// js/partner.js — Partner/restaurant management
import { API, SOL_RATE, getSession, days } from './app.js';

export let partnerMenu = [];

export function renderSchedule() {
  const c = document.getElementById('schedule-container');
  if(c) c.innerHTML = days.map((d,i) => `
    <div style="display:flex;align-items:center;gap:5px;font-size:12px;margin-bottom:5px;">
      <input type="checkbox" id="check-${i}" ${i<5?'checked':''} onchange="syncSchedule(${i})">
      <span style="width:65px;">${d}</span>
      <input type="time" id="start-${i}" value="09:00" style="padding:5px;" onchange="syncSchedule(${i})">
      <input type="time" id="end-${i}" value="22:00" style="padding:5px;" onchange="syncSchedule(${i})">
    </div>
  `).join('');
}

export function syncSchedule(idx) {
  if(idx===0) {
    const s=document.getElementById('start-0').value;
    const e=document.getElementById('end-0').value;
    const c=document.getElementById('check-0').checked;
    for(let i=1;i<7;i++){
      document.getElementById(`start-${i}`).value=s;
      document.getElementById(`end-${i}`).value=e;
      document.getElementById(`check-${i}`).checked=c;
    }
  }
}

export function addCategory() {
  const n=document.getElementById('new-cat').value.trim();
  if(n){
    partnerMenu.push({name:n,items:[]});
    document.getElementById('new-cat').value="";
    renderPartnerMenu();
  }
}

export function addItem(idx) {
  const n=prompt("Nombre platillo:");
  const d=prompt("Descripción (ingredientes, tamaño, etc.):");
  const p=prompt("Precio ($ MXN):");
  if(n&&p){
    partnerMenu[idx].items.push({name:n,desc:d,price:p});
    renderPartnerMenu();
  }
}

export function renderPartnerMenu() {
  const list = document.getElementById('partner-menu-list');
  if(list) list.innerHTML = partnerMenu.map((cat,i) => `
    <div class="menu-cat-container">
      <div style="display:flex;justify-content:space-between;align-items:center;"><b>${cat.name}</b><button onclick="addItem(${i})" style="background:var(--secondary-color);color:white;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:16px;">+</button></div>
      ${cat.items.map(it => `<div class="menu-item-display"><b>${it.name}</b>${it.desc?'<br><small style="color:#777;font-style:italic">'+it.desc+'</small>':''}<br><span style="color:var(--secondary-color);font-weight:bold">$${it.price} MXN</span> <span class="sol-price">≈ ◎${((parseFloat(it.price)||0)/SOL_RATE).toFixed(6)} SOL</span></div>`).join('')}
    </div>
  `).join('');
}

export function setPartnerMenu(menu) {
  partnerMenu.length = 0;
  partnerMenu.push(...menu);
}

export async function savePartnerInfo() {
  const session = getSession(); if(!session) return;
  const body = { userId:session.id, name:document.getElementById('biz-name').value, desc:document.getElementById('biz-desc').value, menu:partnerMenu };
  try {
    const res = await fetch(API+'/api/restaurants', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    if(res.ok) alert("¡Información guardada!"); else alert("Error al guardar.");
  } catch(e) { alert("Error: "+e.message); }
}
