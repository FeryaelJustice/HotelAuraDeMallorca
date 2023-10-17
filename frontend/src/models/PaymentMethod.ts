export class PaymentMethod {
  id: number | null = null;
  name: string | null = null;

  constructor(paymentMethod?: PaymentMethod) {
    if (paymentMethod) {
      this.id = paymentMethod.id;
      this.name = paymentMethod.name;
    }
  }
}
