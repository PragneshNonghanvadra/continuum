type ChromeListener<T extends (...args: never[]) => void> = {
  addListener(listener: T): void;
};

declare const chrome: {
  runtime: {
    onInstalled: ChromeListener<() => void>;
  };
  storage: {
    local: {
      set(values: Record<string, unknown>): void;
    };
  };
};
