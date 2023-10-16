export class Guest {
  id: number | null = null;
  name: string | null = null;
  surnames: string | null = null;
  email: string | null = null;
  isAdult: boolean | null = null;

  constructor(guest?: Guest) {
    if (guest) {
      this.id = guest.id;
      this.name = guest.name;
      this.surnames = guest.surnames;
      this.email = guest.email;
      this.isAdult = guest.isAdult;
    }
  }
}
