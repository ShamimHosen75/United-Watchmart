/**
 * Real asset progress for the preloader.
 * Any component can report progress: `const report = trackAsset("hero-model"); report(0.4); report(1);`
 */

const tasks = new Map<string, number>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((fn) => fn());

export function trackAsset(id: string) {
  if (!tasks.has(id)) tasks.set(id, 0);
  emit();
  return (progress: number) => {
    tasks.set(id, Math.min(1, Math.max(0, progress)));
    emit();
  };
}

export function trackPromise(id: string, promise: Promise<unknown>) {
  const report = trackAsset(id);
  promise.then(
    () => report(1),
    () => report(1), // a failed asset should never block the site
  );
}

/** Average progress of every tracked asset, 0 to 1. */
export function getProgress() {
  if (tasks.size === 0) return 0;
  let sum = 0;
  tasks.forEach((p) => (sum += p));
  return sum / tasks.size;
}

export function onProgress(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Resolves when every <img> currently in the page has loaded or failed. */
export function imagesReady(root: ParentNode = document) {
  const imgs = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

export const windowLoaded = () =>
  new Promise<void>((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", () => resolve(), { once: true });
  });
