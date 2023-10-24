export class Payment {
  id: number | null = null;
  userID: number | null = null;
  bookingID: number | null = null;
  amount: number | null = null;
  date: Date | null = null;
  paymentMethodID: number | null = null;
  stripeTransactionID: number | null = null;

  constructor(payment?: Payment) {
    if (payment) {
      this.id = payment.id;
      this.userID = payment.userID;
      this.bookingID = payment.bookingID;
      this.amount = payment.amount;
      this.date = payment.date;
      this.paymentMethodID = payment.paymentMethodID;
      this.stripeTransactionID = payment.stripeTransactionID;
    }
  }
}
