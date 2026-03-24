import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
// NOTA: Cuando ejecutes `anchor build`, el tipo generado se llamará DeliClub (antes era MicroDonations)
// Si ves error aquí, ¡es normal hasta que hagas el build!
import { DeliClub } from "./target/types/deli_club";

// ──────────────────────────────────────────────────────────
//  DeliClub – Script de Cliente (client.ts)
//
//  Simula:
//  1. Un restaurante que se registra en DeliClub (Blockchain).
//  2. Un cliente que crea su perfil en DeliClub.
//  3. El cliente comprando comida y ganando Delipoints (Cashback).
// ──────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey("D6E6bhYFzxJfmpKZAyxHpv9k7faX7ETUQDfYT7wj9KtJ");

async function main() {
  // ── Configuración inicial ──
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.deliClub as Program<DeliClub>;
  const owner = provider.wallet;

  console.log("=".repeat(60));
  console.log("  🍽️  DeliClub – Demostración Blockchain");
  console.log("=".repeat(60));

  // Para esta demo usaremos la wallet local (`owner`) para ser el restaurante
  // y crearemos una nueva wallet falsa para simular al "Cliente".
  const clientWallet = Keypair.generate();
  
  // Fondeo de SOL falso al cliente para que pueda comprar. 
  // En lugar de usar Airdrop (que está fallando en la red Devnet hoy), 
  // le enviamos una pequeña fraccion (0.01 SOL) desde tu wallet principal (owner).
  console.log("⏳ Fondeando la wallet del cliente con SOL de tu propia wallet...");
  const fundTx = new anchor.web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: owner.publicKey,
      toPubkey: clientWallet.publicKey,
      lamports: 0.01 * anchor.web3.LAMPORTS_PER_SOL,
    })
  );
  const signature = await provider.sendAndConfirm(fundTx);

  // ── PDAs (Cuentas derivadas de las semillas definidas en Rust) ──
  const [restaurantPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("restaurant"), owner.publicKey.toBuffer()],
    program.programId
  );

  const [clientPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), clientWallet.publicKey.toBuffer()],
    program.programId
  );

  // ──────────────────────────────────────
  //  1. REGISTRAR RESTAURANTE
  // ──────────────────────────────────────
  try {
    console.log(`\n🏪 Registrando restaurante: "La Piazza" (Dueño: ${owner.publicKey.toBase58().slice(0,6)}...)`);
    const tx = await program.methods
      .registerRestaurant("La Piazza", "Comida Italiana")
      // Anchor moderno calcula las PDAs automáticamente a partir de los Signers
      .accounts({
        owner: owner.publicKey,
      } as any)
      .rpc();
    console.log(`   ✅ ¡Restaurante registrado en la blockchain! Tx: ${tx}`);
  } catch (err: any) {
    if(err.message.includes("already in use")) console.log("   ℹ️ El restaurante ya estaba registrado.");
    else console.error("Error restaurante:", err);
  }

  // ──────────────────────────────────────
  //  2. REGISTRAR CLIENTE
  // ──────────────────────────────────────
  try {
    console.log(`\n👨‍💼 Registrando cliente: "Leon" (Wallet: ${clientWallet.publicKey.toBase58().slice(0,6)}...)`);
    const tx = await program.methods
      .registerUser("Leon")
      .accounts({
        user: clientWallet.publicKey,
      } as any)
      .signers([clientWallet])  // El cliente firma su registro
      .rpc();
    console.log(`   ✅ ¡Perfil de cliente creado! Tx: ${tx}`);
  } catch (err: any) {
    console.error("Error cliente:", err);
  }

  // ──────────────────────────────────────
  //  3. ORDENAR COMIDA Y RECIBIR DELIPOINTS
  // ──────────────────────────────────────
  try {
    const ordenMXN = 250; 
    const costoSOL = 0.005; // Fracción mínima de SOL para que no falle por saldo
    const lamports = new anchor.BN(costoSOL * anchor.web3.LAMPORTS_PER_SOL); 

    console.log(`\n🍔 Leon ordena en La Piazza... Costo: $${ordenMXN} MXN (◎${costoSOL} SOL)`);
    
    // Llamar al método pay_order
    const tx = await program.methods
      .payOrder(lamports)
      .accounts({
        restaurantOwner: owner.publicKey,           // Wallet que recibe el dinero
        user: clientWallet.publicKey,               // Quien paga
      } as any)
      .signers([clientWallet]) // El cliente firma para enviar su dinero
      .rpc();
      
    console.log(`   ✅ ¡Pago exitoso y transferido directamente al dueño! Tx: ${tx}`);
    console.log(`   🎉 Smart Contract ejecutó lógica de 5% de recompensas...`);

  } catch (err: any) {
    console.error("Error al pagar:", err);
  }

  // ──────────────────────────────────────
  //  4. LEER STATUS FINAL (VALIDACIÓN)
  // ──────────────────────────────────────
  try {
    console.log("\n📊 ── Estado final en la Blockchain ──");
    const clientData = await program.account.userProfile.fetch(clientPDA);
    console.log(`   👨‍💼 Cliente [${clientData.name}] tiene 💎 ${clientData.delipoints.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL en Delipoints ganados (Recompensa)`);

    const restData = await program.account.restaurant.fetch(restaurantPDA);
    console.log(`   🏪 Restaurante [${restData.name}] tiene un total de ventas de ◎ ${restData.totalSales.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL.`);
  } catch(err:any) {
    console.error("Error leyendo data:", err);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
