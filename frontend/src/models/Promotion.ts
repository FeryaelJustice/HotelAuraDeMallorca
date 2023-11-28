export class Promotion {
  id: number | null = null;
  code: string | null = null;
  discount_price: number | null = null;
  name: number | null = null;
  description: string | null = null;
  start_date: Date | null = null;
  end_date: Date | null = null;

  constructor(promo?: Promotion) {
    if (promo) {
      this.id = promo.id;
      this.code = promo.code;
      this.discount_price = promo.discount_price;
      this.name = promo.name;
      this.description = promo.description;
      this.start_date = promo.start_date;
      this.end_date = promo.end_date;
    }
  }
}
