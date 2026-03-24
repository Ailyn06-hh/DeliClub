import { SOL_RATE, API, getSession } from './app.js';

export function openConsultasMenu() {
  window.showScreen('screen-consultas-menu');
  renderConsultasMenu();
}

export async function renderConsultasMenu() {
  const container = document.getElementById('consultas-menu-container');
  if (!container) return;
  
  container.innerHTML = '<p style="text-align:center;">Cargando catálogo...</p>';
  
  try {
    const session = getSession();
    if (!session) return;
    
    // We start with mockup data that exactly matches the design in the user's prompt.
    // If we have an active menu API, we fetch its data and override this if it returns items.
    let items = [
      { id: 1, name: "Pizza peperoni mediana", desc: "Clasica pizza de peperoni<br>con queso fundido", priceMXN: 110.00, priceSOL: 0.045, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=80" },
      { id: 2, name: "Pizza peperoni mediana", desc: "Clasica pizza de peperoni<br>con queso fundido", priceMXN: 110.00, priceSOL: 0.045, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=80" },
      { id: 3, name: "Pizza peperoni mediana", desc: "Clasica pizza de peperoni<br>con queso fundido", priceMXN: 110.00, priceSOL: 0.045, image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=80" }
    ];
    
    try {
      const res = await fetch(`${API}/api/menu?restaurantId=${session.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) items = data;
      }
    } catch (e) { console.log('Using mock layout items for Consultas Menú'); }

    container.innerHTML = '';
    
    items.forEach(item => {
      const priceSOL = item.priceSOL !== undefined ? item.priceSOL : (item.price / SOL_RATE).toFixed(3);
      const priceMXN = item.priceMXN !== undefined ? item.priceMXN : item.price;
      const img = item.image || "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&q=80";
      
      const card = `
        <div class="cm-card">
          <div class="cm-content-row">
            <div class="cm-image-container">
              <img src="${img}" class="cm-image" alt="Product">
            </div>
            <div class="cm-details">
              <h4 class="cm-title">${item.name}</h4>
              <p class="cm-desc">${item.desc}</p>
              <div class="cm-price">Sol ${priceSOL}/ ${priceMXN.toFixed(2)} MXN</div>
            </div>
          </div>
          <div class="cm-divider"></div>
        </div>
      `;
      container.innerHTML += card;
    });

  } catch(e) {
    container.innerHTML = '<p style="text-align:center;">Error al cargar.</p>';
  }
}
