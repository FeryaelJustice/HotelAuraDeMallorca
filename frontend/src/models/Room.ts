export class Room {
  id: number | null = null;
  name: string | null = null;
  description: string | null = null;
  price: number | null = null;
  availabilityStart: Date | null = null;
  availabilityEnd: Date | null = null;
  imageURL: string | null = null; // not in DB

  constructor(room?: Room) {
    if (room) {
      this.id = room.id;
      this.name = room.name;
      this.description = room.description;
      this.price = room.price;
      this.availabilityStart = room.availabilityStart;
      this.availabilityEnd = room.availabilityEnd;
      this.imageURL = room.imageURL;
    }
  }
}
