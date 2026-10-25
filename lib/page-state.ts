/**
 * Tracks whether the screen is covered by the preloader or the page-transition panel.
 * Entrance animations wait for `whenUncovered()` so they play where people can see them.
 */

declare global {
  interface Window {
    /** Set once React is running; the head script uses it as a failsafe. */
    __uwmReady?: boolean;
  }
}

let covered =
  typeof document !== "undefined" && document.documentElement.classList.contains("is-loading");
let waiters: (() => void)[] = [];

export const isCovered = () => covered;

export function setCovered(value: boolean) {
  covered = value;
  if (!value) {
    const pending = waiters;
    waiters = [];
    pending.forEach((fn) => fn());
  }
}

export function whenUncovered(): Promise<void> {
  if (!covered) return Promise.resolve();
  return new Promise((resolve) => waiters.push(resolve));
}

export const SESSION_KEY = "uwm-loaded";

/**
 * Runs before first paint (inlined in <head>).
 * - Adds `js` so [data-reveal] elements start hidden (they stay visible without JS).
 * - Adds `is-loading` on the first visit of a session to show the preloader.
 * - Failsafe: if React never starts, removes both classes after 7 s.
 */
export const headScript = `(function(){var d=document.documentElement;d.classList.add('js');try{if(!sessionStorage.getItem('${SESSION_KEY}'))d.classList.add('is-loading')}catch(e){}setTimeout(function(){if(!window.__uwmReady)d.classList.remove('js','is-loading')},7000)})();`;
