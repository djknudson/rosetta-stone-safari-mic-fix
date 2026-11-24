(function(){
  if (window.__gumProbe) return 'probe already installed; log entries: ' + window.__gumLog.length;
  window.__gumProbe = true; window.__gumLog = [];
  const md = navigator.mediaDevices, orig = md.getUserMedia.bind(md);
  md.getUserMedia = async function(c){
    const e = {t: new Date().toISOString().slice(11,23), constraints: JSON.parse(JSON.stringify(c||{}))};
    window.__gumLog.push(e);
    try { const s = await orig(c);
      e.tracks = s.getAudioTracks().map(t => ({label:t.label, muted:t.muted, settings:t.getSettings()}));
      s.getAudioTracks().forEach(t => { t.addEventListener('mute', ()=>window.__gumLog.push({t:new Date().toISOString().slice(11,23), event:'MUTE', label:t.label}));
                                        t.addEventListener('unmute', ()=>window.__gumLog.push({t:new Date().toISOString().slice(11,23), event:'UNMUTE', label:t.label}));
                                        t.addEventListener('ended', ()=>window.__gumLog.push({t:new Date().toISOString().slice(11,23), event:'ENDED', label:t.label})); });
      return s; } catch(err){ e.error = String(err); throw err; }
  };
  const AC = window.AudioContext;
  window.AudioContext = function(...a){ const ctx = new AC(...a); const e={t:new Date().toISOString().slice(11,23), audioContext:{sampleRate:ctx.sampleRate, state:ctx.state, opts:a[0]||null}}; window.__gumLog.push(e);
    ctx.addEventListener('statechange', ()=>window.__gumLog.push({t:new Date().toISOString().slice(11,23), ctxState:ctx.state})); return ctx; };
  window.AudioContext.prototype = AC.prototype;
  return 'probe installed. frames=' + window.frames.length + ' ua=' + navigator.userAgent;
})();
