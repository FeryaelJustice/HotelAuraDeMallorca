/**
 * Modelo de datos: Usuario (User)
 * Que hace: Representa una entidad de cuenta de usuario autenticado o registrado.
 * Por que: Tipa el estado del perfil, permisos y estado de verificacion en la aplicacion.
 */
export class User {
  id: number | null = null;
  name: string | null = null;
  surnames: string | null = null;
  email: string | null = null;
  dni: string | null = null;
  password: string | null = null;
  verified: boolean | null = null;
  enabled: boolean | null = null;

  constructor(user?: User) {
    if (user) {
      this.id = user.id;
      this.name = user.name;
      this.surnames = user.surnames;
      this.email = user.email;
      this.dni = user.dni;
      this.password = user.password;
      this.verified = user.verified;
      this.enabled = user.enabled;
    }
  }
}
