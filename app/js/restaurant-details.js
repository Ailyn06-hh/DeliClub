// js/restaurant-details.js — Handle logic for the restaurant details view

import { API, getSession, showScreen, days, SOL_RATE } from './app.js';

let currentRestaurantId = null;
let currentRestaurantData = null;

export async function renderRestaurantDetails(id) {
  currentRestaurantId = id;
  const session = getSession();
  if (!session) return;

  try {
    const res = await fetch(`${API}/api/restaurants/${id}/menu`);
    const data = await res.json();
    currentRestaurantData = data;

    // Set Name
    const titleEl = document.querySelector('#screen-restaurant-details .suc-title');
    if (titleEl) titleEl.innerText = data.name || 'Sin Nombre';

    // Status switch
    const isAbierto = data.status === 'Abierto';
    const switchEl = document.querySelector('#screen-restaurant-details .rd-switch input');
    const statusTextEl = document.querySelector('#screen-restaurant-details .rd-status-text');
    if (switchEl) switchEl.checked = isAbierto;
    if (statusTextEl) statusTextEl.innerText = isAbierto ? 'Abierto' : 'Cerrado';
    
    if (switchEl) {
      switchEl.onchange = async (e) => {
        const checked = e.target.checked;
        const newStatus = checked ? 'Abierto' : 'Cerrado';
        statusTextEl.innerText = newStatus;
        currentRestaurantData.status = newStatus;
        await fetch(`${API}/api/restaurants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.id,
            name: currentRestaurantData.name,
            desc: currentRestaurantData.desc,
            menu: currentRestaurantData.menu,
            schedule: currentRestaurantData.schedule
          })
          // The API might not persist purely status updates without full struct in /api/restaurants, 
          // but we supply existing data to not overwrite
        });
      };
    }

    // Orders today 
    // We simply fetch all orders and filter by today and this restaurant
    const ordersRes = await fetch(`${API}/api/orders?userId=${session.id}&role=Partner`);
    const allOrders = await ordersRes.json();
    const today = new Date().toISOString().split('T')[0];
    const todaysOrders = allOrders.filter(o => o.restaurantId === id && o.timestamp.startsWith(today));
    
    let ventasHoy = 0;
    todaysOrders.forEach(o => ventasHoy += (o.totalMXN || 0));

    const salesEl = document.querySelector('#screen-restaurant-details .rd-detail-amount');
    if (salesEl) salesEl.innerText = `$${ventasHoy.toFixed(2)}`;

    // Menu Count
    const menuEl = document.querySelectorAll('#screen-restaurant-details .rd-detail-subtext.small')[0];
    if (menuEl) {
      const catCount = Array.isArray(data.menu) ? data.menu.length : 0;
      menuEl.innerText = `${catCount} platillos/secciones`;
    }

    // Tokens and Delipoints 
    let tokens = 0;
    let delipoints = 0;
    allOrders.filter(o => o.restaurantId === id).forEach(o => {
      delipoints += (o.usedDelipoints || 0);
      tokens += 10; // For instance, mock logic: 10 tokens per order
    });
    
    document.getElementById('rd-tokens-awarded').innerText = `${tokens} Tokens`;
    const dpMxn = document.getElementById('rd-delipoints-mxn');
    const dpSol = document.getElementById('rd-delipoints-sol');
    if(dpMxn) dpMxn.innerText = `$${delipoints.toFixed(2)} MXN`;
    if(dpSol) {
      const solValue = delipoints / SOL_RATE;
      dpSol.innerText = `${solValue.toFixed(4)} SOL`;
    }

    // Schedule
    renderScheduleInputs(data.schedule || {});

  } catch(e) {
    console.error('Error loading restaurant details:', e);
  }
}

function renderScheduleInputs(schedule) {
  const container = document.getElementById('rd-schedule-container');
  if (!container) return;

  container.innerHTML = days.map(d => {
    const isChecked = schedule && schedule[d] && schedule[d].open;
    const openTime = schedule && schedule[d] && schedule[d].start ? schedule[d].start : '10:00';
    const closeTime = schedule && schedule[d] && schedule[d].end ? schedule[d].end : '20:00';
    
    return `
      <div class="rd-schedule-item rd-flex-center" style="margin-bottom: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; width: 110px; font-weight: 700; font-size: 14px; color: #555;">
          <input type="checkbox" id="sch-chk-${d}" ${isChecked ? 'checked' : ''} style="width: auto; margin: 0; transform: scale(1.2);">
          ${d}
        </label>
        <input type="time" id="sch-start-${d}" value="${openTime}" style="padding: 6px; border-radius: 6px; border: 1px solid #ccc; font-size: 13px; margin: 0; width: auto; font-family: inherit;">
        <span style="font-size: 13px; color: #555; margin: 0 4px;">a</span>
        <input type="time" id="sch-end-${d}" value="${closeTime}" style="padding: 6px; border-radius: 6px; border: 1px solid #ccc; font-size: 13px; margin: 0; width: auto; font-family: inherit;">
      </div>
    `;
  }).join('');
}

export async function saveRestaurantSchedule() {
  if(!currentRestaurantId || !currentRestaurantData) return;
  const session = getSession();
  
  const newSchedule = {};
  for(const d of days) {
    const isChecked = document.getElementById(`sch-chk-${d}`).checked;
    const start = document.getElementById(`sch-start-${d}`).value;
    const end = document.getElementById(`sch-end-${d}`).value;
    newSchedule[d] = { open: isChecked, start, end };
  }

  currentRestaurantData.schedule = newSchedule;

  try {
    await fetch(`${API}/api/restaurants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.id,
        name: currentRestaurantData.name,
        desc: currentRestaurantData.desc,
        menu: currentRestaurantData.menu,
        schedule: newSchedule
      })
    });
    alert('Horarios guardados exitosamente');
  } catch(e) {
    console.error('Error saving schedule', e);
    alert('Error al guardar los horarios');
  }
}
