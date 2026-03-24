use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("D6E6bhYFzxJfmpKZAyxHpv9k7faX7ETUQDfYT7wj9KtJ");

#[program]
pub mod deli_club {
    use super::*;

    /// Registra un nuevo usuario (cliente) en la blockchain.
    /// Crea una PDA con seeds ["user", user_wallet] y le asigna 0 delipoints.
    pub fn register_user(ctx: Context<RegisterUser>, name: String) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.authority = ctx.accounts.user.key();
        user_profile.name = name;
        user_profile.delipoints = 0;
        user_profile.total_spent = 0;
        user_profile.bump = ctx.bumps.user_profile;
        Ok(())
    }

    /// Registra un nuevo restaurante en la blockchain.
    /// Crea una PDA con seeds ["restaurant", owner_wallet].
    pub fn register_restaurant(
        ctx: Context<RegisterRestaurant>,
        name: String,
        category: String,
    ) -> Result<()> {
        let restaurant = &mut ctx.accounts.restaurant;
        restaurant.owner = ctx.accounts.owner.key();
        restaurant.name = name;
        restaurant.category = category;
        restaurant.total_sales = 0;
        restaurant.bump = ctx.bumps.restaurant;
        Ok(())
    }

    /// Core del negocio: Paga una orden.
    /// 1. Transfiere SOL del cliente a la wallet del dueño del restaurante (CPI).
    /// 2. Calcula el 5% del monto como delipoints y los suma al perfil del usuario.
    /// 3. Actualiza total_spent del usuario y total_sales del restaurante.
    pub fn pay_order(ctx: Context<PayOrder>, amount: u64) -> Result<()> {
        require!(amount > 0, DeliClubError::InvalidAmount);

        // 1. Transferir SOL del cliente al dueño del restaurante via CPI
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.client.to_account_info(),
                to: ctx.accounts.restaurant_owner.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        // 2. Calcular delipoints (5% del monto en lamports)
        let earned_delipoints = amount / 20; // 5% = amount * 5 / 100 = amount / 20

        // 3. Actualizar perfil del usuario
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.delipoints = user_profile
            .delipoints
            .checked_add(earned_delipoints)
            .unwrap();
        user_profile.total_spent = user_profile
            .total_spent
            .checked_add(amount)
            .unwrap();

        // 4. Actualizar estadísticas del restaurante
        let restaurant = &mut ctx.accounts.restaurant;
        restaurant.total_sales = restaurant
            .total_sales
            .checked_add(amount)
            .unwrap();

        msg!(
            "Orden pagada: {} lamports. Delipoints ganados: {}. Total delipoints: {}",
            amount,
            earned_delipoints,
            user_profile.delipoints
        );

        Ok(())
    }
}

// ==================== CONTEXTOS (Accounts) ====================

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
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
        space = 8 + Restaurant::INIT_SPACE,
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
    /// PDA del perfil del cliente (se actualiza delipoints y total_spent)
    #[account(
        mut,
        seeds = [b"user", client.key().as_ref()],
        bump = user_profile.bump,
        has_one = authority @ DeliClubError::Unauthorized,
    )]
    pub user_profile: Account<'info, UserProfile>,

    /// PDA del restaurante (se actualiza total_sales)
    #[account(
        mut,
        seeds = [b"restaurant", restaurant_owner.key().as_ref()],
        bump = restaurant.bump,
    )]
    pub restaurant: Account<'info, Restaurant>,

    /// Wallet del dueño del restaurante (recibe el SOL)
    /// CHECK: Solo recibe lamports, no necesita deserialización.
    #[account(mut)]
    pub restaurant_owner: AccountInfo<'info>,

    /// Cliente que paga (firma la transacción)
    #[account(mut, constraint = client.key() == user_profile.authority @ DeliClubError::Unauthorized)]
    pub client: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ==================== CUENTAS (Data Structs) ====================

#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    /// Wallet del usuario dueño de este perfil
    pub authority: Pubkey,          // 32 bytes
    /// Nombre del usuario
    #[max_len(50)]
    pub name: String,               // 4 + 50 = 54 bytes
    /// Puntos de recompensa acumulados (5% de cada compra en lamports)
    pub delipoints: u64,            // 8 bytes
    /// Total gastado en lamports
    pub total_spent: u64,           // 8 bytes
    /// Bump de la PDA
    pub bump: u8,                   // 1 byte
}

#[account]
#[derive(InitSpace)]
pub struct Restaurant {
    /// Wallet del dueño del restaurante
    pub owner: Pubkey,              // 32 bytes
    /// Nombre del restaurante
    #[max_len(50)]
    pub name: String,               // 4 + 50 = 54 bytes
    /// Categoría de comida
    #[max_len(30)]
    pub category: String,           // 4 + 30 = 34 bytes
    /// Total de ventas en lamports
    pub total_sales: u64,           // 8 bytes
    /// Bump de la PDA
    pub bump: u8,                   // 1 byte
}

// ==================== ERRORES ====================

#[error_code]
pub enum DeliClubError {
    #[msg("El monto debe ser mayor a 0")]
    InvalidAmount,
    #[msg("No tienes autorización para esta acción")]
    Unauthorized,
}