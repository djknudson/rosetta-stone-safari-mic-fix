// Rosetta Stone Mic Fix
// Rosetta Stone requests raw mic audio (echoCancellation:false). On affected Macs, while Safari's
// voice-processed stream is open, raw built-in-mic streams receive near-silence. Requesting the
// echo-cancelled stream instead delivers normal audio. Only audio constraints are changed.
// Details: docs/diagnosis.md
(() => {
  const md = navigator.mediaDevices;
  if (!md || !md.getUserMedia || md.getUserMedia.__rsMicFix) return;
  const original = md.getUserMedia.bind(md);
  const GOOG = ['googEchoCancellation', 'googAutoGainControl', 'googNoiseSuppression',
                'googHighpassFilter', 'googTypingNoiseDetection'];
  const patched = function (constraints) {
    if (constraints && constraints.audio && typeof constraints.audio === 'object') {
      const audio = { ...constraints.audio, echoCancellation: true };
      GOOG.forEach(k => delete audio[k]);
      constraints = { ...constraints, audio };
    }
    return original(constraints);
  };
  patched.__rsMicFix = true;
  md.getUserMedia = patched;
  window.__rsMicFixActive = true;
  document.documentElement.setAttribute('data-rs-mic-fix', 'active');
})();
