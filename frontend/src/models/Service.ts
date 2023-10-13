export class Service {
  id: number | null = null;
  name: number | null = null;
  description: number | null = null;
  price: number | null = null;
  availabilityStart: Date | null = null;
  availabilityEnd: Date | null = null;

  constructor(service?: Service) {
    if (service) {
      this.id = service.id;
      this.name = service.name;
      this.description = service.description;
      this.price = service.price;
      this.availabilityStart = service.availabilityStart;
      this.availabilityEnd = service.availabilityEnd;
    }
  }
}
