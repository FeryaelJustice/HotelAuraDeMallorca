export class Weather {
  id: number | null = null;
  date: Date | null = null;
  state: string | null = null;
  affectedServiceID: number | null = null;

  constructor(weather?: Weather) {
    if (weather) {
      this.id = weather.id;
      this.date = weather.date;
      this.state = weather.state;
      this.affectedServiceID = weather.affectedServiceID;
    }
  }
}
