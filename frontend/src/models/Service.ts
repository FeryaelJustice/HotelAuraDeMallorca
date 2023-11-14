export class Service {
  id: number | null = null;
  name: string | null = null;
  description: string | null = null;
  price: number | null = null;
  availabilityStart: Date | null = null;
  availabilityEnd: Date | null = null;
  imageURL: string | null = null; // not in DB

  constructor(service?: Service) {
    if (service) {
      this.id = service.id;
      this.name = service.name;
      this.description = service.description;
      this.price = service.price;
      this.availabilityStart = service.availabilityStart;
      this.availabilityEnd = service.availabilityEnd;
      this.imageURL = service.imageURL;
    }
  }
}
