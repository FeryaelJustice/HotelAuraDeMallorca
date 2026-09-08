export class Promotion {
  id: number | null = null;
  code: string | null = null;
  discount_price: number | null = null;
  name: string | null = null;
  description: string | null = null;
  start_date: Date | null = null;
  end_date: Date | null = null;
  is_active?: boolean = true;
  is_visible?: boolean = true;
  is_user_exclusive?: boolean = false;

  constructor(promo?: Partial<Promotion>) {
    if (promo) {
      this.id = promo.id ?? null;
      this.code = promo.code ?? null;
      this.discount_price = promo.discount_price ?? null;
      this.name = promo.name ? String(promo.name) : null;
      this.description = promo.description ?? null;
      this.start_date = promo.start_date ? new Date(promo.start_date) : null;
      this.end_date = promo.end_date ? new Date(promo.end_date) : null;
      this.is_active = promo.is_active !== undefined ? Boolean(promo.is_active) : true;
      this.is_visible = promo.is_visible !== undefined ? Boolean(promo.is_visible) : true;
      this.is_user_exclusive = Boolean(promo.is_user_exclusive);
    }
  }
}
