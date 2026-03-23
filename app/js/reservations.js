import { getSession, showScreen, API } from './app.js';

let resDate = new Date();
export let currentResRestaurant = null;
let resQty = 2;
let selectedDate = null;

export function openReservations(restaurantId) {
  const session = getSession();
  if (!session) return;
  fetch(`${API}/api/restaurants`)
    .then(res => res.json())
    .then(all => {
      currentResRestaurant = all.find(r => r.id === restaurantId);
      if(!currentResRestaurant) return;
      
      const resNameEl = document.getElementById('res-restaurant-name');
      const resImgEl = document.getElementById('res-restaurant-img');
      const resSchedule = document.getElementById('res-restaurant-schedule');
      const resRating = document.getElementById('res-restaurant-rating');
      const resUserName = document.getElementById('res-user-name');
      const resAvatar = document.getElementById('res-header-avatar');
      
      if(resNameEl) resNameEl.textContent = currentResRestaurant.name;
      if(resImgEl) resImgEl.style.backgroundImage = `url('${currentResRestaurant.img}')`;
      if(resSchedule) {
        const sched = currentResRestaurant.schedule;
        if (sched && typeof sched === 'object' && Object.keys(sched).length > 0) {
          const firstDay = Object.values(sched)[0];
          if (firstDay && firstDay.open) {
            resSchedule.innerHTML = `<strong>Horarios:</strong> Lun - Dom de ${firstDay.open} a ${firstDay.close}`;
          } else {
            resSchedule.innerHTML = `<strong>Horarios:</strong> Lun - Dom de 8:00 a.m. a 10 p.m.`;
          }
        } else {
          resSchedule.innerHTML = `<strong>Horarios:</strong> Lun - Dom de 8:00 a.m. a 10 p.m.`;
        }
      }
      if(resRating) resRating.innerHTML = `${currentResRestaurant.rating} ⭐️⭐️⭐️⭐️⭐️`;
      if(resUserName) resUserName.textContent = session.name;
      if(resAvatar) resAvatar.style.backgroundImage = `url('${session.avatar || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&q=80'}')`;
      
      document.getElementById('res-input-name').value = session.name;
      resQty = 2;
      document.getElementById('res-qty').textContent = resQty;
      
      populateTimeSelectors();
      
      resDate = new Date();
      selectedDate = null; // reset
      resBuildCalSelectors();
      resCalRender();
      
      showScreen('screen-reservations');
    });
}

export function resChangeQty(delta) {
  resQty += delta;
  if(resQty < 1) resQty = 1;
  if(resQty > 20) resQty = 20;
  document.getElementById('res-qty').textContent = resQty;
}

function populateTimeSelectors() {
  const hrSel = document.getElementById('res-hour');
  if(!hrSel) return;
  hrSel.innerHTML = '';
  // Populate hours 8 to 22
  for(let i = 8; i <= 22; i++) {
    const pad = String(i).padStart(2, '0');
    hrSel.innerHTML += `<option value="${pad}">${pad}</option>`;
  }
}

function resBuildCalSelectors() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const monthSel = document.getElementById('res-cal-month');
  const yearSel  = document.getElementById('res-cal-year');
  if (!monthSel || !yearSel) return;

  monthSel.innerHTML = months.map((m, i) =>
    `<option value="${i}" ${i === resDate.getMonth() ? 'selected' : ''}>${m}</option>`
  ).join('');

  const curYear = new Date().getFullYear();
  yearSel.innerHTML = '';
  for (let y = curYear; y <= curYear + 2; y++) {
    yearSel.innerHTML += `<option value="${y}" ${y === resDate.getFullYear() ? 'selected' : ''}>${y}</option>`;
  }
}

export function resCalRender() {
  const monthSel = document.getElementById('res-cal-month');
  const yearSel  = document.getElementById('res-cal-year');
  if (!monthSel || !yearSel) return;
  const month = parseInt(monthSel.value);
  const year  = parseInt(yearSel.value);
  resDate = new Date(year, month, 1);
  drawResCalGrid(year, month);
}

export function resCalPrev() {
  resDate.setMonth(resDate.getMonth() - 1);
  const monthSel = document.getElementById('res-cal-month');
  const yearSel  = document.getElementById('res-cal-year');
  if (monthSel) monthSel.value = resDate.getMonth();
  if (yearSel)  yearSel.value  = resDate.getFullYear();
  drawResCalGrid(resDate.getFullYear(), resDate.getMonth());
}

export function resCalNext() {
  resDate.setMonth(resDate.getMonth() + 1);
  const monthSel = document.getElementById('res-cal-month');
  const yearSel  = document.getElementById('res-cal-year');
  if (monthSel) monthSel.value = resDate.getMonth();
  if (yearSel)  yearSel.value  = resDate.getFullYear();
  drawResCalGrid(resDate.getFullYear(), resDate.getMonth());
}

function drawResCalGrid(year, month) {
  const grid = document.getElementById('res-cal-grid');
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
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelected = selectedDate === dateStr;
    const classes = [
      'cal-day-new',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      'selectable'
    ].filter(Boolean).join(' ');
    
    html += `<div class="${classes}" onclick="window.resSelectDate('${dateStr}')">${d}</div>`;
  }

  grid.innerHTML = html;
}

export function resSelectDate(ds) {
  selectedDate = ds;
  drawResCalGrid(resDate.getFullYear(), resDate.getMonth());
}

export async function confirmReservation() {
  if(!selectedDate) { alert("Por favor selecciona una fecha en el calendario."); return; }
  const hr = document.getElementById('res-hour').value;
  const min = document.getElementById('res-minute').value;
  const name = document.getElementById('res-input-name').value;
  const zone = document.getElementById('res-input-zone').value;
  
  const session = getSession();
  
  const reservation = {
    userId: session.id,
    restaurantId: currentResRestaurant.id,
    restaurantName: currentResRestaurant.name,
    date: selectedDate,
    time: `${hr}:${min}`,
    guests: resQty,
    reservationName: name,
    zone: zone,
    timestamp: new Date().toISOString()
  };
  
  try {
    await fetch(`${API}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservation)
    });
  } catch(e) { console.error("Error confirming reservation:", e); }
  
  alert('¡Reservación Confirmada para ' + name + '!\n\nTe esperamos el ' + selectedDate + ' a las ' + hr + ':' + min + '\\nZona: ' + zone + '\\nPersonas: ' + resQty);
  showScreen('screen-main');
}
