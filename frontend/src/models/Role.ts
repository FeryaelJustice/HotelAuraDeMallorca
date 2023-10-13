export class Role {
  id: number | null = null;
  name: string | null = null;

  constructor(role?: Role) {
    if (role) {
      this.id = role.id;
      this.name = role.name;
    }
  }
}
