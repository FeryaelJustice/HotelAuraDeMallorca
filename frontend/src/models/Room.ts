export class Room {
  id: number | null = null;
  name: number | null = null;
  description: number | null = null;
  price: number | null = null;
  availabilityStart: Date | null = null;
  availabilityEnd: Date | null = null;

  constructor(room?: Room) {
    if (room) {
      this.id = room.id;
      this.name = room.name;
      this.description = room.description;
      this.price = room.price;
      this.availabilityStart = room.availabilityStart;
      this.availabilityEnd = room.availabilityEnd;
    }
  }
}
