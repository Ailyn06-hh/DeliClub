use anchor_lang::prelude::*;

declare_id!("D6E6bhYFzxJfmpKZAyxHpv9k7faX7ETUQDfYT7wj9KtJ");

#[program]
pub mod micro_donations {
    use super::*;

    // CREATE
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        name: String,
        description: String,
        goal: u64,
    ) -> Result<()> {

        let campaign = &mut ctx.accounts.campaign;

        campaign.owner = *ctx.accounts.user.key;
        campaign.name = name;
        campaign.description = description;
        campaign.goal = goal;
        campaign.amount_donated = 0;

        Ok(())
    }

    // DONATE (UPDATE)
pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {

    let campaign = &mut ctx.accounts.campaign;

    let campaign_account = campaign.to_account_info();
    let user_account = ctx.accounts.user.to_account_info();

    **campaign_account.try_borrow_mut_lamports()? += amount;
    **user_account.try_borrow_mut_lamports()? -= amount;

    campaign.amount_donated += amount;

    Ok(())
}

    // UPDATE CAMPAIGN
    pub fn update_campaign(
        ctx: Context<UpdateCampaign>,
        description: String,
    ) -> Result<()> {

        let campaign = &mut ctx.accounts.campaign;

        campaign.description = description;

        Ok(())
    }

    // DELETE CAMPAIGN
    pub fn delete_campaign(ctx: Context<DeleteCampaign>) -> Result<()> {

        let campaign = &mut ctx.accounts.campaign;

        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? +=
            ctx.accounts.campaign.to_account_info().lamports();

        **ctx.accounts.campaign.to_account_info().try_borrow_mut_lamports()? = 0;

        Ok(())
    }
}
#[derive(Accounts)]
pub struct CreateCampaign<'info> {

    #[account(
        init,
        payer = user,
        space = 900,
        seeds = [b"campaign", user.key().as_ref()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct Donate<'info> {

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub user: Signer<'info>,

}
#[derive(Accounts)]
pub struct UpdateCampaign<'info> {

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    pub owner: Signer<'info>,
}
#[derive(Accounts)]
pub struct DeleteCampaign<'info> {

    #[account(mut)]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub owner: Signer<'info>,
}
#[account]
pub struct Campaign {

    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub goal: u64,
    pub amount_donated: u64,
}