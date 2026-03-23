// js/crear-sucursal.js — Logic for creating a new restaurant branch
import { API, getSession, showScreen } from './app.js';
import { openSucursales } from './sucursales.js';

export function openCrearSucursal() {
  // Clear the form fields first
  document.getElementById('cs-nombre').value = '';
  document.getElementById('cs-rfc').value = '';
  document.getElementById('cs-direccion1').value = '';
  document.getElementById('cs-categoria').value = '';
  document.getElementById('cs-direccion2').value = '';

  // Show this screen
  showScreen('screen-crear-sucursal');
}

export async function submitNuevaSucursal() {
  const session = getSession();
  if (!session) return;

  const name = document.getElementById('cs-nombre').value.trim();
  const rfc = document.getElementById('cs-rfc').value.trim();
  const address1 = document.getElementById('cs-direccion1').value.trim();
  const category = document.getElementById('cs-categoria').value.trim();
  const address2 = document.getElementById('cs-direccion2').value.trim();

  if (!name || !rfc || !address1 || !category) {
    alert("Por favor completa los campos principales (Nombre, RFC, Dirección, Categoría).");
    return;
  }

  const payload = {
    userId: session.id,
    name: name,
    rfc: rfc,
    address: address1,
    address2: address2,
    foodCategory: category
  };

  try {
    const res = await fetch(API + '/api/restaurants/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error al crear la sucursal');
      return;
    }

    alert("¡Sucursal creada con éxito!");
    // Go back to the sucursales list, it will re-fetch and show the new one
    openSucursales();
  } catch (e) {
    console.error("Error creating sucursal:", e);
    alert("Hubo un error al crear la sucursal.");
  }
}
