import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MicroDonations } from "../target/types/micro_donations";

describe("micro-donations-link", () => {

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.microDonations as Program<MicroDonations>;

  it("Create Campaign", async () => {

    const user = provider.wallet;

    const tx = await program.methods
      .createCampaign(
        "Test Campaign",
        "Test description",
        new anchor.BN(1000000000)
      )
      .accounts({
        user: user.publicKey,
      })
      .rpc();

    console.log("Transaction signature:", tx);

  });

});