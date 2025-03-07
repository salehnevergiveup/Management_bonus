 export type EventCallback = (eventType: string, data: any) => void;

export interface EventEmitter {
  listeners: Map<string, EventCallback[]>;
  addListener: (userId: string, callback: EventCallback) => () => void;
  removeListener: (userId: string, callback: EventCallback) => void;
  emit: (userId: string, eventType: string, data: any) => void;
  broadcast: (eventType: string, data: any) => void;
}

const createEventEmitter = (): EventEmitter => ({
  listeners: new Map<string, EventCallback[]>(),

  addListener(userId, callback) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, []);
    }
    this.listeners.get(userId)?.push(callback);
    return () => this.removeListener(userId, callback);
  },

  removeListener(userId, callback) {
    const userListeners = this.listeners.get(userId);
    if (!userListeners) return;
    const index = userListeners.indexOf(callback);
    if (index !== -1) {
      userListeners.splice(index, 1);
    }
  },

  emit(userId, eventType, data) {
    const userListeners = this.listeners.get(userId);
    if (!userListeners) {
      return;
    }
    userListeners.forEach(callback => callback(eventType, data));
  },

  broadcast(eventType, data) {
    this.listeners.forEach(listeners => {
      listeners.forEach(callback => callback(eventType, data));
    });
  }
});

if (!(globalThis as any).EVENT_EMITTER) {
    (globalThis as any).EVENT_EMITTER = createEventEmitter();
  }
  
  export const eventEmitter: EventEmitter = (globalThis as any).EVENT_EMITTER;