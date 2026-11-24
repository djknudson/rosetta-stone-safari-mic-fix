// Runs in the extension's isolated world; injects mic-fix.js into the page's own JS world.
(() => {
  const root = () => document.head || document.documentElement;
  const active = () => document.documentElement.getAttribute('data-rs-mic-fix') === 'active';
  let fallbackDone = false;

  // Fallback: Rosetta Stone's CSP allows inline scripts carrying its nonce. Borrow it.
  const injectWithNonce = async () => {
    if (active() || fallbackDone) return;
    const el = document.querySelector('script[nonce]');
    if (!el || !el.nonce) return;
    fallbackDone = true;
    const code = await (await fetch(browser.runtime.getURL('mic-fix.js'))).text();
    const s = document.createElement('script');
    s.nonce = el.nonce;
    s.textContent = code;
    root().appendChild(s);
    s.remove();
  };

  // Method 1: extension resource URL.
  const s = document.createElement('script');
  s.src = browser.runtime.getURL('mic-fix.js');
  s.onload = () => { s.remove(); if (!active()) injectWithNonce(); };
  s.onerror = () => { s.remove(); injectWithNonce(); };
  root().appendChild(s);

  // Keep trying the fallback until a nonce'd script appears or the fix is active.
  const mo = new MutationObserver(() => { if (active()) mo.disconnect(); else injectWithNonce(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 30000);
})();
