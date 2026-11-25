// Rosetta Stone Mic Fix (v1.1)
// Rosetta Stone requests raw mic audio (echoCancellation:false). On affected Macs, while Safari's
// voice-processed stream is open, raw built-in-mic streams receive near-silence. Requesting the
// echo-cancelled stream instead delivers normal audio. Only audio constraints are changed.
// Details: docs/diagnosis.md
//
// v1.1 (2026-11-25): v1.0 set an own property on navigator.mediaDevices, and something in the
// page's load removes it about 0.2 s later, so calls fell back to the native method. v1.1 patches
// MediaDevices.prototype (what Rosetta Stone's sonic.js resolves to) and runs a watchdog that
// re-wraps if anything shadows or replaces it.
(() => {
  if (!window.MediaDevices || !MediaDevices.prototype.getUserMedia) return;
  const GOOG = ['googEchoCancellation', 'googAutoGainControl', 'googNoiseSuppression',
                'googHighpassFilter', 'googTypingNoiseDetection'];
  const fixConstraints = (c) => {
    if (c && c.audio && typeof c.audio === 'object') {
      const audio = { ...c.audio, echoCancellation: true };
      GOOG.forEach(k => delete audio[k]);
      return { ...c, audio };
    }
    return c;
  };
  const wrap = (fn) => {
    const patched = function getUserMedia(constraints) {
      return fn.call(this, fixConstraints(constraints));
    };
    patched.__rsMicFix = true;
    return patched;
  };

  const proto = MediaDevices.prototype;
  if (!proto.getUserMedia.__rsMicFix) proto.getUserMedia = wrap(proto.getUserMedia);

  let reapplied = 0;
  const check = () => {
    const md = navigator.mediaDevices;
    if (!md) return;
    if (!proto.getUserMedia.__rsMicFix) { proto.getUserMedia = wrap(proto.getUserMedia); reapplied++; }
    const own = Object.getOwnPropertyDescriptor(md, 'getUserMedia');
    if (own && typeof own.value === 'function' && !own.value.__rsMicFix) {
      try { md.getUserMedia = wrap(own.value); reapplied++; } catch (e) {}
    }
    const ok = !!(md.getUserMedia && md.getUserMedia.__rsMicFix);
    // "active" now means the wrapper is in place right now, not just that it ran once.
    document.documentElement.setAttribute('data-rs-mic-fix', ok ? 'active' : 'lost');
    window.__rsMicFixActive = ok;
    window.__rsMicFixReapplied = reapplied;
  };
  check();
  setInterval(check, 500);
})();
