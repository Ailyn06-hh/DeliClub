// js/reservaciones-clicli.js
import { API, getSession, showScreen } from './app.js';

export async function openReservacionesClicli() {
  showScreen('screen-reservaciones-clicli');
  await renderReservacionesClicli();
}

async function renderReservacionesClicli() {
  const container = document.getElementById('reservaciones-clicli-list');
  const session = getSession();
  if (!session || !container) return;

  container.innerHTML = '<p style="text-align:center; color:#999;">Cargando reservaciones...</p>';

  try {
    // 1. Fetch all restaurants to determine which ones belong to this partner
    const restRes = await fetch(`${API}/api/restaurants`);
    const allRestaurants = await restRes.json();
    const myBranchIds = allRestaurants.filter(r => r.ownerId === session.id).map(r => r.id);

    // 2. Fetch all reservations and filter
    const resvRes = await fetch(`${API}/api/reservations`);
    const allReservations = await resvRes.json();
    
    const myReservations = allReservations.filter(r => myBranchIds.includes(r.restaurantId));
    myReservations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

    if (myReservations.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#999; font-weight: bold; margin-top: 40px;">No hay reservaciones recientes.</p>';
      return;
    }

    // Identify what consists a "Nueva reservacion". 
    // For simplicity, let's mark it 'Nueva reservacion' if it was created in the last 24 hours.
    const now = new Date();
    
    container.innerHTML = myReservations.map(r => {
      const createdDate = new Date(r.timestamp);
      const isNew = (now - createdDate) < (24 * 60 * 60 * 1000); // within last 24h
      
      const newLabelHtml = isNew ? `<div class="res-clicli-new">Nueva reservacion</div>` : '';

      return `
        <div class="res-clicli-card">
          <div class="res-clicli-header">Reservacion</div>
          <div class="res-clicli-field">Restaurante: ${r.restaurantName || 'Sucursal'}</div>
          <div class="res-clicli-field">Cantidad: ${r.guests || 2}</div>
          <br>
          <div class="res-clicli-field">Hora: ${r.time}</div>
          <div class="res-clicli-field">Fecha: ${formatDate(r.date)}</div>
          <br>
          <div class="res-clicli-field">Nombre: ${r.reservationName || 'Cliente'}</div>
          <div class="res-clicli-field">Zona de restaurante: ${r.zone || 'General'}</div>
          <br>
          <!-- Contacto (Placeholder since reservations in api don't always store phone/email explicitly unless fetched from user, we'll mock them or show default if unavailable) -->
          <div class="res-clicli-field">Telefono: 444444444</div>
          <div class="res-clicli-field">Correo: cliente@gmail.com</div>
          ${newLabelHtml}
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error('Error fetching reservations:', e);
    container.innerHTML = '<p style="text-align:center; color:#e07070;">Error al cargar reservaciones.</p>';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return dateStr;
}
