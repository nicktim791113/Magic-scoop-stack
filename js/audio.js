// ============================================================
// audio.js — Web Audio API 程式合成音效（不用音檔，永遠離線可用）
// ============================================================
const Audio = (() => {
  let ctx = null;
  let unlocked = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  }

  function unlock() {
    if (unlocked) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
  }

  function tone({ freq = 440, dur = 0.12, type = 'sine',
                  gain = 0.18, freqEnd = null, when = 0 } = {}) {
    const c = ensure(); if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function play(name) {
    if (!unlocked) return;
    switch (name) {
      case 'drop':
        tone({ freq: 700, freqEnd: 420, dur: 0.10, type: 'triangle', gain: 0.15 });
        break;
      case 'stack':
        tone({ freq: 380, freqEnd: 520, dur: 0.10, type: 'sine', gain: 0.18 });
        tone({ freq: 760, dur: 0.06, type: 'sine', gain: 0.08, when: 0.05 });
        break;
      case 'perfect':
        tone({ freq: 660, dur: 0.10, type: 'square', gain: 0.12 });
        tone({ freq: 880, dur: 0.10, type: 'square', gain: 0.12, when: 0.08 });
        tone({ freq: 1320, dur: 0.18, type: 'square', gain: 0.10, when: 0.18 });
        break;
      case 'over':
        tone({ freq: 440, freqEnd: 110, dur: 0.40, type: 'sawtooth', gain: 0.18 });
        tone({ freq: 220, freqEnd: 80,  dur: 0.50, type: 'sawtooth', gain: 0.14, when: 0.10 });
        break;
    }
  }

  return { unlock, play };
})();
