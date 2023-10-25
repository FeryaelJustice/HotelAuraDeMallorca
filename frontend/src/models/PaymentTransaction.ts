export class PaymentTransaction {
  id: number | null = null;
  payment_id: number | null = null;
  transaction_id: string | null = null;

  constructor(paymentTransaction?: PaymentTransaction) {
    if (paymentTransaction) {
      this.id = paymentTransaction.id;
      this.payment_id = paymentTransaction.payment_id;
      this.transaction_id = paymentTransaction.transaction_id;
    }
  }
}
