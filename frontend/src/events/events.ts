export enum Events {
  CHANGE_PROFILE_PIC = "changeProfilePic",
}

export const EventEmitter = {
  _events: {} as { [key in Events]?: Function[] },
  dispatch: function (event: Events, data: any) {
    if (!this._events[event]) return;
    this._events[event]?.forEach((callback) => callback(data));
  },
  subscribe: function (event: Events, callback: (data: any) => any) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event]?.push(callback);
  },
  unsubscribe: function (event: Events) {
    if (!this._events[event]) return;
    delete this._events[event];
  },
};
