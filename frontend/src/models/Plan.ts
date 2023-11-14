export class Plan {
  id: number | null = null;
  name: string | null = null;
  description: string | null = null;
  price: number | null = null;
  imageURL: string | null = null; // not in DB

  constructor(plan?: Plan) {
    if (plan) {
      this.id = plan.id;
      this.name = plan.name;
      this.description = plan.description;
      this.price = plan.price;
      this.imageURL = plan.imageURL;
    }
  }
}
