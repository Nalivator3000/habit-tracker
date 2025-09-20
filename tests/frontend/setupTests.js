import '@testing-library/jest-dom';

global.matchMedia = global.matchMedia || function (query) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }
}

global.ResizeObserver = global.ResizeObserver || class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
  disconnect() {
    return null;
  }
};

Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

beforeEach(() => {
  jest.clearAllMocks();
});