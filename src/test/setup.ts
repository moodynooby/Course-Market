import '@testing-library/jest-dom';
import './mocks';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const memoryLocalStorage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryLocalStorage,
  configurable: true,
  writable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: memoryLocalStorage,
    configurable: true,
    writable: true,
  });
}
