/**
 * Modelo de datos: Reserva (Booking)
 * Que hace: Representa una reserva de estancia en el hotel para el cliente frontend.
 * Por que: Tipa los campos requeridos en el wizard de reserva y en el panel de reservas del usuario.
 */
export class Booking {
  id: number | null = null;
  userID: number | null = null;
  planID: number | null = null;
  roomID: number | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  isCancelled: boolean | null = null;
  cancelledAt?: Date | null = null;
  paymentStatus?: string | null = null;
  paymentMethodID?: number | null = null;
  paymentAmount?: number | null = null;
  refundAmount?: number | null = null;
  refundDate?: Date | null = null;

  constructor(booking?: any) {
    if (booking) {
      this.id = booking.id;
      this.userID = booking.userID || booking.user_id;
      this.planID = booking.planID || booking.plan_id;
      this.roomID = booking.roomID || booking.room_id;
      this.startDate = booking.startDate ? new Date(booking.startDate) : (booking.booking_start_date ? new Date(booking.booking_start_date) : null);
      this.endDate = booking.endDate ? new Date(booking.endDate) : (booking.booking_end_date ? new Date(booking.booking_end_date) : null);
      this.isCancelled = booking.isCancelled !== undefined ? booking.isCancelled : (booking.is_cancelled === 1 || booking.is_cancelled === true);
      this.cancelledAt = booking.cancelledAt ? new Date(booking.cancelledAt) : (booking.cancelled_at ? new Date(booking.cancelled_at) : null);
      this.paymentStatus = booking.paymentStatus || booking.payment_status || null;
      this.paymentMethodID = booking.paymentMethodID || booking.payment_method_id || null;
      this.paymentAmount = booking.paymentAmount !== undefined ? booking.paymentAmount : booking.payment_amount;
      this.refundAmount = booking.refundAmount !== undefined ? booking.refundAmount : booking.refund_amount;
      this.refundDate = booking.refundDate ? new Date(booking.refundDate) : (booking.refund_date ? new Date(booking.refund_date) : null);
    }
  }
}
