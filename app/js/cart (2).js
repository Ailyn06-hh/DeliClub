// js/cart.js — Shopping cart and SOL payment
import { API, SOL_RATE, getSession } from './app.js';
import { showWalletBalance } from './wallet.js';

export let cart = [];
export let currentRestaurant = null;
export let useDelipoints = false;

window.toggleDelipoints = function() {
  useDelipoints = !useDelipoints;
  document.querySelector('.cart-modal')?.remove();
  showCart();
};

export function addToCart(item, restaurantId, restaurantName, restaurantWallet) {
  currentRestaurant = { id: restaurantId, name: restaurantName, wallet: restaurantWallet };
  const existing = cart.find(c => c.name === item.name);
  if (existing) { existing.qty++; } else { cart.push({ ...item, qty: 1 }); }
  updateCartUI();
}

export function removeFromCart(index) {
  cart.splice(index, 1);
  if (cart.length === 0) currentRestaurant = null;
  updateCartUI();
}

export function updateCartUI() {
  const el = document.getElementById('cart-floating');
  const countEl = document.getElementById('cart-count');
  const total = cart.reduce((s, c) => s + c.qty, 0);
  countEl.textContent = total;
  el.style.display = total > 0 ? 'block' : 'none';
}

export function clearCart() {
  cart.length = 0;
  currentRestaurant = null;
  useDelipoints = false;
  updateCartUI();
}

export function showCart() {
  if (cart.length === 0) return;
  const partialMXN = cart.reduce((s, c) => s + (parseFloat(c.price) || 0) * c.qty, 0);
  
  const session = getSession();
  const availablePoints = session.delipoints || 0;
  let discount = 0;
  if (useDelipoints && availablePoints > 0) {
    discount = Math.min(availablePoints, partialMXN);
  }
  
  const totalMXN = partialMXN - discount;
  const totalSOL = totalMXN / SOL_RATE;
  const modal = document.createElement('div');
  modal.className = 'cart-modal';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="cart-content">
      <h3 style="margin:0 0 5px;">🛒 Tu Pedido</h3>
      <p style="font-size:13px;color:#888;margin:0 0 15px;">${currentRestaurant?.name || ''}</p>
      ${cart.map((c, i) => `
        <div class="cart-line">
          <div><strong>${c.name}</strong> x${c.qty}<br><span class="sol-price">≈ ◎${((parseFloat(c.price)||0)*c.qty/SOL_RATE).toFixed(6)} SOL</span></div>
          <div>$${((parseFloat(c.price)||0)*c.qty).toFixed(0)} MXN <button onclick="removeFromCart(${i});this.closest('.cart-modal').remove();showCart();" style="background:#e74c3c;color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;margin-left:8px;">✕</button></div>
        </div>
      `).join('')}
      <div style="margin-top:15px;padding-top:15px;border-top:2px solid #eee;">
        ${availablePoints > 0 ? `
        <div style="margin-bottom:12px; font-size:14px; background: #fff8f3; padding: 10px; border-radius: 8px; border: 1px solid #f0e6d2;">
          <label style="cursor:pointer; display:flex; align-items:center; gap:8px; font-weight: 600; color: #8b5b3f;">
            <input type="checkbox" ${useDelipoints ? 'checked' : ''} onchange="window.toggleDelipoints()" style="accent-color: var(--primary-color); width: 16px; height: 16px;">
            Usar ${availablePoints.toFixed(2)} Delipoints ${useDelipoints ? `(-$${discount.toFixed(2)})` : ''}
          </label>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:800;">
          <span>Total</span><span>$${totalMXN.toFixed(2)} MXN</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--sol-color);font-weight:700;margin-top:5px;">
          <span>En Solana</span><span>◎ ${totalSOL.toFixed(6)} SOL</span>
        </div>
      </div>
      <button class="btn-pay-sol" onclick="payWithSOL()" id="btn-pay">🟣 Pagar con Phantom Wallet</button>
      <p style="text-align:center;font-size:11px;color:#aaa;margin-top:8px;">Tipo de cambio: 1 SOL ≈ $${SOL_RATE} MXN (Devnet)<br><span style="color:var(--primary-color); font-weight:bold;">Ganas $${Math.round(totalMXN * 0.05)} Delipoints con esta compra</span></p>
    </div>
  `;
  document.body.appendChild(modal);
}

export async function payWithSOL() {
  const btn = document.getElementById('btn-pay');
  if (!currentRestaurant || !currentRestaurant.wallet) { alert('El restaurante no tiene wallet configurada.'); return; }
  
  const partialMXN = cart.reduce((s, c) => s + (parseFloat(c.price)||0)*c.qty, 0);
  const session = getSession();
  const availablePoints = session.delipoints || 0;
  let discount = 0;
  if (useDelipoints && availablePoints > 0) { discount = Math.min(availablePoints, partialMXN); }
  const totalMXN = partialMXN - discount;
  const totalSOL = totalMXN / SOL_RATE;
  const lamports = Math.round(totalSOL * solanaWeb3.LAMPORTS_PER_SOL);
  
  const earnedDelipoints = Math.round(totalMXN * 0.05);
  const usedDelipoints = discount;

  if (lamports > 0 && (!window.solana || !window.solana.isPhantom)) { alert('Instala Phantom Wallet.'); return; }
  
  try {
    btn.disabled = true; btn.textContent = '⏳ Procesando...';
    
    let signature = 'tx_puntos_' + Date.now();
    if (lamports > 0) {
      if (!window.solana.isConnected) await window.solana.connect();
      const conn = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
      const tx = new solanaWeb3.Transaction().add(
        solanaWeb3.SystemProgram.transfer({
          fromPubkey: window.solana.publicKey,
          toPubkey: new solanaWeb3.PublicKey(currentRestaurant.wallet),
          lamports: lamports
        })
      );
      tx.feePayer = window.solana.publicKey;
      tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
      
      const signed = await window.solana.signTransaction(tx);
      signature = await conn.sendRawTransaction(signed.serialize());
      await conn.confirmTransaction(signature, 'confirmed');
    }
    
    // Save order to backend
    const res = await fetch(API+'/api/orders', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        clientId: session.id, clientName: session.name,
        restaurantId: currentRestaurant.id, restaurantName: currentRestaurant.name,
        items: cart.map(c => ({ name: c.name, price: c.price, qty: c.qty })),
        totalMXN, totalSOL, txSignature: signature, earnedDelipoints, usedDelipoints
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      session.delipoints = data.newBalance;
      localStorage.setItem('solana_session', JSON.stringify(session));
    }
    
    // Clear cart and show success
    document.querySelector('.cart-modal')?.remove();
    clearCart();
    
    alert(`✅ ¡Pago exitoso!\n\nGanaste $${earnedDelipoints} Delipoints!\nTotal Pagado: ◎${totalSOL.toFixed(6)} SOL\nTx: ${signature.slice(0,20)}...\n\nVer en Solana Explorer (Devnet)`);
    showWalletBalance();
  } catch(e) {
    alert('Error en el pago: ' + e.message);
    btn.disabled = false; btn.textContent = '🟣 Pagar con Phantom Wallet';
  }
}
