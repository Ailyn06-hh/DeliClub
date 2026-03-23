// js/solana.js — Solana blockchain integration (campaigns, donations)
import { programIdStr } from './app.js';

export async function getProgram() {
  if(typeof anchor==='undefined'||!window.solana) throw new Error("No Solana");
  const conn=new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"),"confirmed");
  const pid=new anchor.web3.PublicKey(programIdStr);
  const prov=new anchor.AnchorProvider(conn,window.solana,{preflightCommitment:"processed"});
  return new anchor.Program(await anchor.Program.fetchIdl(pid,prov),pid,prov);
}

export async function createCampaign() {
  try {
    const p=await getProgram();
    const k=anchor.web3.Keypair.generate();
    await p.methods.create(
      document.getElementById("camp-name").value,
      document.getElementById("camp-desc").value
    ).accounts({
      campaign:k.publicKey,
      user:window.solana.publicKey,
      systemProgram:anchor.web3.SystemProgram.programId
    }).signers([k]).rpc();
    alert("Campaña creada!");
    fetchCampaigns();
  } catch(e) { alert("Error: "+e.message); }
}

export async function fetchCampaigns() {
  try {
    const p=await getProgram();
    const cs=await p.account.campaign.all();
    const l=document.getElementById("campaigns-list");
    if(l) l.innerHTML=cs.map(c=>`
      <div class="campaign-card">
        <b>${c.account.name}</b><br>
        <small>${c.account.description}</small><br>
        Donado: ${(c.account.amountDonated/anchor.web3.LAMPORTS_PER_SOL).toFixed(4)} SOL 
        <button onclick="donate('${c.publicKey}')" style="padding:5px 15px;background:var(--secondary-color);color:white;border:none;border-radius:10px;cursor:pointer;">Donar 0.1 SOL</button>
      </div>
    `).join('')||"No hay campañas.";
  } catch(e) {
    const l=document.getElementById("campaigns-list");
    if(l) l.innerHTML="<p>Error blockchain.</p>";
  }
}

export async function donate(pk) {
  try {
    const p=await getProgram();
    await p.methods.donate(new anchor.BN(0.1*anchor.web3.LAMPORTS_PER_SOL)).accounts({
      campaign:new anchor.web3.PublicKey(pk),
      user:window.solana.publicKey,
      systemProgram:anchor.web3.SystemProgram.programId
    }).rpc();
    alert("Donado!");
    fetchCampaigns();
  } catch(e) {}
}
