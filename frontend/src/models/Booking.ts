export class Booking {
  id: number | null = null;
  userID: number | null = null;
  planID: number | null = null;
  roomID: number | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;
  isCancelled: boolean | null = null;

  constructor(booking?: Booking) {
    if (booking) {
      this.id = booking.id;
      this.userID = booking.userID;
      this.planID = booking.planID;
      this.roomID = booking.roomID;
      this.startDate = booking.startDate;
      this.endDate = booking.endDate;
      this.isCancelled = booking.isCancelled;
    }
  }
}
