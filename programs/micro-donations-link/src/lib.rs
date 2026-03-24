use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("4jHTMw2BBbCUVhJn1qf7yLGu2w1yn3eALY4nRqN9UiE5");

#[program]
pub mod deli_club {
    use super::*;

    // 1. REGISTRAR CLIENTE EN BLOCKCHAIN
    // Crea una cuenta (PDA) para rastrear las recompensas (Delipoints) del usuario
    pub fn register_user(ctx: Context<RegisterUser>, name: String) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        profile.owner = *ctx.accounts.user.key;
        profile.name = name;
        profile.delipoints = 0; // Inicia con 0 recompensas
        Ok(())
    }

    // 2. REGISTRAR RESTAURANTE EN BLOCKCHAIN
    // Crea una cuenta (PDA) para el restaurante
    pub fn register_restaurant(
        ctx: Context<RegisterRestaurant>, 
        name: String, 
        category: String
    ) -> Result<()> {
        let restaurant = &mut ctx.accounts.restaurant;
        restaurant.owner = *ctx.accounts.owner.key;
        restaurant.name = name;
        restaurant.category = category;
        restaurant.total_sales = 0;
        Ok(())
    }

    // 3. PAGAR ORDEN Y RECIBIR RECOMPENSAS
    // Transfiere SOL de la wallet del Cliente a la del Restaurante y le suma 5% de cashback (Delipoints)
    pub fn pay_order(ctx: Context<PayOrder>, amount: u64) -> Result<()> {
        
        // A) Transferencia directa de SOL (del cliente al restaurante)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.restaurant_owner.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        // B) Sistema de lealtad (5% de cashback en compras)
        let reward = amount / 20; // 5% de la orden

        // Sumar recompensas al cliente
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.delipoints += reward;

        // Sumar ventas al restaurante local
        let restaurant = &mut ctx.accounts.restaurant;
        restaurant.total_sales += amount;

        Ok(())
    }
}

// ────────────────────────────────────────────────────────
// ESTRUCTURAS DE CONTEXTO (Accounts)
// ────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 50 + 8, // Discriminator + Pubkey + String(name) + u64(delipoints)
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterRestaurant<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 50 + 50 + 8, // String(name), String(category)
        seeds = [b"restaurant", owner.key().as_ref()],
        bump
    )]
    pub restaurant: Account<'info, Restaurant>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PayOrder<'info> {
    // Perfil del cliente para actualizar sus recompensas
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    // Perfil del restaurante para registrar la venta
    #[account(
        mut,
        seeds = [b"restaurant", restaurant_owner.key().as_ref()],
        bump
    )]
    pub restaurant: Account<'info, Restaurant>,
    
    /// CHECK: Validamos la recepción de fondos, solo es un pubkey al que le enviamos SOL
    #[account(mut)]
    pub restaurant_owner: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// ────────────────────────────────────────────────────────
// ACCOUNTS (La base de datos en la Blockchain)
// ────────────────────────────────────────────────────────

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub name: String,
    pub delipoints: u64, // Puntos acumulados por compras
}

#[account]
pub struct Restaurant {
    pub owner: Pubkey,
    pub name: String,
    pub category: String,
    pub total_sales: u64, // Volumen transaccionado en SOL
}