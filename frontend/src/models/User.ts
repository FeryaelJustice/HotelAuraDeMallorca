export class User {
  id: number | null = null;
  name: string | null = null;
  surnames: string | null = null;
  email: string | null = null;
  password: string | null = null;
  verified: boolean | null = null;

  constructor(user?: User) {
    if (user) {
      this.id = user.id;
      this.name = user.name;
      this.surnames = user.surnames;
      this.email = user.email;
      this.password = user.password;
      this.verified = user.verified;
    }
  }
}
