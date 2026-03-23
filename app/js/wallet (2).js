// js/wallet.js — Phantom Wallet integration
import { shortAddr } from './app.js';

// Phantom puede estar en window.solana (legacy) o window.phantom.solana (nuevo)
function getPhantom() {
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}

export async function connectWallet() {
  try {
    const phantom = getPhantom();
    if (!phantom) { 
      alert('No se detecta Phantom Wallet. Asegúrate de tener la extensión instalada y activa en esta pestaña.'); 
      return null; 
    }
    const resp = await phantom.connect();
    const addr = resp.publicKey.toString();
    const el = document.getElementById('welcome-wallet-status');
    if (el) el.innerHTML = `<div class="wallet-badge">✅ ${shortAddr(addr)}</div>`;
    return addr;
  } catch(e) { 
    alert('Error conectando Phantom: ' + (e.message || e)); 
    return null; 
  }
}

export async function connectWalletForReg(prefix) {
  try {
    const phantom = getPhantom();
    if (!phantom) { 
      alert('No se detecta Phantom Wallet. Asegúrate de tener la extensión instalada y activa en esta pestaña.\n\nSi la tienes instalada, intenta recargar la página.');
      return; 
    }
    const resp = await phantom.connect();
    const addr = resp.publicKey.toString();
    document.getElementById(prefix+'-wallet').value = addr;
    document.getElementById(prefix+'-phantom-btn').innerHTML = '✅ Wallet Conectada';
    document.getElementById(prefix+'-phantom-btn').classList.add('connected');
    document.getElementById(prefix+'-wallet-status').innerHTML = `<div class="wallet-badge">🔑 ${shortAddr(addr)}</div>`;
  } catch(e) { 
    alert('Error conectando Phantom en registro: ' + (e.message || e)); 
    console.error('Phantom error:', e); 
  }
}

export async function showWalletBalance() {
  const container = document.getElementById('wallet-balance-display');
  if (!container) return;
  try {
    const phantom = getPhantom();
    if (!phantom) { container.innerHTML = ''; return; }
    if (!phantom.isConnected) await phantom.connect();
    const conn = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"), "confirmed");
    const balance = await conn.getBalance(phantom.publicKey);
    const sol = (balance / solanaWeb3.LAMPORTS_PER_SOL).toFixed(4);
    container.innerHTML = `
      <div class="wallet-balance">
        <div><div class="bal-label">Tu Wallet Phantom</div><div style="font-size:11px;color:#888;font-family:monospace;">${shortAddr(phantom.publicKey.toString())}</div></div>
        <div style="text-align:right"><div class="bal-label">Saldo Devnet</div><div class="bal-amount">◎ ${sol} SOL</div></div>
      </div>`;
  } catch(e) { 
    container.innerHTML = `<div class="wallet-balance"><span style="color:#aaa;">Conecta Phantom para ver saldo</span></div>`; 
  }
}
