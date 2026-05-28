import { CortexEvent, CortexEventType } from "./types";

type CortexEventListener = (event: CortexEvent) => void;

class CortexEventBus {
  private listeners = new Set<CortexEventListener>();

  subscribe(listener: CortexEventListener) {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: CortexEventListener) {
    this.listeners.delete(listener);
  }

  emit(type: CortexEventType, message: string, payload?: Record<string, unknown>) {
    const event: CortexEvent = {
      id: crypto.randomUUID(),
      type,
      at: new Date().toISOString(),
      message,
      payload
    };
    this.listeners.forEach((listener) => listener(event));
  }
}

export const cortexEventBus = new CortexEventBus();
