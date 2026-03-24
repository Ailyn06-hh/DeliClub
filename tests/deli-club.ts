import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
// Después de `anchor build`, este tipo se generará automáticamente:
// import { DeliClub } from "../target/types/deli_club";

describe("DeliClub - Flujo Completo", () => {
  // ==================== CONFIGURACIÓN INICIAL ====================

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Cargar el programa (después de anchor build, usar el tipo generado)
  const program = anchor.workspace.deliClub as Program<any>;

  // El dueño del restaurante = wallet nativa del provider
  const restaurantOwner = provider.wallet;

  // Generar un "cliente" temporal con su propia wallet
  const clientKeypair = Keypair.generate();

  // ==================== DERIVAR PDAs ====================

  // PDA del restaurante: seeds = ["restaurant", owner_pubkey]
  const [restaurantPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("restaurant"), restaurantOwner.publicKey.toBuffer()],
    program.programId
  );

  // PDA del usuario/cliente: seeds = ["user", client_pubkey]
  const [userProfilePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), clientKeypair.publicKey.toBuffer()],
    program.programId
  );

  // ==================== PASO 0: Airdrop SOL al cliente ====================

  it("Airdrop SOL al cliente temporal", async () => {
    console.log("🔑 Wallet del dueño del restaurante:", restaurantOwner.publicKey.toBase58());
    console.log("🔑 Wallet del cliente:", clientKeypair.publicKey.toBase58());
    console.log("📍 PDA del restaurante:", restaurantPDA.toBase58());
    console.log("📍 PDA del usuario:", userProfilePDA.toBase58());

    // Pedir SOL gratis a la red devnet para el cliente
    const airdropSig = await provider.connection.requestAirdrop(
      clientKeypair.publicKey,
      2 * LAMPORTS_PER_SOL // 2 SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const balance = await provider.connection.getBalance(clientKeypair.publicKey);
    console.log(`💰 Balance del cliente: ${balance / LAMPORTS_PER_SOL} SOL`);
  });

  // ==================== PASO 1: Registrar Restaurante ====================

  it("Registrar restaurante: La Piazza", async () => {
    const tx = await program.methods
      .registerRestaurant("La Piazza", "Italiana")
      .accounts({
        restaurant: restaurantPDA,
        owner: restaurantOwner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Restaurante registrado. TX:", tx);

    // Verificar datos on-chain
    const restaurantData = await program.account.restaurant.fetch(restaurantPDA);
    console.log("🏪 Restaurante:", {
      nombre: restaurantData.name,
      categoría: restaurantData.category,
      dueño: restaurantData.owner.toBase58(),
      ventasTotales: restaurantData.totalSales.toNumber(),
    });
  });

  // ==================== PASO 2: Registrar Usuario ====================

  it("Registrar usuario: Leon", async () => {
    const tx = await program.methods
      .registerUser("Leon")
      .accounts({
        userProfile: userProfilePDA,
        user: clientKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([clientKeypair])
      .rpc();

    console.log("✅ Usuario registrado. TX:", tx);

    // Verificar datos on-chain
    const userData = await program.account.userProfile.fetch(userProfilePDA);
    console.log("👤 Usuario:", {
      nombre: userData.name,
      delipoints: userData.delipoints.toNumber(),
      totalGastado: userData.totalSpent.toNumber(),
      autoridad: userData.authority.toBase58(),
    });
  });

  // ==================== PASO 3: Pagar Orden (0.1 SOL) ====================

  it("Pagar orden: 0.1 SOL → La Piazza", async () => {
    const orderAmount = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL = 100,000,000 lamports

    // Balance antes
    const ownerBalanceBefore = await provider.connection.getBalance(
      restaurantOwner.publicKey
    );
    const clientBalanceBefore = await provider.connection.getBalance(
      clientKeypair.publicKey
    );
    console.log(`\n📊 ANTES de la orden:`);
    console.log(`   Dueño: ${ownerBalanceBefore / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Cliente: ${clientBalanceBefore / LAMPORTS_PER_SOL} SOL`);

    const tx = await program.methods
      .payOrder(new anchor.BN(orderAmount))
      .accounts({
        userProfile: userProfilePDA,
        restaurant: restaurantPDA,
        restaurantOwner: restaurantOwner.publicKey,
        client: clientKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([clientKeypair])
      .rpc();

    console.log("\n✅ Orden pagada. TX:", tx);

    // Balance después
    const ownerBalanceAfter = await provider.connection.getBalance(
      restaurantOwner.publicKey
    );
    const clientBalanceAfter = await provider.connection.getBalance(
      clientKeypair.publicKey
    );
    console.log(`\n📊 DESPUÉS de la orden:`);
    console.log(`   Dueño: ${ownerBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Cliente: ${clientBalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(
      `   Diferencia dueño: +${(ownerBalanceAfter - ownerBalanceBefore) / LAMPORTS_PER_SOL} SOL`
    );
  });

  // ==================== PASO 4: Validar Datos On-Chain ====================

  it("Validar delipoints y estadísticas del restaurante", async () => {
    // Consultar perfil del usuario
    const userData = await program.account.userProfile.fetch(userProfilePDA);
    const expectedDelipoints = Math.floor((0.1 * LAMPORTS_PER_SOL) / 20);

    console.log("\n🏆 === VALIDACIÓN FINAL ===");
    console.log("👤 Perfil del Usuario:");
    console.log(`   Nombre: ${userData.name}`);
    console.log(`   Delipoints: ${userData.delipoints.toNumber()}`);
    console.log(`   Delipoints esperados (5%): ${expectedDelipoints}`);
    console.log(`   Total gastado: ${userData.totalSpent.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(
      `   ✅ Delipoints correctos: ${userData.delipoints.toNumber() === expectedDelipoints}`
    );

    // Consultar restaurante
    const restaurantData = await program.account.restaurant.fetch(restaurantPDA);
    console.log("\n🏪 Restaurante:");
    console.log(`   Nombre: ${restaurantData.name}`);
    console.log(`   Categoría: ${restaurantData.category}`);
    console.log(
      `   Ventas totales: ${restaurantData.totalSales.toNumber() / LAMPORTS_PER_SOL} SOL`
    );
    console.log(
      `   ✅ Ventas correctas: ${restaurantData.totalSales.toNumber() === 0.1 * LAMPORTS_PER_SOL}`
    );

    console.log("\n🎉 ¡Smart Contract de DeliClub funcionando correctamente!");
  });
});
