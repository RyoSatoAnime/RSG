(() => {
  "use strict";

  const shell = window.RSGShell;
  if (!shell) throw new Error("RSG Shell is required before game.js");

  const { ctx, Actions, App } = shell;
  // Keep the music running through RESULT; only shell pause/title stops it.
  const nightBloom = new Audio("nightBloom.mp3");
  nightBloom.preload = "auto";
  let musicRequest = 0;

  function playMusic() {
    const request = ++musicRequest;
    nightBloom.muted = App.BGMmute;
    try {
      Promise.resolve(nightBloom.play()).catch((error) => {
        if (request === musicRequest) console.warn("nightBloom playback could not start", error);
      });
    } catch (error) {
      console.warn("nightBloom playback could not start", error);
    }
  }

  function stopMusic(rewind = false) {
    ++musicRequest;
    nightBloom.pause();
    if (rewind) nightBloom.currentTime = 0;
  }

  App.onBGMRefresh = () => { nightBloom.muted = App.BGMmute; };

  // Adopted item-normal sample; one volume control for in-game balancing.
  // All normal FX sizes share one voice; each new hit replaces the previous sound.
  const ITEM_NORMAL_AUDIO = Object.freeze({ volume: 1, sizeByFxTier: [0, 1, 2, 2], maxVoices: 1 });
  const normalItemAudio = (() => {
  function synthesize(sampleRate = 44100, size = 0) {
    size = Math.max(0, Math.min(2, Math.round(size)));
    const duration = [0.55, 0.7, 0.85][size];
    const n = Math.ceil(duration * sampleRate);
    const left = new Float32Array(n), right = new Float32Array(n);
    let seed = 7142, low = 0, highLow = 0, phase = 0;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const alpha = 1 - Math.exp(-2 * Math.PI * 3800 / sampleRate);
    const hpAlpha = 1 - Math.exp(-2 * Math.PI * 950 / sampleRate);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      low += alpha * (noise() - low); highLow += hpAlpha * (low - highLow);
      const attack = 1 - Math.exp(-t / .0015);
      // Soft air burst and a brief rounded impact; no square/saw oscillators.
      const air = (low - highLow) * Math.exp(-t / (.028 + size * .007)) * .18;
      phase += 2 * Math.PI * (190 + 300 * Math.exp(-t / .012)) / sampleRate;
      const impact = Math.sin(phase) * Math.exp(-t / .020) * .055;
      let l = attack * (air + impact), r = l;
      // Inharmonic glass grains keep this from sounding like a melodic pickup jingle.
      for (let k = 0; k < 3 + size * 2; k++) {
        const u = t - (.008 + k * .022);
        if (u < 0) continue;
        const freq = [1670, 2390, 3180, 1970, 3710, 2810, 4330][k];
        const env = (1 - Math.exp(-u / .003)) * Math.exp(-u / (.047 + size * .012));
        const grain = Math.sin(2 * Math.PI * freq * u + .6 * Math.sin(2 * Math.PI * freq * 1.413 * u) * Math.exp(-u / .012)) * env * .018;
        const pan = Math.sin(k * 2.1) * .45;
        l += grain * Math.sqrt((1 - pan) / 2); r += grain * Math.sqrt((1 + pan) / 2);
      }
      left[i] = l; right[i] = r;
    }
    // Very quiet, short diffuse reflections; dry attack remains easy to locate.
    for (const [delay,gain] of [[.031,.10],[.053,.075],[.079,.05],[.113,.025]]) {
      const d = Math.round(delay * sampleRate);
      for (let i = n - 1; i >= d; i--) {
        left[i] += right[i-d] * gain; right[i] += left[i-d] * gain;
      }
    }
    const level = [0.85, 0.94, 1][size];
    for (let i = 0; i < n; i++) {
      const fade = Math.min(1,(n - 1 - i) / (sampleRate * .03));
      left[i] *= level * fade; right[i] *= level * fade;
    }
    return {left,right,sampleRate};
  }
    let buffers = null;
    let bufferContext = null;
    const voices = new Set();

    function prepare() {
      try {
        App.ensureAudio();
        const context = App.audioContext;
        if (!context || context === bufferContext) return;
        buffers = [0, 1, 2].map(size => {
          const data = synthesize(context.sampleRate, size);
          const buffer = context.createBuffer(2, data.left.length, context.sampleRate);
          buffer.copyToChannel(data.left, 0);
          buffer.copyToChannel(data.right, 1);
          return buffer;
        });
        bufferContext = context;
      } catch (error) {
        buffers = null;
        console.warn("item normal audio could not initialize", error);
      }
    }

    function stop() {
      for (const source of voices) {
        try { source.stop(); } catch (_) {}
      }
      voices.clear();
    }

    function play(tier) {
      const context = App.audioContext;
      if (App.SFXmute || App.paused || !buffers || !context || context.state !== "running") return;
      try {
        if (voices.size >= ITEM_NORMAL_AUDIO.maxVoices) {
          const oldest = voices.values().next().value;
          oldest.stop();
          voices.delete(oldest);
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers[ITEM_NORMAL_AUDIO.sizeByFxTier[tier]];
        gain.gain.value = ITEM_NORMAL_AUDIO.volume;
        source.connect(gain).connect(App.sfxOutput);
        source.onended = () => {
          voices.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        voices.add(source);
        source.start();
      } catch (error) {
        console.warn("item normal audio could not play", error);
      }
    }

    return { prepare, play, stop };
  })();

  // Each item family owns one voice; different families can overlap.
  const ITEM_RARE_AUDIO = Object.freeze({ volume: 1, sizeByFxTier: [0, 1, 2, 2], maxVoices: 1 });
  const ITEM_HEAVY_AUDIO = Object.freeze({ volume: 1, sizeByFxTier: [0, 1, 2, 2], maxVoices: 1 });

  function createCollectionAudio(synthesize, settings, name) {
    let buffers = null;
    let bufferContext = null;
    const voices = new Set();

    function prepare() {
      try {
        App.ensureAudio();
        const context = App.audioContext;
        if (!context || context === bufferContext) return;
        buffers = (settings.sizes || [0, 1, 2]).map(size => {
          const data = synthesize(context.sampleRate, size);
          const buffer = context.createBuffer(2, data.left.length, context.sampleRate);
          buffer.copyToChannel(data.left, 0);
          buffer.copyToChannel(data.right, 1);
          return buffer;
        });
        bufferContext = context;
      } catch (error) {
        buffers = null;
        console.warn(`item ${name} audio could not initialize`, error);
      }
    }

    function stop() {
      for (const source of voices) {
        try { source.stop(); } catch (_) {}
      }
      voices.clear();
    }

    function play(tier, offsetSeconds = 0) {
      const context = App.audioContext;
      if (App.SFXmute || App.paused || !buffers || !context || context.state !== "running") return;
      try {
        if (voices.size >= settings.maxVoices) {
          const oldest = voices.values().next().value;
          oldest.stop();
          voices.delete(oldest);
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers[settings.sizeByFxTier[tier]];
        gain.gain.value = settings.volume;
        source.connect(gain).connect(App.sfxOutput);
        source.onended = () => {
          voices.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        voices.add(source);
        source.start(0, offsetSeconds);
      } catch (error) {
        console.warn(`item ${name} audio could not play`, error);
      }
    }

    return { prepare, play, stop };
  }

  const rareItemAudio = createCollectionAudio(
    function synthesize(sampleRate = 44100, size = 0) {
    size = Math.max(0, Math.min(2, Math.round(size)));
    const duration = [.9, 1.1, 1.35][size];
    const n = Math.ceil(duration * sampleRate);
    const left = new Float32Array(n), right = new Float32Array(n);
    const pitchScale = Math.pow(2, 6 / 12);
    const modes = [[1080, .065, .145], [1613, .039, .19], [2308, .028, .105],
      [3042, .018, .072], [4312, .011, .047]];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let l = 0, r = 0;
      const attack = 1 - Math.exp(-t / .0025);
      // Inharmonic modes with a decaying phase modulation: struck crystal, not a beep.
      for (let k = 0; k < modes.length; k++) {
        const [baseFrequency, amplitude, decay] = modes[k];
        const f = baseFrequency * pitchScale;
        const env = attack * Math.exp(-t / (decay + size * .024));
        const modulation = .75 * Math.exp(-t / .018) * Math.sin(2 * Math.PI * f * 1.387 * t);
        const v = Math.sin(2 * Math.PI * f * t + modulation) * env * amplitude;
        const pan = Math.sin(k * 2.4) * .32;
        l += v * Math.sqrt((1 - pan) / 2);
        r += v * Math.sqrt((1 + pan) / 2);
      }
      // A quick upward spectral bloom separates this from normal's dry impact.
      if (t < .24) {
        const tau = .045;
        const phase = 2 * Math.PI * pitchScale * (2600 * t - 900 * tau * (1 - Math.exp(-t / tau)));
        const env = (1 - Math.exp(-t / .018)) * Math.exp(-t / .047);
        l += Math.sin(phase) * env * .023;
        r += Math.sin(phase + .26 * (1 - Math.exp(-t / .012))) * env * .023;
      }
      // Irregular descending glass grains, progressively more numerous at larger FX sizes.
      const glass = [3470, 2713, 2189, 2961, 1867, 2483, 1591];
      for (let k = 0; k < 3 + size * 2; k++) {
        const u = t - (.047 + k * .028 + (k % 2) * .006);
        if (u < 0) continue;
        const f = glass[k] * pitchScale;
        const env = (1 - Math.exp(-u / .002)) * Math.exp(-u / (.049 + size * .011));
        const v = (Math.sin(2 * Math.PI * f * u) + .24 * Math.sin(2 * Math.PI * f * 1.617 * u)) * env * .015;
        const pan = Math.sin(k * 2.17 + .5) * .76;
        l += v * Math.sqrt((1 - pan) / 2);
        r += v * Math.sqrt((1 + pan) / 2);
      }
      left[i] = l; right[i] = r;
    }
    for (const [delay, gain] of [[.039,.13],[.073,.10],[.127,.07],[.191,.042],[.263,.025]]) {
      const d = Math.round(delay * sampleRate);
      for (let i = n - 1; i >= d; i--) {
        left[i] += right[i - d] * gain;
        right[i] += left[i - d] * gain;
      }
    }
    const level = [.95, 1, 1.04][size];
    for (let i = 0; i < n; i++) {
      const fade = Math.min(1, (n - 1 - i) / (sampleRate * .04));
      left[i] *= level * fade; right[i] *= level * fade;
    }
    return {left, right, sampleRate};
  },
    ITEM_RARE_AUDIO, "rare"
  );

  const heavyItemAudio = createCollectionAudio(
    function synthesize(sampleRate = 44100, size = 0) {
    size = Math.max(0, Math.min(2, Math.round(size)));
    const duration = [1.35, 2.05, 2.65][size];
    const n = Math.ceil(duration * sampleRate);
    const left = new Float32Array(n), right = new Float32Array(n);
    let seed = 28169, low = 0, bottom = 0, sheenLow = 0;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const coeff = f => 1 - Math.exp(-2 * Math.PI * f / sampleRate);
    const lp = coeff(10500), hp = coeff(1100), sheenHP = coeff(4800);
    const jewels = [];
    const count = [14, 38, 76][size];
    for (let k = 0; k < count; k++) {
      const u = (k * .61803398875) % 1, v = (k * .41421356237) % 1;
      jewels.push({start:.013 + Math.pow(k / count, 1.38) * [.26, .58, .83][size],
        f:2000 * Math.pow(3.4,u), pan:Math.sin(k * 2.399) * .94,
        decay:([.058, .0895, .118][size] + [.06, .0537, .0473][size] * v) * 1.3,
        amplitude:[.014, .025, .038][size] * (1 - .3 * k / count)});
    }
    const crown = [[2251,.024],[2983,.018],[3613,.017],[4739,.014],[5879,.012],[7213,.008]];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      low += lp * (noise() - low); bottom += hp * (low - bottom); sheenLow += sheenHP * (low - sheenLow);
      const high = low - bottom, fine = low - sheenLow;
      const attack = 1 - Math.exp(-t / .00018);
      // White-hot, broadband glass rupture: deliberately no bass oscillator or drum.
      const snap = high * attack * Math.exp(-t / .005) * .58;
      const flash = high * attack * Math.exp(-t / (.029 + size * .006)) * .24;
      // A swelling luminous cloud connects the crack to a sustained sparkle shower.
      const bloomEnv = (1 - Math.exp(-t / .014)) * Math.exp(-t / (.14 + size * .025));
      const bloom = fine * bloomEnv * .16;
      let l = snap + flash + bloom, r = l;
      for (let k = 0; k < crown.length; k++) {
        const [f,amplitude] = crown[k];
        const env = (1 - Math.exp(-t / .0018)) * Math.exp(-t / (.058 + k * .007 + size * .009));
        const phase = 2 * Math.PI * f * t + 1.8 * Math.exp(-t / .011) * Math.sin(2 * Math.PI * f * 1.417 * t);
        const v = Math.sin(phase) * env * amplitude * [1, 1.25, 1.6][size];
        l += v * .707; r += v * .707;
      }
      // Many overlapping high, inharmonic crystal fragments: a lavish shower, not isolated bells.
      for (const g of jewels) {
        const u = t - g.start;
        if (u < 0) continue;
        const env = (1 - Math.exp(-u / .002)) * Math.exp(-u / g.decay);
        const phase = 2 * Math.PI * g.f * (u + .00011 * (1 - Math.exp(-u / .018)));
        const grain = (Math.sin(phase) + .31 * Math.sin(phase * 1.431)) * env * g.amplitude;
        l += grain * Math.sqrt((1 - g.pan) / 2); r += grain * Math.sqrt((1 + g.pan) / 2);
      }
      // Fine airy shimmer continues underneath the jewel rain.
      const shimmerEnv = (1 - Math.exp(-t / .065)) * Math.exp(-t / [.204, .3324, .4392][size]);
      l += fine * shimmerEnv * ([.028, .046, .065][size] + .012 * Math.sin(2 * Math.PI * 37 * t));
      r += fine * shimmerEnv * ([.028, .046, .065][size] + .012 * Math.sin(2 * Math.PI * 43 * t));
      left[i] = l; right[i] = r;
    }
    for (const [delay,gain] of [[.023,.17],[.047,.13],[.079,.11],[.127,.085],[.193,.06],[.281,.04],[.397,.025]]) {
      const d = Math.round(delay * [1, .895, .82][size] * sampleRate);
      for (let i = n - 1; i >= d; i--) {
        left[i] += right[i-d] * gain * [0.8, 1, 1.25][size]; right[i] += left[i-d] * gain * [0.8, 1, 1.25][size];
      }
    }
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    const level = [.3,.38,.46][size] / Math.max(peak,1e-8);
    for (let i = 0; i < n; i++) {
      const fadePosition = Math.min(1, (n - 1 - i) / (sampleRate * [.30, .40, .50][size]));
      const fade = fadePosition * fadePosition * (3 - 2 * fadePosition);
      left[i] *= level * fade; right[i] *= level * fade;
    }
    return {left,right,sampleRate};
  },
    ITEM_HEAVY_AUDIO, "heavy"
  );

  const collectionItemAudio = [normalItemAudio, rareItemAudio, heavyItemAudio];

  // User-tuned flipper sound. Left/right have independent monophonic voices.
  const FLIPPER_AUDIO = Object.freeze({ volume: 1, sizeByFxTier: [0], sizes: [0], maxVoices: 1 });
  function synthesizeFlipperMove(sampleRate = 44100) {
    const n = Math.ceil(.18 * sampleRate);
    const left = new Float32Array(n), right = new Float32Array(n);
    let seed = 15839, low = 0, highLow = 0, softLow = 0;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const coefficient = f => 1 - Math.exp(-2 * Math.PI * f / sampleRate);
    const lp = coefficient(6800), hp = coefficient(650), soft = coefficient(2300);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      low += lp * (noise() - low); highLow += hp * (low - highLow); softLow += soft * (low - softLow);
      const attack = 1 - Math.exp(-t / .0003);
      const click = (low - highLow) * attack * Math.exp(-t / .0043) * .17;
      const swishTime = t - .004;
      const swish = swishTime > 0 ? (softLow - highLow) * (1 - Math.exp(-swishTime / .002)) * Math.exp(-swishTime / .008) * .10 : 0;
      // Extremely short inharmonic metal vibrations, not a musical beep or bass drum.
      const metal = (Math.sin(2 * Math.PI * 1763 * t) * Math.exp(-t / .0055) * .023
        + Math.sin(2 * Math.PI * 3317 * t) * Math.exp(-t / .003) * .012) * attack;
      const settleTime = t - .019;
      const settle = settleTime > 0 ? (low - highLow) * (1 - Math.exp(-settleTime / .0003)) * Math.exp(-settleTime / .0023) * .038 : 0;
      const pingAttack = 1 - Math.exp(-t / .0008);
      const ping = pingAttack * (
        Math.sin(2 * Math.PI * 1864.7 * t + .25 * Math.exp(-t / .006) * Math.sin(2 * Math.PI * 3729.3 * t)) * Math.exp(-t / .022) * .019
        + Math.sin(2 * Math.PI * 7458.6 * t) * Math.exp(-t / .011) * .008);
      const value = (click + swish + metal + settle) * 1.15 + ping;
      const fade = Math.min(1,(n - 1 - i) / (sampleRate * .018));
      left[i] = value * fade; right[i] = value * fade;
    }
    return {left,right,sampleRate};
  }
  const flipperMoveAudio = [
    createCollectionAudio(synthesizeFlipperMove, FLIPPER_AUDIO, "left flipper"),
    createCollectionAudio(synthesizeFlipperMove, FLIPPER_AUDIO, "right flipper")
  ];
  const HIGH_SPEED_HIT_AUDIO = Object.freeze({
    volume: 0.5, minSpeed: 20,
    sizeByFxTier: [0], sizes: [0], maxVoices: 1
  });
  function synthesizeHighSpeedHit(sampleRate = 44100) {
    const n = Math.ceil(.25 * sampleRate);
    const left = new Float32Array(n), right = new Float32Array(n);
    let seed = 32871, low = 0, bottom = 0;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const lp = 1 - Math.exp(-2 * Math.PI * 8200 / sampleRate);
    const hp = 1 - Math.exp(-2 * Math.PI * 1700 / sampleRate);
    // Thin steel has several unrelated, differently damped resonances.
    const modes = [[659.3, .044, .033],
  [1318.5, .030, .019],
  [2637, .019, .013],
  [5274, .010, .008]];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      low += lp * (noise() - low); bottom += hp * (low - bottom);
      const attack = 1 - Math.exp(-t / .00035);
      const contact = (low - bottom) * attack * Math.exp(-t / .0018) * .12;
      let metal = 0;
      for (const [frequency,amplitude,decay] of modes) {
        metal += Math.sin(2 * Math.PI * frequency * t) * amplitude * Math.exp(-t / decay);
      }
      const value = contact + metal * attack;
      const fade = Math.min(1,(n - 1 - i) / (sampleRate * .025));
      left[i] = value * fade; right[i] = left[i];
    }
    return {left,right,sampleRate};
  }
  const highSpeedHitAudio = createCollectionAudio(synthesizeHighSpeedHit, HIGH_SPEED_HIT_AUDIO, "high-speed collision");

  function playHighSpeedCollision(collision, incomingSpeed) {
    const context = App.audioContext;
    if (!collision?.reflected || incomingSpeed < HIGH_SPEED_HIT_AUDIO.minSpeed
      || App.SFXmute || App.paused || !context || context.state !== "running") return;
    highSpeedHitAudio.play(0);
  }

  const BUMPER_AUDIO = Object.freeze({ volume: 1, sizeByFxTier: [0], sizes: [0], maxVoices: 1 });
  function synthesizeBumperHit(sampleRate = 44100, pitchSemitones = -5.7, presence = false) {
    const n = Math.ceil(.45 * sampleRate);
    const left = new Float32Array(n), right = new Float32Array(n);
    let seed = 54871, low = 0, bottom = 0;
    const noise = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 2147483648 - 1; };
    const lp = 1 - Math.exp(-2 * Math.PI * 7500 / sampleRate);
    const hp = 1 - Math.exp(-2 * Math.PI * 1400 / sampleRate);
    const pitchScale = Math.pow(2, pitchSemitones / 12);
    // Finite saw-like harmonics avoid a raw, aliased discontinuous waveform.
    const saw = phase => {
      let value = 0;
      for (let harmonic = 1; harmonic <= 10; harmonic++) {
        value += Math.sin(phase * harmonic) * (harmonic % 2 ? 1 : -1) / harmonic * (presence && harmonic >= 3 ? 1.25 : 1);
      }
      return value * .64;
    };
    const modes = [[1481,.047,.031],[2773,.030,.018],[4297,.019,.011],[6089,.010,.006]];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      low += lp * (noise() - low); bottom += hp * (low - bottom);
      const attack = 1 - Math.exp(-t / .00045);
      const strike = (low - bottom) * attack * Math.exp(-t / .0022) * (presence ? .17 : .105);
      let metal = 0;
      for (const [baseFrequency,amp,decay] of modes) {
        const f = baseFrequency * pitchScale;
        metal += saw(2 * Math.PI * f * t) * amp * Math.exp(-t / (decay * 1.45)) * attack;
      }
      // Closely spaced spring modes produce a small, rapidly damping metallic flutter.
      const u = t - .004;
      let spring = 0;
      if (u > 0) {
        const env = (1 - Math.exp(-u / .002)) * Math.exp(-u / .085);
        const vibration = saw(2 * Math.PI * 1193 * pitchScale * u + .55 * Math.exp(-u / .035) * Math.sin(2 * Math.PI * 26 * u))
          + .65 * saw(2 * Math.PI * 1271 * pitchScale * u)
          + .24 * saw(2 * Math.PI * 2479 * pitchScale * u);
        spring = Math.tanh(vibration * 2.3) * env * .062;
      }
      const fadePosition = Math.min(1,(n - 1 - i) / (sampleRate * .04));
      const fade = fadePosition * fadePosition * (3 - 2 * fadePosition);
      left[i] = (strike + metal + spring) * fade; right[i] = left[i];
    }
    return {left,right,sampleRate};
  }
  // Ignore the shared helper's size argument so the user's tuned pitch stays intact.
  const bumperHitAudio = createCollectionAudio(sampleRate => synthesizeBumperHit(sampleRate), BUMPER_AUDIO, "bumper");

  const BALL_SPAWN_AUDIO = Object.freeze({ volume: 1, sizeByFxTier: [0], sizes: [0], maxVoices: 1 });
  function synthesizeBallSpawn(sampleRate=44100,convergenceSeconds=.3){
    const n=Math.ceil((convergenceSeconds+.32)*sampleRate);
    const left=new Float32Array(n),right=new Float32Array(n);
    let seed=61187,low=0,bottom=0;
    const noise=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/2147483648-1;};
    const lp=1-Math.exp(-2*Math.PI*6500/sampleRate),hp=1-Math.exp(-2*Math.PI*1900/sampleRate);
    const fragments=[[1973,.5],[2819,-.6],[3637,.75],[4379,-.8],[5209,.4]];
    for(let i=0;i<n;i++){
      const t=i/sampleRate;
      low+=lp*(noise()-low);bottom+=hp*(low-bottom);
      let l=0,r=0;
      if(t<convergenceSeconds){
        const progress=t/convergenceSeconds;
        const envelope=Math.pow(progress,1.35)*Math.sin(Math.PI*progress)*1.7;
        const air=(low-bottom)*envelope*.018;
        l+=air;r+=air;
        // Small discrete crystal lights gather, without a cartoon pitch slide.
        const lights = [4933, 6271, 5563, 7481, 6803, 8171];
        for (let k=0;k<lights.length;k++) {
          const u=t-(.025+k*.039)*(convergenceSeconds/.3);
          if(u<0)continue;
          const env=(1-Math.exp(-u/.001))*Math.exp(-u/.017);
          const sparkle=(Math.sin(2*Math.PI*lights[k]*u)+.16*Math.sin(2*Math.PI*lights[k]*1.31*u))*env*.019;
          const pan=Math.sin(k*2.4)*.65*(1-progress);
          l+=sparkle*Math.sqrt((1-pan)/2);r+=sparkle*Math.sqrt((1+pan)/2);
        }
        for(let k=0;k<fragments.length;k++){
          const [f,pan]=fragments[k];
          const arrival=convergenceSeconds-(k*.026+.012);
          if(t>arrival)continue;
          const age=arrival-t;
          const reverseEnvelope=Math.exp(-age/.045)*(1-Math.exp(-t/.015));
          const grain=Math.sin(2*Math.PI*f*t)*reverseEnvelope*.005;
          const narrowing=pan*(1-progress);
          l+=grain*Math.sqrt((1-narrowing)/2);r+=grain*Math.sqrt((1+narrowing)/2);
        }
      }
      const u=t-convergenceSeconds;
      if(u>=0){
        const envelope=(1-Math.exp(-u/.001))*Math.exp(-u/.042);
        const glint=(Math.sin(2*Math.PI*7903*u)+.3*Math.sin(2*Math.PI*10657*u)+.12*Math.sin(2*Math.PI*13709*u))*envelope*.047;
        l+=glint;r+=glint;
      }
      const fade=Math.min(1,(n-1-i)/(sampleRate*.025));
      left[i]=l*fade;right[i]=r*fade;
    }
    return{left,right,sampleRate};
  }
  const ballSpawnAudio = createCollectionAudio(
    sampleRate => synthesizeBallSpawn(sampleRate, BALL_SPAWN.telegraphFrames / 60),
    BALL_SPAWN_AUDIO, "ball spawn"
  );
  let ballSpawnAudioPending = false;

  const gameAudio = [...collectionItemAudio, ...flipperMoveAudio, highSpeedHitAudio, bumperHitAudio, ballSpawnAudio];

  function updateFlipperInputs() {
    const inputs = [Actions.actionLeft || Actions.moveLeft || Actions.shiftLeft || window.RSGShell.GamepadInput.leftFlipper, Actions.actionRight || Actions.moveRight || Actions.shiftRight || window.RSGShell.GamepadInput.rightFlipper];
    for (let index = 0; index < flippers.length; index++) {
      const flipper = flippers[index];
      const isUp = !!inputs[index];
      if (isUp && !flipper.isUp && Math.abs(flipper.angle - flipper.upAngle) > 1e-8) {
        flipperMoveAudio[index].play(0);
      }
      flipper.isUp = isUp;
    }
  }

  const WIDTH = 800;
  const HEIGHT = 800;
  const fireworkCanvas = document.createElement("canvas");
  fireworkCanvas.width = WIDTH;
  fireworkCanvas.height = HEIGHT;
  const fireworkCtx = fireworkCanvas.getContext("2d", { alpha: true });
  // Only the glow layer uses reduced resolution; crisp fireworks stay at 800x800.
  const FIREWORK_GLOW_SCALE = 0.5;
  const fireworkGlowCanvas = document.createElement("canvas");
  fireworkGlowCanvas.width = Math.round(WIDTH * FIREWORK_GLOW_SCALE);
  fireworkGlowCanvas.height = Math.round(HEIGHT * FIREWORK_GLOW_SCALE);
  const fireworkGlowCtx = fireworkGlowCanvas.getContext("2d", { alpha: true });
  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = WIDTH;
  gridCanvas.height = HEIGHT;
  const gridCtx = gridCanvas.getContext("2d", { alpha: true });
  const staticGridCanvas = document.createElement("canvas");
  staticGridCanvas.width = WIDTH;
  staticGridCanvas.height = HEIGHT;
  const staticGridCtx = staticGridCanvas.getContext("2d", { alpha: true });
  let staticGridReady = false;
  // Keep grid lines full resolution; only the soft visibility mask is smaller.
  const GRID_MASK_SCALE = 0.5;
  const gridMaskCanvas = document.createElement("canvas");
  gridMaskCanvas.width = Math.round(WIDTH * GRID_MASK_SCALE);
  gridMaskCanvas.height = Math.round(HEIGHT * GRID_MASK_SCALE);
  const gridMaskCtx = gridMaskCanvas.getContext("2d", { alpha: true });
  const trailCanvas = document.createElement("canvas");
  trailCanvas.width = WIDTH;
  trailCanvas.height = HEIGHT;
  const trailCtx = trailCanvas.getContext("2d", { alpha: true });
  const fadingTrailLayers = new WeakMap();
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const toRadians = degrees => degrees * Math.PI / 180;

  const PHYSICS = Object.freeze({
    substeps: 6,
    gravity: 0.38,
    maxSpeed: 38,
    ballRadius: 20,
    wallRadius: 1,
    wallRestitution: 0.58,
    bumperRestitution: 0.92,
    bumperKick: 4.2,
    flipperSurfaceTransfer: 0.9,
    flipperRestitution: 0.5,
    flipperGrip: 0.12,
    serveVx: -0.55,
    serveVy: -0
  });

  const TRAIL_STYLE = Object.freeze({
    maxPoints: 42,
    collisionRadius: 12,
    fadeFrames: 12,
    color: "#ff405f"
  });

  const TRAIL_VECTOR_STYLE = Object.freeze({
    widthRatios: Object.freeze([2, 1.33, 0.66, 0.1]),
    outlineWidth: 1,
    glow: 12
  });

  const ITEM_TYPES = Object.freeze({
    normal: Object.freeze({ points: 10, radius: 6, minSpeed: 1.8, maxSpeed: 3.2, color: "#12ffd4" }),
    rare: Object.freeze({ points: 30, radius: 11, minSpeed: 1.4, maxSpeed: 2.5, color: "#ffd23f" }),
    heavy: Object.freeze({ points: 100, radius: 17, minSpeed: 1.1, maxSpeed: 1.8, color: "#ff4fd8" })
  });

  const ITEM_SPAWN = Object.freeze({
    intervalFrames: 5,
    maxItems: 110,
    marginX: 40,
    heavyChanceNormal: 0.03,
    heavyChanceFever: 0.06,
    rareChance: 0.13
  });

  const ROUND_TIMING = Object.freeze({
    durationSeconds: 60,
    feverSeconds: 17.2
  });

  const BALL_SPAWN = Object.freeze({
    x: 600,
    y: 650,
    telegraphFrames: 18,
  });

  // Vector Symbols A/B/C. Coordinates remain in their authored SVG space and
  // are centered/scaled only when drawn. A's 20.8px width is reduced to 12px.
  const ITEM_SYMBOLS = Object.freeze({
    normal: Object.freeze({
      center: [10.4, 9],
      scale: 12 / 20.8,
      paths: Object.freeze([
        Object.freeze({ closed: true, points: [[10.4, 0], [0, 18], [20.8, 18]] }),
        Object.freeze({ points: [[5.2, 9], [10.4, 12]] }),
        Object.freeze({ points: [[10.4, 18], [10.4, 12]] }),
        Object.freeze({ points: [[15.6, 9], [10.4, 12]] }),
        Object.freeze({ points: [[10.4, 6], [15.6, 9]] }),
        Object.freeze({ points: [[5.2, 9], [10.4, 6]] }),
        Object.freeze({ points: [[15.6, 9], [15.6, 15]] }),
        Object.freeze({ points: [[10.4, 18], [15.6, 15]] }),
        Object.freeze({ points: [[10.4, 18], [5.2, 15]] }),
        Object.freeze({ points: [[5.2, 9], [5.2, 15]] })
      ])
    }),
    rare: Object.freeze({
      center: [49, 11],
      scale: 1,
      paths: Object.freeze([
        Object.freeze({ closed: true, points: [[48.8, 0], [39.1, 16.8], [58.5, 16.8]] }),
        Object.freeze({ closed: true, points: [[56.7, 3.3], [38, 8.3], [51.7, 22]] }),
        Object.freeze({ closed: true, points: [[60, 11.2], [43.2, 1.5], [43.2, 20.9]] }),
        Object.freeze({ closed: true, points: [[48.8, 0], [56.7, 3.3], [60, 11.2], [58.5, 16.8], [51.7, 22], [43.2, 20.9], [39.1, 16.8], [38, 8.3], [43.2, 1.5]] })
      ])
    }),
    heavy: Object.freeze({
      center: [17, 43],
      scale: 1,
      paths: Object.freeze([
        Object.freeze({ closed: true, points: [[17, 31], [19.5, 37], [25.5, 34.5], [24, 26]] }),
        Object.freeze({ closed: true, points: [[17, 55], [14.5, 49], [8.5, 51.5], [10, 60]] }),
        Object.freeze({ closed: true, points: [[29, 43], [23, 45.5], [25.5, 51.5], [34, 50]] }),
        Object.freeze({ closed: true, points: [[5, 43], [11, 40.5], [8.5, 34.5], [0, 36]] }),
        Object.freeze({ closed: true, points: [[25.5, 34.5], [23, 40.5], [29, 43], [34, 36]] }),
        Object.freeze({ closed: true, points: [[8.5, 51.5], [11, 45.5], [5, 43], [0, 50]] }),
        Object.freeze({ closed: true, points: [[25.5, 51.5], [19.5, 49], [17, 55], [24, 60]] }),
        Object.freeze({ closed: true, points: [[8.5, 34.5], [14.5, 37], [17, 31], [10, 26]] }),
        Object.freeze({ points: [[10, 26], [24, 60]] }),
        Object.freeze({ points: [[24, 26], [10, 60]] }),
        Object.freeze({ points: [[0, 36], [34, 50]] }),
        Object.freeze({ points: [[34, 36], [0, 50]] })
      ])
    })
  });

  const VECTOR_STYLE = Object.freeze({
    geometryColor: "#ffffff",
    itemLineWidth: 1,
    geometryLineWidth: 1,
    itemGlow: 10,
    geometryGlow: 10
  });

  const FIREWORK_STYLE = Object.freeze({
    maxSparks: 4000,
    maxBursts: 240,
    maxGlints: 500,
    maxFlares: 48,
    white: "#ffffff",
    cyan: "#37e9ff",
    yellow: "#ffd23f",
    orange: "#ff7a3d",
    magenta: "#ff4fd8",
    green: "#72ff68",
    violet: "#8d72ff"
  });

  const FEVER_STYLE = Object.freeze({
    itemScale: 1.5
  });

  const COMBO_FX = Object.freeze({
    mediumCombo: 9,
    highCombo: 19,
    maxCombo: 26,
    lowIntensity: 0.5,
    mediumIntensity: 0.65,
    highIntensity: 0.8,
    maxIntensity: 1,
    spreadByType: Object.freeze({
      normal: Object.freeze([0.85, 0.9, 0.95, 1]),
      rare: Object.freeze([0.55, 0.70, 0.85, 1]),
      heavy: Object.freeze([0.5, 0.6, 0.80, 1])
    })
  });

  const COMBO_MULT_TIERS = Object.freeze([
    Object.freeze({ minCombo: 50, multIncrease: 5, bonus: 15000 }),
    Object.freeze({ minCombo: 40, multIncrease: 4, bonus: 8000 }),
    Object.freeze({ minCombo: 30, multIncrease: 3, bonus: 5000 }),
    Object.freeze({ minCombo: 20, multIncrease: 2, bonus: 2500 }),
    Object.freeze({ minCombo: 10, multIncrease: 1, bonus: 1000 })
  ]);

  const SCORE_STORAGE = Object.freeze({
    key: "fireworksPinball.top5.v1",
    maxComboKey: "fireworksPinball.maxCombo.v1",
    limit: 5
  });

  const RESULT_LAYOUT = Object.freeze({
    bravoY: 220,
    scoreY: 298,
    maxComboY: 332,
    highScoreY: 368,
    topScoresY: 410,
    bestComboY: 612,
    retryY: 670
  });

  // Outline geometry from title.svg, in its original 800 x 800 coordinates.
  // Change these colors without editing the SVG or its letter shapes.
  const TITLE_STYLE = Object.freeze({
    background: "#000000",
    nightColor: "#ff4fd8",
    bloomColor: "#12ffd4",
    pinballColor: "#ffd23f",
    signatureColor: "#ffffff",
    glowColor: "#ff4fd8",
    glowBlur: 5,
    lineWidth: 1.5
  });

  const TITLE_LAYOUT = Object.freeze({
    topScoresY: 450,
    bestComboY: 652,
    startY: 710
  });

  const TITLE_PATHS = Object.freeze([
    Object.freeze([
      new Path2D("M235.4,182.8 L248,182.8 L248,178 L235.4,176.4 L235.4,143.3 L235.4,116.9 L282.7,183.6 L286.9,183.6 L286.9,110.1 L296.9,108.5 L296.9,103.7 L286.9,103.7 L280.8,103.7 L268.4,103.7 L268.4,108.5 L280.8,110.1 L280.8,143.3 L280.8,162.5 L239.5,103.7 L219.9,103.7 L219.9,108.5 L229.5,109.4 L229.5,176.6 L219.4,178 L219.4,182.8 L229.5,182.8 L235.4,182.8 Z"),
      new Path2D("M316.3,103.7h-10.8v4.8l11,1.3c0,2,0,4.1,0,6v54.9c0,2,0,4,0,5.9l-11,1.3v4.8h33.5v-4.8l-10.9-1.3c0-2,0-4.1,0-6.1,0-4.1,0-8.2,0-12.2v-30.3c0-4.1,0-8.2,0-12.3,0-2,0-4,0-5.9l10.9-1.3v-4.8h-22.7,0Z"),
      new Path2D("M401.3,145.2h-12.1v4.8l12.3,1c0,2.6,0,5.2.2,7.8v17.3c-1.2.4-2.4.8-3.5,1.2-2.7.8-5.8,1.2-9.2,1.2-5.9,0-11.1-1.4-15.5-4.2-4.3-2.7-7.7-6.8-10.1-12-2.4-5.3-3.6-11.6-3.6-19.2s1.3-14,3.7-19.3,5.9-9.3,10.2-12.1c4.3-2.7,9.2-4.2,14.6-4.2s7.2.7,10.5,2c1,.4,2,.8,3,1.4l2.4,13.5h7.3l-.5-17.2c-2.2-1.3-4.5-2.3-7-3.1-2.5-.8-5-1.4-7.8-1.9-2.7-.4-5.8-.6-9-.6-5.9,0-11.5,1-16.4,3.1-4.9,2-9.2,4.9-12.7,8.7s-6.3,8.2-8.2,13.2c-2,5-2.9,10.5-2.9,16.4s.9,11.5,2.8,16.6c1.9,5,4.6,9.4,8.2,13.1,3.6,3.7,7.7,6.5,12.7,8.7,4.8,2,10.3,3.1,16.2,3.1s9.4-.6,13.6-1.9,8.3-3,12.4-5.1v-5.2c0-4.7,0-9.3,0-13.8,0-2.7,0-5.4.2-8l7.2-.7v-4.8h-18.9v.2Z"),
      new Path2D("M508.7,178l-10.9-1.3c0-2,0-4.1,0-6.1,0-4.1,0-8.2,0-12.2v-30.3c0-4.1,0-8.2,0-12.3,0-2,0-4,0-5.9l10.9-1.3v-4.8h-33.3v4.8l11,1.3c0,2,0,4.1,0,6v23.8h-38.1v-11.6c0-4.1,0-8.2,0-12.3,0-2,0-4,0-5.9l10.8-1.2v-4.8h-33.3v4.8l11,1.3c0,2,0,4.1,0,6v54.9c0,2,0,4,0,5.9l-11,1.3v4.8h33.3v-4.8l-10.8-1.2c0-2.1,0-4.2,0-6.3,0-4.2,0-8.4,0-12.7v-12.6h38.1v25.5c0,2,0,4.1,0,6l-11,1.3v4.8h33.3v-4.8h0Z"),
      new Path2D("M525.7,109.5h18.1c0,2,0,4.2,0,6.3v54.9c0,2,0,3.9,0,5.9l-12.1,1.3v4.8h35.7v-4.8l-12.1-1.3c0-2,0-4.1,0-6.1,0-4.1,0-8.2,0-12.2v-30.3c0-4.1,0-8.2,0-12.3,0-2,0-4.1,0-6.1h18l2.6,15.1h6.9l-.9-21.1h-64.7l-.9,21.1h6.9l2.6-15.1h0Z"),
    ]),
    Object.freeze([
      new Path2D("M252.1,249.8c-3-1.4-6.6-2.5-11-3.1,3.6-.7,6.5-1.8,8.8-3.1,3.2-1.9,5.6-4.2,7-6.9,1.5-2.7,2.2-5.6,2.2-8.7s-1-7.1-3-10c-2-2.9-4.9-5.2-8.7-6.8s-8.5-2.5-14-2.5h-34.2v4.8l11,1.3c0,2,0,4.1,0,6v54.9c0,2,0,4,0,5.9l-11,1.3v4.8h32.5c5.7,0,10.5-.6,14.5-1.9,4-1.2,7.3-2.9,9.8-4.9,2.5-2.1,4.3-4.4,5.5-7s1.8-5.2,1.8-7.8-.9-6.6-2.7-9.4c-1.8-2.8-4.6-5.2-8.4-7h0ZM230,214.1c4,0,7.4.5,10.1,1.4s4.8,2.5,6.1,4.6c1.4,2.1,2,5,2,8.7s-.7,6.5-2.1,8.7c-1.4,2.3-3.7,4-6.6,5.1s-6.9,1.6-11.7,1.6h-6.1v-11.2c0-4.1,0-8.2,0-12.3,0-2.2,0-4.4.2-6.6h8.2,0ZM245.9,278.1c-3.7,2.7-9.3,4.2-16.9,4.2h-7.2c0-2.2,0-4.5-.2-6.7,0-4.1,0-8.3,0-12.7v-13.2h6.5c8.2,0,14.1,1.4,17.8,4.2,3.7,2.7,5.5,6.9,5.5,12.4s-1.9,9.2-5.5,11.9h0Z"),
      new Path2D("M320.1,282h-26.8c0-2,0-4.1,0-6.1,0-4,0-7.8,0-11.6v-31.1c0-4.1,0-8.2,0-12.3,0-2,0-4.1,0-6.1l10.9-1.3v-4.8h-33.5v4.8l11,1.3c0,2,0,4,0,5.9v54.9c0,2,0,4.1,0,6.1l-11,1.3v4.8h58.9l1.2-22.3h-7.2l-3.4,16.3v.2Z"),
      new Path2D("M400.2,217.5c-3.4-3.5-7.3-6.1-11.6-7.9-4.3-1.8-8.7-2.6-13.2-2.6s-9,.9-13.3,2.8c-4.3,1.9-8.2,4.6-11.6,8.2s-6.2,7.9-8.2,13c-2,5.1-3.1,10.9-3.1,17.3s1,12.7,3,17.9c2,5.2,4.8,9.5,8.2,12.9,3.5,3.5,7.4,6.1,11.7,7.9,4.3,1.8,8.7,2.6,13.3,2.6s9-.9,13.3-2.8c4.3-1.9,8.2-4.6,11.6-8.2s6.1-7.9,8.2-13.1c2-5.1,3-10.9,3-17.3s-1-12.7-3.1-17.8-4.8-9.4-8.2-12.9h0ZM397.2,261.3c-.8,4.2-2.2,8-4.1,11.4-1.9,3.3-4.2,6-7.2,8.1s-6.5,3-10.5,3-7.6-1-10.5-3c-3-2-5.4-4.7-7.3-8.1-1.9-3.3-3.3-7.1-4.2-11.4-.9-4.2-1.4-8.6-1.4-13.1s.4-8.7,1.4-12.9c.9-4.2,2.3-8,4.2-11.4,1.9-3.4,4.3-6.1,7.3-8.1,3-2,6.5-3,10.5-3s7.6,1,10.5,3c3,2,5.4,4.7,7.2,8.1s3.2,7.2,4.1,11.4c.8,4.2,1.3,8.5,1.3,12.9s-.4,8.8-1.3,13.1Z"),
      new Path2D("M484.9,217.5c-3.4-3.5-7.3-6.1-11.6-7.9-4.3-1.8-8.7-2.6-13.2-2.6s-9,.9-13.3,2.8c-4.3,1.9-8.2,4.6-11.6,8.2s-6.2,7.9-8.2,13c-2,5.1-3.1,10.9-3.1,17.3s1,12.7,3,17.9c2,5.2,4.8,9.5,8.2,12.9,3.5,3.5,7.4,6.1,11.7,7.9,4.3,1.8,8.7,2.6,13.3,2.6s9-.9,13.3-2.8c4.3-1.9,8.2-4.6,11.6-8.2s6.1-7.9,8.2-13.1c2-5.1,3-10.9,3-17.3s-1-12.7-3.1-17.8-4.8-9.4-8.2-12.9h0ZM481.9,261.3c-.8,4.2-2.2,8-4.1,11.4-1.9,3.3-4.2,6-7.2,8.1s-6.5,3-10.5,3-7.6-1-10.5-3c-3-2-5.4-4.7-7.3-8.1-1.9-3.3-3.3-7.1-4.2-11.4-.9-4.2-1.4-8.6-1.4-13.1s.4-8.7,1.4-12.9c.9-4.2,2.3-8,4.2-11.4,1.9-3.4,4.3-6.1,7.3-8.1,3-2,6.5-3,10.5-3s7.6,1,10.5,3c3,2,5.4,4.7,7.2,8.1s3.2,7.2,4.1,11.4c.8,4.2,1.3,8.5,1.3,12.9s-.4,8.8-1.3,13.1Z"),
      new Path2D("M589.5,245.4v-12.4c0-4.1,0-8.2,0-12.3,0-2,0-4,0-5.9l10.9-1.3v-4.8h-23.3l-25.1,65.1-26.4-65.1h-20.6v4.8l9.4,1.3v66.7l-10.6,1.5v4.8h26.5v-4.8l-9.7-1.4v-37.3l-.7-23,27,66.6h5.9l25.6-66.6v54.5c0,2,0,4,0,5.9l-10,1.3v4.8h32.1v-4.8l-10.9-1.3c0-2,0-4.1,0-6.1,0-4.1,0-8.2,0-12.2v-17.9h0Z")
    ]),
    Object.freeze([
      new Path2D("M422.1,311h-27.8l-11.1,89.2h27.8c12.3,0,23.5-10,25.1-22.3l.7-5.8c.8-6.5-1.3-12.4-5.2-16.5,5-4.1,8.5-9.9,9.3-16.5l.7-5.8c1.5-12.3-7.2-22.3-19.5-22.3ZM429.9,333.3l-.7,5.8c-.7,5.8-6.1,10.6-11.9,10.6h-7.7l-1.5,11.7h7.7c5.8,0,10,4.8,9.3,10.6l-.7,5.8c-.7,5.8-6.1,10.6-11.9,10.6h-16.1l8.2-65.8h16.1c5.8,0,10,4.8,9.3,10.6Z"),
      new Path2D("M484.6,311h-5.5c-12.3,0-23.5,10-25.1,22.3l-8.3,66.9h11.7l8.3-66.9c.7-5.8,6.1-10.6,11.9-10.6h5.5c5.8,0,10,4.8,9.3,10.6l-2.2,17.7c-2.9-1.7-6.4-2.7-10.3-2.7h-7.7l-1.5,11.7h7.7c5.8,0,10,4.8,9.3,10.6v.5c0,0-3.7,29.1-3.7,29.1h11.7l3.1-25.2h0l.5-3.9,4.7-37.8c1.5-12.3-7.2-22.3-19.5-22.3Z"),
      new Path2D("M284.5,400.2 L296.2,400.2 L307.3,311 L295.6,311 Z"),
      new Path2D("M522.7,377.8l8.3-66.8h-11.7l-8.3,66.8c-1.5,12.3,7.2,22.3,19.5,22.3h7.7l1.5-11.7h-7.7c-5.8,0-10-4.8-9.3-10.6Z"),
      new Path2D("M569.2,388.4c-5.8,0-10-4.8-9.3-10.6l8.3-66.8h-11.7l-8.3,66.8c-1.5,12.3,7.2,22.3,19.5,22.3h7.7l1.5-11.7h-7.7Z"),
      new Path2D("M360.2,382.3c-.4,3.4-3.6,6.2-7,6.2s-5.9-2.8-5.4-6.2l6.7-53.4c1.2-9.9-5.8-17.9-15.7-17.9s-18.9,8-20.1,17.9l-8.9,71.3h11.7l8.9-71.3c.4-3.4,3.6-6.2,7-6.2s5.9,2.8,5.4,6.2l-6.7,53.4c-1.2,9.9,5.8,17.9,15.7,17.9s18.9-8,20.1-17.9l8.9-71.3h-11.7l-8.9,71.3Z"),
      new Path2D("M262,311h-27.8l-11.1,89.2h11.7l9.7-77.5h16.1c5.8,0,10,4.8,9.3,10.6l-.5,4.4c-.7,5.8-6.1,10.6-11.9,10.6h-7.1l-1.5,11.7h7.1c12.3,0,23.5-10,25.1-22.3l.5-4.4c1.5-12.3-7.2-22.3-19.5-22.3Z")
    ])
  ]);

  const GRID_STYLE = Object.freeze({
    spacing: 36,
    offsetX: 4,
    offsetY: 4,
    visibilityRadius: 235,
    color: "#756cff",
    lineWidth: 0.75,
    baseAlpha: 0.08,
    highlightAlpha: 0.72,
    maxImpulses: 12
  });

  // Centers and radius are taken directly from misc/bumpers.svg.
  const BUMPER_RADIUS = 42;
  const LEFT_BUMPER_POSITIONS = Object.freeze([
    Object.freeze([20, 250]),
    Object.freeze([180, 130]),
    Object.freeze([260, 360]),
    Object.freeze([20, 460])
  ]);

  const OUTER_WALL_SEGMENTS = Object.freeze([
    [20, 20, 780, 20],
    [20, 20, 20, 665],
    [780, 20, 780, 665]
  ]);

  // RCP3D's authored right-flipper collision shape expressed as
  // [distance along the root-to-tip axis, normal offset]. The axial value is
  // normalized, so the shape follows future root/tip position changes.
  const FLIPPER_COLLISION_PROFILE = Object.freeze([
    [0.01639, 18.96],
    [1.00836, 9.951],
    [1.07674, 6.509],
    [1.09952, -0.836],
    [1.06372, -7.637],
    [0.99164, -9.951],
    [-0.01689, -18.873],
    [-0.14545, -12.208],
    [-0.1896, 1.639],
    [-0.12208, 14.545]
  ]);

  function makeFlipperCollision(root, tip, isLeft) {
    const dx = tip[0] - root[0];
    const dy = tip[1] - root[1];
    const length = Math.hypot(dx, dy);
    const ux = dx / length;
    const uy = dy / length;
    const nx = isLeft ? uy : -uy;
    const ny = isLeft ? -ux : ux;
    return FLIPPER_COLLISION_PROFILE.map(([ratio, offset]) => [
      root[0] + ux * length * ratio + nx * offset,
      root[1] + uy * length * ratio + ny * offset
    ]);
  }

  function mirrorPoints(points) {
    return points.map(([x, y]) => [WIDTH - x, y]);
  }

  function polygonSegments(points) {
    return points.map((point, index) => {
      const next = points[(index + 1) % points.length];
      return [point[0], point[1], next[0], next[1]];
    });
  }

  const rightFlipperDefinition = {
    root: [530, 727],
    tip: [444, 747],
    upAngle: 205,
    rootRadius: 18,
    tipRadius: 10,
    isLeft: false
  };
  rightFlipperDefinition.collision = makeFlipperCollision(
    rightFlipperDefinition.root,
    rightFlipperDefinition.tip,
    false
  );

  const leftFlipperDefinition = {
    root: [270, 727],
    tip: [356, 747],
    upAngle: -25,
    rootRadius: 18,
    tipRadius: 10,
    isLeft: true
  };
  leftFlipperDefinition.collision = makeFlipperCollision(
    leftFlipperDefinition.root,
    leftFlipperDefinition.tip,
    true
  );

  const FLIPPER_DEFINITIONS = [leftFlipperDefinition, rightFlipperDefinition];
  const rightDrainWall = [
    rightFlipperDefinition.collision[6],
    rightFlipperDefinition.collision[0],
    [780, 620],
    [780, 665]
  ];
  const DRAIN_WALLS = Object.freeze([
    mirrorPoints(rightDrainWall),
    rightDrainWall
  ]);
  const DRAIN_WALL_SEGMENTS = Object.freeze(DRAIN_WALLS.flatMap(polygonSegments));

  const ball = { x: 630, y: 400, vx: 0, vy: 0 };
  const activeTrail = [];
  const fadingTrails = [];
  const fallingItems = [];
  const fireworkSparks = [];
  const fireworkBursts = [];
  const fireworkGlints = [];
  const fireworkFlares = [];
  const gridImpulses = [];
  const bumpers = [];
  let trailActive = false;
  let trailRecording = false;
  let passiveReflectionCount = 0;
  let currentCombo = 0;
  let roundMaxCombo = 0;
  let score = 0;
  let mult = 1;
  let topScores = loadTopScores();
  let bestCombo = loadBestCombo();
  let resultRank = -1;
  let resultIsHighScore = false;
  let comboNotice = null;
  let itemSpawnClock = 0;
  let ballSpawnTimer = 0;
  let screenFlash = 0;
  let screenShake = 0;
  let shakeOffsetX = 0;
  let shakeOffsetY = 0;
  let roundTimeRemaining = ROUND_TIMING.durationSeconds;
  let roundOver = false;
  let roundElapsedSeconds = 0;
  let roundClockStartedAt = null;

  function roundElapsedTime() {
    return roundElapsedSeconds + (roundClockStartedAt === null
      ? 0 : Math.max(0, performance.now() - roundClockStartedAt) / 1000);
  }

  function pauseRoundClock() {
    if (roundClockStartedAt === null) return;
    roundElapsedSeconds = Math.min(ROUND_TIMING.durationSeconds, roundElapsedTime());
    roundClockStartedAt = null;
    roundTimeRemaining = Math.max(0, ROUND_TIMING.durationSeconds - roundElapsedSeconds);
  }

  function resumeRoundClock() {
    if (!roundOver && roundClockStartedAt === null) roundClockStartedAt = performance.now();
  }

  class Flipper {
    constructor({ root, tip, upAngle, rootRadius, tipRadius, collision, isLeft }) {
      this.x = root[0];
      this.y = root[1];
      this.length = Math.hypot(tip[0] - root[0], tip[1] - root[1]);
      this.restAngle = Math.atan2(tip[1] - root[1], tip[0] - root[0]);
      this.upAngle = toRadians(upAngle);
      this.isLeft = isLeft;
      this.rootRadius = rootRadius;
      this.tipRadius = tipRadius;
      this.collisionLocal = collision.map(([x, y]) => [x - this.x, y - this.y]);
      this.upSpeed = isLeft ? -0.36 : 0.36;
      this.downSpeed = isLeft ? 0.28 : -0.28;
      this.angle = this.restAngle;
      this.isUp = false;
      this.currentOmega = 0;
    }

    reset() {
      this.angle = this.restAngle;
      this.isUp = false;
      this.currentOmega = 0;
    }

    update(step) {
      const previousAngle = this.angle;
      this.angle += (this.isUp ? this.upSpeed : this.downSpeed) * step;

      if (this.isLeft) {
        this.angle = clamp(this.angle, this.upAngle, this.restAngle);
      } else {
        this.angle = clamp(this.angle, this.restAngle, this.upAngle);
      }

      this.currentOmega = (this.angle - previousAngle) / step;
    }

    tip() {
      return {
        x: this.x + Math.cos(this.angle) * this.length,
        y: this.y + Math.sin(this.angle) * this.length
      };
    }

    collisionPoints() {
      const delta = this.angle - this.restAngle;
      const cosine = Math.cos(delta);
      const sine = Math.sin(delta);
      return this.collisionLocal.map(([x, y]) => [
        this.x + x * cosine - y * sine,
        this.y + x * sine + y * cosine
      ]);
    }

    contactRatio(x, y) {
      const tip = this.tip();
      const axisX = tip.x - this.x;
      const axisY = tip.y - this.y;
      return clamp(
        ((x - this.x) * axisX + (y - this.y) * axisY) / (this.length * this.length),
        0,
        1
      );
    }
  }

  const flippers = FLIPPER_DEFINITIONS.map(definition => new Flipper(definition));

  function clearTrails() {
    activeTrail.length = 0;
    fadingTrails.length = 0;
    trailActive = false;
    trailRecording = false;
    passiveReflectionCount = 0;
    currentCombo = 0;
  }

  function startTrail() {
    activeTrail.length = 0;
    activeTrail.push([ball.x, ball.y]);
    trailActive = true;
    trailRecording = true;
    passiveReflectionCount = 0;
    currentCombo = 0;
  }

  function settleCombo() {
    const combo = currentCombo;
    const tier = COMBO_MULT_TIERS.find(({ minCombo }) => combo >= minCombo);
    if (tier) {
      mult += tier.multIncrease;
      score += tier.bonus;
      comboNotice = { combo, bonus: tier.bonus, life: 75, maxLife: 75 };
    }
    currentCombo = 0;
  }

  function endTrail() {
    if (!trailActive) return;

    if (activeTrail.length >= 2) {
      fadingTrails.push({
        points: activeTrail.slice(),
        life: TRAIL_STYLE.fadeFrames
      });
    }
    settleCombo();
    activeTrail.length = 0;
    trailActive = false;
    trailRecording = false;
    passiveReflectionCount = 0;
  }

  function replaceTrail() {
    endTrail();
    startTrail();
  }

  function registerPassiveReflection() {
    if (!trailActive || passiveReflectionCount >= 2) return;
    passiveReflectionCount += 1;
    if (passiveReflectionCount >= 2) trailRecording = false;
  }

  function updateFadingTrails() {
    for (let index = fadingTrails.length - 1; index >= 0; index -= 1) {
      fadingTrails[index].life -= 1;
      if (fadingTrails[index].life <= 0) fadingTrails.splice(index, 1);
    }
    if (comboNotice) {
      comboNotice.life -= 1;
      if (comboNotice.life <= 0) comboNotice = null;
    }
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function comboFxTier() {
    if (currentCombo >= COMBO_FX.maxCombo) return 3;
    if (currentCombo >= COMBO_FX.highCombo) return 2;
    if (currentCombo >= COMBO_FX.mediumCombo) return 1;
    return 0;
  }

  function comboFxIntensity(tier) {
    return [
      COMBO_FX.lowIntensity,
      COMBO_FX.mediumIntensity,
      COMBO_FX.highIntensity,
      COMBO_FX.maxIntensity
    ][tier];
  }

  function comboFxSpread(type, tier) {
    return COMBO_FX.spreadByType[type][tier];
  }

  function scaledFxCount(count, intensity) {
    return Math.max(1, Math.round(count * intensity));
  }

  function randomBumperPosition() {
    return LEFT_BUMPER_POSITIONS[
      Math.floor(Math.random() * LEFT_BUMPER_POSITIONS.length)
    ];
  }

  function makeBumper(x, y, direction) {
    return {
      x,
      y,
      radius: BUMPER_RADIUS,
      direction,
      angle: randomRange(0, Math.PI * 2),
      pulse: 0,
      hitCooldown: 0
    };
  }

  function resetBumpers() {
    const left = randomBumperPosition();
    const rightSource = randomBumperPosition();
    bumpers.length = 0;
    bumpers.push(
      makeBumper(left[0], left[1], 1),
      makeBumper(WIDTH - rightSource[0], rightSource[1], -1)
    );
  }

  function updateBumpers() {
    for (const bumper of bumpers) {
      bumper.angle += 0.008 * bumper.direction;
      bumper.pulse *= 0.84;
      if (bumper.pulse < 0.01) bumper.pulse = 0;
      if (bumper.hitCooldown > 0) bumper.hitCooldown -= 1;
    }
  }

  function trimEffectPool(pool, maximum) {
    const excess = pool.length - maximum;
    if (excess > 0) pool.splice(0, excess);
  }

  function addFireworkSpark({
    x, y, angle, speed, color, life, length, gravity = 0.02,
    drag = 0.965, delay = 0, width = 1
  }) {
    fireworkSparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life,
      maxLife: life,
      length,
      gravity,
      drag,
      delay,
      width
    });
  }

  function emitRadialSparks({
    x, y, count, colors, minSpeed, maxSpeed, minLife, maxLife,
    minLength, maxLength, gravity = 0.02, delay = 0, width = 1,
    angleOffset = Math.random() * Math.PI * 2
  }) {
    for (let index = 0; index < count; index += 1) {
      const angle = angleOffset
        + index / count * Math.PI * 2
        + randomRange(-0.075, 0.075);
      addFireworkSpark({
        x,
        y,
        angle,
        speed: randomRange(minSpeed, maxSpeed),
        color: colors[index % colors.length],
        life: Math.round(randomRange(minLife, maxLife)),
        length: randomRange(minLength, maxLength),
        gravity,
        drag: randomRange(0.955, 0.978),
        delay: delay + Math.floor(randomRange(0, 3)),
        width
      });
    }
  }

  function addFireworkBurst({
    x, y, color, kind = "polygon", sides = 8, radius = 2,
    growth = 2, life = 24, rotation = 0, spin = 0.025,
    innerRatio = 0.42, delay = 0, lineWidth = 1
  }) {
    fireworkBursts.push({
      x,
      y,
      color,
      kind,
      sides,
      radius,
      growth,
      life,
      maxLife: life,
      rotation,
      spin,
      innerRatio,
      delay,
      lineWidth
    });
  }

  function addFireworkGlint({
    x, y, color, radius, life, arms = 4, rotation = 0,
    spin = 0.04, delay = 0
  }) {
    fireworkGlints.push({
      x,
      y,
      color,
      radius,
      life,
      maxLife: life,
      arms,
      rotation,
      spin,
      delay
    });
  }

  function addFireworkFlare({
    x, y, color, radius = 8, growth = 3, life = 30,
    intensity = 0.3, delay = 0
  }) {
    fireworkFlares.push({
      x,
      y,
      color,
      radius,
      growth,
      life,
      maxLife: life,
      intensity,
      delay
    });
  }

  function emitNormalFirework(item, intensity, spread) {
    const colors = [item.color, FIREWORK_STYLE.white, FIREWORK_STYLE.cyan];
    emitRadialSparks({
      x: item.x,
      y: item.y,
      count: scaledFxCount(18, intensity),
      colors,
      minSpeed: 2.2 * spread,
      maxSpeed: 6.2 * spread,
      minLife: 28,
      maxLife: 46,
      minLength: 5,
      maxLength: 15,
      gravity: 0.014
    });
    addFireworkBurst({
      x: item.x,
      y: item.y,
      color: item.color,
      kind: "star",
      sides: 4,
      growth: 1.8 * spread,
      life: 22,
      rotation: item.angle
    });
    if (intensity >= COMBO_FX.highIntensity) {
      addFireworkBurst({
        x: item.x,
        y: item.y,
        color: FIREWORK_STYLE.white,
        kind: "spokes",
        sides: 6,
        growth: 2.1 * spread,
        life: 18,
        rotation: item.angle + Math.PI / 6,
        delay: 3
      });
    }
    addFireworkGlint({
      x: item.x,
      y: item.y,
      color: FIREWORK_STYLE.white,
      radius: 16,
      life: 24,
      rotation: item.angle
    });
    addFireworkFlare({
      x: item.x,
      y: item.y,
      color: item.color,
      radius: 8,
      growth: 2.4 * spread,
      life: 26,
      intensity: 0.22 * intensity
    });
    screenFlash = Math.max(screenFlash, 0.06 * intensity);
    screenShake = Math.max(screenShake, 1.1 * intensity);
  }

  function emitRareFirework(item, intensity, spread) {
    const colors = [
      item.color,
      FIREWORK_STYLE.white,
      FIREWORK_STYLE.orange,
      FIREWORK_STYLE.cyan,
      FIREWORK_STYLE.magenta
    ];
    emitRadialSparks({
      x: item.x,
      y: item.y,
      count: scaledFxCount(96, intensity),
      colors,
      minSpeed: 3 * spread,
      maxSpeed: 11.5 * spread,
      minLife: 48,
      maxLife: 86,
      minLength: 8,
      maxLength: 25,
      gravity: 0.02,
      width: 1.15
    });
    addFireworkBurst({
      x: item.x,
      y: item.y,
      color: item.color,
      sides: 16,
      growth: 3.1 * spread,
      life: 42,
      rotation: item.angle,
      spin: 0.035
    });
    addFireworkBurst({
      x: item.x,
      y: item.y,
      color: FIREWORK_STYLE.white,
      kind: "spokes",
      sides: 18,
      growth: 3.8 * spread,
      life: 36,
      rotation: item.angle + Math.PI / 12,
      spin: -0.025,
      delay: 3
    });
    addFireworkBurst({
      x: item.x,
      y: item.y,
      color: FIREWORK_STYLE.orange,
      kind: "star",
      sides: 10,
      growth: 2.8 * spread,
      life: 40,
      rotation: item.angle,
      spin: -0.04,
      delay: 6
    });
    if (intensity >= COMBO_FX.highIntensity) {
      addFireworkBurst({
        x: item.x,
        y: item.y,
        color: FIREWORK_STYLE.magenta,
        kind: "polygon",
        sides: 7,
        growth: 4.2 * spread,
        life: 36,
        rotation: item.angle + 0.3,
        spin: 0.028,
        delay: 11,
        lineWidth: 1.3
      });
    }
    if (intensity >= COMBO_FX.maxIntensity) {
      addFireworkBurst({
        x: item.x,
        y: item.y,
        color: FIREWORK_STYLE.cyan,
        kind: "star",
        sides: 14,
        growth: 3.4 * spread,
        life: 44,
        rotation: item.angle,
        spin: -0.02,
        delay: 16
      });
    }

    const satelliteCount = scaledFxCount(4, intensity);
    for (let satellite = 0; satellite < satelliteCount; satellite += 1) {
      const angle = satellite / satelliteCount * Math.PI * 2 + item.angle;
      const distance = randomRange(24, 48) * spread;
      const x = item.x + Math.cos(angle) * distance;
      const y = item.y + Math.sin(angle) * distance;
      const delay = 6 + satellite * 3;
      emitRadialSparks({
        x,
        y,
        count: 16,
        colors: [colors[satellite % colors.length], FIREWORK_STYLE.white],
        minSpeed: 1.8 * spread,
        maxSpeed: 6.2 * spread,
        minLife: 30,
        maxLife: 58,
        minLength: 6,
        maxLength: 17,
        gravity: 0.016,
        delay
      });
      addFireworkFlare({
        x,
        y,
        color: colors[satellite % colors.length],
        radius: 7,
        growth: 3.5 * spread,
        life: 34,
        intensity: 0.2 * intensity,
        delay
      });
    }

    const glintCount = scaledFxCount(18, intensity);
    for (let index = 0; index < glintCount; index += 1) {
      const angle = index / glintCount * Math.PI * 2 + item.angle;
      const distance = randomRange(16, 72) * spread;
      addFireworkGlint({
        x: item.x + Math.cos(angle) * distance,
        y: item.y + Math.sin(angle) * distance,
        color: colors[index % colors.length],
        radius: randomRange(10, 24),
        life: Math.round(randomRange(28, 48)),
        rotation: angle,
        delay: Math.floor(randomRange(2, 20))
      });
    }
    addFireworkFlare({
      x: item.x,
      y: item.y,
      color: item.color,
      radius: 16,
      growth: 4.5 * spread,
      life: 48,
      intensity: 0.38 * intensity
    });
    addFireworkFlare({
      x: item.x,
      y: item.y,
      color: FIREWORK_STYLE.white,
      radius: 5,
      growth: 3.2 * spread,
      life: 24,
      intensity: 0.32 * intensity
    });
    screenFlash = Math.max(screenFlash, 0.3 * intensity);
    screenShake = Math.max(screenShake, 5 * intensity);
  }

  function emitHeavyFirework(item, intensity, spread) {
    const colors = [
      item.color,
      FIREWORK_STYLE.cyan,
      FIREWORK_STYLE.yellow,
      FIREWORK_STYLE.green,
      FIREWORK_STYLE.violet,
      FIREWORK_STYLE.white
    ];
    emitRadialSparks({
      x: item.x,
      y: item.y,
      count: scaledFxCount(260, intensity),
      colors,
      minSpeed: 3.8 * spread,
      maxSpeed: 14.5 * spread,
      minLife: 66,
      maxLife: 126,
      minLength: 10,
      maxLength: 32,
      gravity: 0.014,
      width: 1.4
    });

    const burstDefinitions = [
      ["polygon", 24, item.color, 4.2, 58, 0, 0.028],
      ["spokes", 36, FIREWORK_STYLE.white, 5.2, 50, 2, -0.02],
      ["star", 16, FIREWORK_STYLE.cyan, 4.3, 64, 7, 0.035],
      ["polygon", 12, FIREWORK_STYLE.yellow, 6.2, 52, 12, -0.03],
      ["star", 20, FIREWORK_STYLE.magenta, 4.8, 68, 17, 0.022],
      ["spokes", 48, FIREWORK_STYLE.green, 5.8, 54, 23, 0.016],
      ["polygon", 18, FIREWORK_STYLE.violet, 6.8, 60, 30, -0.018]
    ];
    const burstCount = scaledFxCount(burstDefinitions.length, intensity);
    for (const [kind, sides, color, growth, life, delay, spin]
      of burstDefinitions.slice(0, burstCount)) {
      addFireworkBurst({
        x: item.x,
        y: item.y,
        color,
        kind,
        sides,
        growth: growth * spread,
        life,
        rotation: item.angle + delay * 0.07,
        spin,
        delay,
        lineWidth: kind === "spokes" ? 1.15 : 1.6
      });
    }

    const satelliteCount = scaledFxCount(12, intensity);
    for (let satellite = 0; satellite < satelliteCount; satellite += 1) {
      const angle = satellite / satelliteCount * Math.PI * 2 + item.angle;
      const distance = randomRange(48, 118) * spread;
      const x = item.x + Math.cos(angle) * distance;
      const y = item.y + Math.sin(angle) * distance;
      const delay = 7 + satellite % 6 * 4;
      emitRadialSparks({
        x,
        y,
        count: 24,
        colors: [colors[satellite % colors.length], FIREWORK_STYLE.white],
        minSpeed: 2.2 * spread,
        maxSpeed: 8.2 * spread,
        minLife: 42,
        maxLife: 78,
        minLength: 7,
        maxLength: 21,
        gravity: 0.016,
        delay
      });
      addFireworkGlint({
        x,
        y,
        color: colors[satellite % colors.length],
        radius: randomRange(18, 34),
        life: 48,
        arms: satellite % 2 === 0 ? 4 : 6,
        rotation: angle,
        spin: satellite % 2 === 0 ? 0.055 : -0.055,
        delay
      });
      addFireworkBurst({
        x,
        y,
        color: colors[satellite % colors.length],
        kind: satellite % 2 === 0 ? "star" : "spokes",
        sides: satellite % 2 === 0 ? 7 : 12,
        growth: randomRange(2.4, 4.4) * spread,
        life: Math.round(randomRange(34, 54)),
        rotation: angle,
        spin: satellite % 2 === 0 ? 0.04 : -0.04,
        delay
      });
      addFireworkFlare({
        x,
        y,
        color: colors[satellite % colors.length],
        radius: 9,
        growth: 4.8 * spread,
        life: 46,
        intensity: 0.3 * intensity,
        delay
      });
    }

    const glintCount = scaledFxCount(36, intensity);
    for (let index = 0; index < glintCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = randomRange(20, 180) * spread;
      addFireworkGlint({
        x: item.x + Math.cos(angle) * distance,
        y: item.y + Math.sin(angle) * distance,
        color: colors[index % colors.length],
        radius: randomRange(10, 30),
        life: Math.round(randomRange(34, 68)),
        rotation: angle,
        delay: Math.floor(randomRange(0, 44))
      });
    }

    addFireworkFlare({
      x: item.x,
      y: item.y,
      color: item.color,
      radius: 34,
      growth: 8 * spread,
      life: 82,
      intensity: 0.65 * intensity
    });
    addFireworkFlare({
      x: item.x,
      y: item.y,
      color: FIREWORK_STYLE.white,
      radius: 12,
      growth: 5.5 * spread,
      life: 46,
      intensity: 0.72 * intensity
    });
    addFireworkFlare({
      x: item.x,
      y: item.y,
      color: FIREWORK_STYLE.yellow,
      radius: 20,
      growth: 6.5 * spread,
      life: 68,
      intensity: 0.42 * intensity,
      delay: 12
    });
    screenFlash = Math.max(screenFlash, intensity);
    screenShake = Math.max(screenShake, 13 * intensity);
  }

  function emitCollectionFirework(item) {
    const tier = comboFxTier();
    const intensity = comboFxIntensity(tier);
    const spread = comboFxSpread(item.type, tier);
    if (item.type === "normal") {
      normalItemAudio.play(tier);
      emitNormalFirework(item, intensity, spread);
    }
    else if (item.type === "rare") {
      rareItemAudio.play(tier);
      emitRareFirework(item, intensity, spread);
    }
    else {
      heavyItemAudio.play(tier);
      emitHeavyFirework(item, intensity, spread);
    }

    trimEffectPool(fireworkSparks, FIREWORK_STYLE.maxSparks);
    trimEffectPool(fireworkBursts, FIREWORK_STYLE.maxBursts);
    trimEffectPool(fireworkGlints, FIREWORK_STYLE.maxGlints);
    trimEffectPool(fireworkFlares, FIREWORK_STYLE.maxFlares);
  }

  function resultFxTier(isHighScore, rank) {
    if (isHighScore) return 3;
    if (rank >= 0) return 2;
    return 0;
  }

  function emitResultFirework() {
    const tier = resultFxTier(resultIsHighScore, resultRank);
    emitHeavyFirework({
      type: "heavy",
      x: WIDTH / 2,
      y: RESULT_LAYOUT.bravoY,
      color: ITEM_TYPES.heavy.color,
      angle: 0
    }, comboFxIntensity(tier), comboFxSpread("heavy", tier));

    trimEffectPool(fireworkSparks, FIREWORK_STYLE.maxSparks);
    trimEffectPool(fireworkBursts, FIREWORK_STYLE.maxBursts);
    trimEffectPool(fireworkGlints, FIREWORK_STYLE.maxGlints);
    trimEffectPool(fireworkFlares, FIREWORK_STYLE.maxFlares);
  }

  function addGridImpulse(item) {
    const settings = item.type === "heavy"
      ? { radius: 310, strength: 62, life: 76, width: 62 }
      : item.type === "rare"
        ? { radius: 225, strength: 36, life: 56, width: 48 }
        : { radius: 145, strength: 18, life: 38, width: 34 };
    gridImpulses.push({
      x: item.x,
      y: item.y,
      ...settings,
      maxLife: settings.life
    });
    trimEffectPool(gridImpulses, GRID_STYLE.maxImpulses);
  }

  function emitBumperHit(bumper, nx, ny) {
    const x = bumper.x + nx * bumper.radius;
    const y = bumper.y + ny * bumper.radius;
    emitRadialSparks({
      x,
      y,
      count: 24,
      colors: [FIREWORK_STYLE.white, FIREWORK_STYLE.cyan, FIREWORK_STYLE.violet],
      minSpeed: 1.8,
      maxSpeed: 6.8,
      minLife: 24,
      maxLife: 48,
      minLength: 5,
      maxLength: 15,
      gravity: 0.012,
      width: 1
    });
    addFireworkBurst({
      x: bumper.x,
      y: bumper.y,
      color: FIREWORK_STYLE.white,
      kind: "polygon",
      sides: 18,
      radius: bumper.radius,
      growth: 1.8,
      life: 20,
      rotation: bumper.angle,
      spin: 0.025 * bumper.direction,
      lineWidth: 1.1
    });
    addFireworkGlint({
      x,
      y,
      color: FIREWORK_STYLE.cyan,
      radius: 18,
      life: 22,
      arms: 4,
      rotation: bumper.angle
    });
    addGridImpulse({ x: bumper.x, y: bumper.y, type: "normal" });
    trimEffectPool(fireworkSparks, FIREWORK_STYLE.maxSparks);
    trimEffectPool(fireworkBursts, FIREWORK_STYLE.maxBursts);
    trimEffectPool(fireworkGlints, FIREWORK_STYLE.maxGlints);
    screenFlash = Math.max(screenFlash, 0.045);
    screenShake = Math.max(screenShake, 1.5);
  }

  function updateGridImpulses() {
    for (let index = gridImpulses.length - 1; index >= 0; index -= 1) {
      gridImpulses[index].life -= 1;
      if (gridImpulses[index].life <= 0) gridImpulses.splice(index, 1);
    }
  }

  function updateFireworks() {
    for (let index = fireworkSparks.length - 1; index >= 0; index -= 1) {
      const spark = fireworkSparks[index];
      if (spark.delay > 0) {
        spark.delay -= 1;
        continue;
      }
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vx *= spark.drag;
      spark.vy = spark.vy * spark.drag + spark.gravity;
      spark.life -= 1;
      if (spark.life <= 0) fireworkSparks.splice(index, 1);
    }

    for (let index = fireworkBursts.length - 1; index >= 0; index -= 1) {
      const burst = fireworkBursts[index];
      if (burst.delay > 0) {
        burst.delay -= 1;
        continue;
      }
      burst.radius += burst.growth;
      burst.growth *= 0.985;
      burst.rotation += burst.spin;
      burst.life -= 1;
      if (burst.life <= 0) fireworkBursts.splice(index, 1);
    }

    for (let index = fireworkGlints.length - 1; index >= 0; index -= 1) {
      const glint = fireworkGlints[index];
      if (glint.delay > 0) {
        glint.delay -= 1;
        continue;
      }
      glint.rotation += glint.spin;
      glint.life -= 1;
      if (glint.life <= 0) fireworkGlints.splice(index, 1);
    }

    for (let index = fireworkFlares.length - 1; index >= 0; index -= 1) {
      const flare = fireworkFlares[index];
      if (flare.delay > 0) {
        flare.delay -= 1;
        continue;
      }
      flare.radius += flare.growth;
      flare.growth *= 0.982;
      flare.life -= 1;
      if (flare.life <= 0) fireworkFlares.splice(index, 1);
    }

    screenFlash *= 0.82;
    screenShake *= 0.82;
    if (screenShake < 0.08) screenShake = 0;
    shakeOffsetX = screenShake ? randomRange(-screenShake, screenShake) : 0;
    shakeOffsetY = screenShake ? randomRange(-screenShake, screenShake) : 0;
  }

  function clearFireworks() {
    fireworkSparks.length = 0;
    fireworkBursts.length = 0;
    fireworkGlints.length = 0;
    fireworkFlares.length = 0;
    screenFlash = 0;
    screenShake = 0;
    shakeOffsetX = 0;
    shakeOffsetY = 0;
  }

  function normalizeTopScores(value) {
    if (!Array.isArray(value)) return [];
    return value
      .filter(entry => Number.isFinite(entry) && entry > 0)
      .map(entry => Math.round(entry))
      .sort((a, b) => b - a)
      .slice(0, SCORE_STORAGE.limit);
  }

  function loadTopScores() {
    try {
      const stored = localStorage.getItem(SCORE_STORAGE.key);
      return stored ? normalizeTopScores(JSON.parse(stored)) : [];
    } catch {
      return [];
    }
  }

  function saveTopScores() {
    try {
      localStorage.setItem(SCORE_STORAGE.key, JSON.stringify(topScores));
    } catch {
      // The current result remains available in memory when storage is blocked.
    }
  }

  function loadBestCombo() {
    try {
      const stored = Number(localStorage.getItem(SCORE_STORAGE.maxComboKey));
      return Number.isFinite(stored) && stored > 0 ? Math.round(stored) : 0;
    } catch {
      return 0;
    }
  }

  function recordResultMaxCombo() {
    bestCombo = Math.max(bestCombo, loadBestCombo());
    if (roundMaxCombo <= bestCombo) return;

    bestCombo = roundMaxCombo;
    try {
      localStorage.setItem(SCORE_STORAGE.maxComboKey, String(bestCombo));
    } catch {
      // The best Combo remains available in memory when storage is blocked.
    }
  }

  function recordResultScore() {
    const storedScores = loadTopScores();
    if (storedScores.length > 0) topScores = storedScores;
    resultRank = -1;
    resultIsHighScore = false;
    if (score <= 0) return;

    resultIsHighScore = score > (topScores[0] || 0);
    const entries = topScores.map(value => ({ value, current: false }));
    entries.push({ value: Math.round(score), current: true });
    entries.sort((a, b) => b.value - a.value || Number(a.current) - Number(b.current));

    const topEntries = entries.slice(0, SCORE_STORAGE.limit);
    resultRank = topEntries.findIndex(entry => entry.current);
    topScores = topEntries.map(entry => entry.value);
    saveTopScores();
  }

  function isFeverActive() {
    return !roundOver
      && roundTimeRemaining > 0
      && roundTimeRemaining <= ROUND_TIMING.feverSeconds + Number.EPSILON * ROUND_TIMING.durationSeconds;
  }

  function currentItemScale() {
    return isFeverActive() ? FEVER_STYLE.itemScale : 1;
  }

  function currentItemRadius(item) {
    return item.radius * currentItemScale();
  }

  function updateRoundTimer() {
    if (roundClockStartedAt === null) return false;
    roundTimeRemaining = Math.max(0, ROUND_TIMING.durationSeconds - roundElapsedTime());
    if (roundTimeRemaining > 0) return true;

    roundOver = true;
    roundElapsedSeconds = ROUND_TIMING.durationSeconds;
    roundClockStartedAt = null;
    endTrail();
    recordResultScore();
    recordResultMaxCombo();
    emitResultFirework();
    return false;
  }

  function chooseItemType() {
    const roll = Math.random();
    const heavyChance = isFeverActive()
      ? ITEM_SPAWN.heavyChanceFever
      : ITEM_SPAWN.heavyChanceNormal;
    if (roll < heavyChance) return "heavy";
    if (roll < heavyChance + ITEM_SPAWN.rareChance) return "rare";
    return "normal";
  }

  function spawnFallingItem() {
    const type = chooseItemType();
    const definition = ITEM_TYPES[type];
    const radius = definition.radius * currentItemScale();
    fallingItems.push({
      type,
      x: randomRange(ITEM_SPAWN.marginX, WIDTH - ITEM_SPAWN.marginX),
      y: -radius,
      radius: definition.radius,
      color: definition.color,
      speed: randomRange(definition.minSpeed, definition.maxSpeed),
      angle: randomRange(0, Math.PI * 2),
      spin: randomRange(-0.045, 0.045)
    });

  }

  function itemTouchesBall(item) {
    if (ballSpawnTimer > 0) return false;
    const dx = item.x - ball.x;
    const dy = item.y - ball.y;
    const radius = currentItemRadius(item) + PHYSICS.ballRadius;
    return dx * dx + dy * dy <= radius * radius;
  }

  function itemTouchesActiveTrail(item) {
    if (!trailActive || activeTrail.length < 2 || item.type === "heavy") return false;

    const radius = currentItemRadius(item) + TRAIL_STYLE.collisionRadius;
    const radiusSquared = radius * radius;
    for (let index = 1; index < activeTrail.length; index += 1) {
      const start = activeTrail[index - 1];
      const end = activeTrail[index];
      const closest = closestPoint(item, start[0], start[1], end[0], end[1]);
      const dx = item.x - closest.x;
      const dy = item.y - closest.y;
      if (dx * dx + dy * dy <= radiusSquared) return true;
    }
    return false;
  }

  function updateFallingItems() {
    itemSpawnClock -= 1;
    if (itemSpawnClock <= 0 && fallingItems.length < ITEM_SPAWN.maxItems) {
      spawnFallingItem();
      itemSpawnClock = ITEM_SPAWN.intervalFrames;
    }

    for (let index = fallingItems.length - 1; index >= 0; index -= 1) {
      const item = fallingItems[index];
      item.y += item.speed;
      item.angle += item.spin;

      const collectedByBall = itemTouchesBall(item);
      const collectedByTrail = itemTouchesActiveTrail(item);
      const collected = collectedByBall || collectedByTrail;
      if (collected) {
        score += ITEM_TYPES[item.type].points * mult;
        if (trailActive) {
          currentCombo += 1;
          roundMaxCombo = Math.max(roundMaxCombo, currentCombo);
        }
        addGridImpulse(item);
        emitCollectionFirework(item);
        fallingItems.splice(index, 1);
      } else if (item.y - currentItemRadius(item) > HEIGHT) {
        fallingItems.splice(index, 1);
      }
    }
  }

  function serveBall() {
    ball.x = BALL_SPAWN.x;
    ball.y = BALL_SPAWN.y;
    ball.vx = PHYSICS.serveVx;
    ball.vy = PHYSICS.serveVy;
  }

  function beginBallSpawn() {
    ball.x = BALL_SPAWN.x;
    ball.y = BALL_SPAWN.y;
    ball.vx = 0;
    ball.vy = 0;
    ballSpawnTimer = BALL_SPAWN.telegraphFrames;
    ballSpawnAudioPending = true;
  }

  function updateBallSpawn() {
    ballSpawnTimer -= 1;
    if (ballSpawnTimer > 0) return;

    ballSpawnTimer = 0;
    serveBall();
    addFireworkGlint({
      x: ball.x,
      y: ball.y,
      color: FIREWORK_STYLE.white,
      radius: 11,
      life: 10,
      arms: 4,
      spin: 0
    });
    trimEffectPool(fireworkGlints, FIREWORK_STYLE.maxGlints);
  }

  function closestPoint(body, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared > 0
      ? clamp(((body.x - x1) * dx + (body.y - y1) * dy) / lengthSquared, 0, 1)
      : 0;
    return { ratio, x: x1 + ratio * dx, y: y1 + ratio * dy };
  }

  function collideSegment(body, x1, y1, x2, y2, radius, options = {}) {
    const closest = closestPoint(body, x1, y1, x2, y2);
    const offsetX = body.x - closest.x;
    const offsetY = body.y - closest.y;
    const distanceSquared = offsetX * offsetX + offsetY * offsetY;
    const collisionRadius = typeof radius === "number"
      ? radius
      : radius.root + (radius.tip - radius.root) * closest.ratio;
    const totalRadius = PHYSICS.ballRadius + collisionRadius;

    if (distanceSquared >= totalRadius * totalRadius) return null;

    const distance = Math.sqrt(distanceSquared);
    if (distance < 1e-8) return null;

    const nx = offsetX / distance;
    const ny = offsetY / distance;
    const penetration = totalRadius - distance;
    body.x += nx * penetration;
    body.y += ny * penetration;

    let surfaceVx = 0;
    let surfaceVy = 0;
    if (options.flipper) {
      const surfaceX = closest.x + nx * collisionRadius;
      const surfaceY = closest.y + ny * collisionRadius;
      const rx = surfaceX - options.flipper.x;
      const ry = surfaceY - options.flipper.y;
      surfaceVx = -options.flipper.currentOmega * ry * PHYSICS.flipperSurfaceTransfer;
      surfaceVy = options.flipper.currentOmega * rx * PHYSICS.flipperSurfaceTransfer;
    }

    let relativeVx = body.vx - surfaceVx;
    let relativeVy = body.vy - surfaceVy;
    const normalVelocity = relativeVx * nx + relativeVy * ny;
    let reflected = false;
    if (normalVelocity < 0) {
      const restitution = options.flipper
        ? PHYSICS.flipperRestitution
        : (options.restitution ?? PHYSICS.wallRestitution);
      const impulse = (1 + restitution) * normalVelocity;
      relativeVx -= impulse * nx;
      relativeVy -= impulse * ny;
      body.vx = relativeVx + surfaceVx;
      body.vy = relativeVy + surfaceVy;
      reflected = true;
    }
    return { ratio: closest.ratio, reflected };
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let index = 0, previous = points.length - 1;
      index < points.length;
      previous = index, index += 1) {
      const [xi, yi] = points[index];
      const [xj, yj] = points[previous];
      const crosses = ((yi > y) !== (yj > y))
        && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function collideFlipperPolygon(body, flipper) {
    const points = flipper.collisionPoints();
    let nearest = null;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index];
      const b = points[(index + 1) % points.length];
      const closest = closestPoint(body, a[0], a[1], b[0], b[1]);
      const dx = body.x - closest.x;
      const dy = body.y - closest.y;
      const distanceSquared = dx * dx + dy * dy;
      if (!nearest || distanceSquared < nearest.distanceSquared) {
        nearest = { a, b, closest, dx, dy, distanceSquared };
      }
    }

    const inside = pointInPolygon(body.x, body.y, points);
    if (!inside && nearest.distanceSquared >= PHYSICS.ballRadius ** 2) return null;

    const distance = Math.sqrt(nearest.distanceSquared);
    let nx;
    let ny;
    if (distance > 1e-8) {
      const direction = inside ? -1 : 1;
      nx = nearest.dx / distance * direction;
      ny = nearest.dy / distance * direction;
    } else {
      const edgeX = nearest.b[0] - nearest.a[0];
      const edgeY = nearest.b[1] - nearest.a[1];
      const edgeLength = Math.hypot(edgeX, edgeY);
      nx = -edgeY / edgeLength;
      ny = edgeX / edgeLength;
      const centroid = points.reduce(
        (sum, point) => [sum[0] + point[0], sum[1] + point[1]],
        [0, 0]
      ).map(value => value / points.length);
      const midpointX = (nearest.a[0] + nearest.b[0]) * 0.5;
      const midpointY = (nearest.a[1] + nearest.b[1]) * 0.5;
      if ((midpointX - centroid[0]) * nx + (midpointY - centroid[1]) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
    }

    const penetration = inside
      ? PHYSICS.ballRadius + distance
      : PHYSICS.ballRadius - distance;
    body.x += nx * penetration;
    body.y += ny * penetration;

    const contactX = nearest.closest.x;
    const contactY = nearest.closest.y;
    const radiusX = contactX - flipper.x;
    const radiusY = contactY - flipper.y;
    const surfaceVx = -flipper.currentOmega * radiusY * PHYSICS.flipperSurfaceTransfer;
    const surfaceVy = flipper.currentOmega * radiusX * PHYSICS.flipperSurfaceTransfer;
    let relativeVx = body.vx - surfaceVx;
    let relativeVy = body.vy - surfaceVy;
    const normalVelocity = relativeVx * nx + relativeVy * ny;

    let reflected = false;
    if (normalVelocity < 0) {
      const normalImpulse = -(1 + PHYSICS.flipperRestitution) * normalVelocity;
      relativeVx += normalImpulse * nx;
      relativeVy += normalImpulse * ny;

      if (flipper.isUp && Math.abs(flipper.currentOmega) > 1e-8) {
        const tx = -ny;
        const ty = nx;
        const tangentVelocity = relativeVx * tx + relativeVy * ty;
        const maxGripImpulse = normalImpulse * PHYSICS.flipperGrip;
        const gripImpulse = clamp(-tangentVelocity, -maxGripImpulse, maxGripImpulse);
        relativeVx += gripImpulse * tx;
        relativeVy += gripImpulse * ty;
      }

      body.vx = relativeVx + surfaceVx;
      body.vy = relativeVy + surfaceVy;
      reflected = true;
    }

    return { ratio: flipper.contactRatio(contactX, contactY), reflected };
  }

  function collideBumper(body, bumper) {
    const dx = body.x - bumper.x;
    const dy = body.y - bumper.y;
    const minimumDistance = PHYSICS.ballRadius + bumper.radius;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= minimumDistance * minimumDistance) return false;

    const distance = Math.sqrt(distanceSquared);
    if (distance < 1e-8) return false;
    const nx = dx / distance;
    const ny = dy / distance;
    const penetration = minimumDistance - distance;
    body.x += nx * penetration;
    body.y += ny * penetration;

    const normalVelocity = body.vx * nx + body.vy * ny;
    if (normalVelocity >= 0) return false;
    const impulse = -(1 + PHYSICS.bumperRestitution) * normalVelocity;
    body.vx += nx * (impulse + PHYSICS.bumperKick);
    body.vy += ny * (impulse + PHYSICS.bumperKick);
    bumperHitAudio.play(0);

    if (bumper.hitCooldown <= 0) {
      bumper.pulse = 1;
      bumper.hitCooldown = 7;
      emitBumperHit(bumper, nx, ny);
    }
    return true;
  }

  function fixedUpdate() {
    const step = 1 / PHYSICS.substeps;
    let trailRestartedByFlipper = false;
    let passiveReflectionRegistered = false;

    updateFadingTrails();

    if (ballSpawnTimer > 0) {
      if (ballSpawnAudioPending && App.audioContext?.state === "running") {
        ballSpawnAudio.play(0, (BALL_SPAWN.telegraphFrames - ballSpawnTimer) / 60);
        ballSpawnAudioPending = false;
      }
      for (let substep = 0; substep < PHYSICS.substeps; substep++) {
        for (const flipper of flippers) flipper.update(step);
      }
      updateBallSpawn();
      return;
    }

    for (let substep = 0; substep < PHYSICS.substeps; substep++) {
      ball.vy += PHYSICS.gravity * step;

      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > PHYSICS.maxSpeed) {
        ball.vx = ball.vx / speed * PHYSICS.maxSpeed;
        ball.vy = ball.vy / speed * PHYSICS.maxSpeed;
      }

      ball.x += ball.vx * step;
      ball.y += ball.vy * step;

      for (const flipper of flippers) flipper.update(step);

      for (const [x1, y1, x2, y2] of OUTER_WALL_SEGMENTS) {
        const incomingSpeed = Math.hypot(ball.vx, ball.vy);
        const collision = collideSegment(
          ball,
          x1,
          y1,
          x2,
          y2,
          PHYSICS.wallRadius,
          { restitution: PHYSICS.wallRestitution }
        );
        playHighSpeedCollision(collision, incomingSpeed);
      }

      for (const [x1, y1, x2, y2] of DRAIN_WALL_SEGMENTS) {
        const incomingSpeed = Math.hypot(ball.vx, ball.vy);
        const collision = collideSegment(
          ball,
          x1,
          y1,
          x2,
          y2,
          PHYSICS.wallRadius,
          { restitution: PHYSICS.wallRestitution }
        );
        playHighSpeedCollision(collision, incomingSpeed);
        if (collision?.reflected && !passiveReflectionRegistered) {
          registerPassiveReflection();
          passiveReflectionRegistered = true;
        }
      }

      for (const bumper of bumpers) collideBumper(ball, bumper);

      for (const flipper of flippers) {
        const incomingSpeed = Math.hypot(ball.vx, ball.vy);
        const collision = collideFlipperPolygon(ball, flipper);
        if (!collision?.reflected) continue;
        playHighSpeedCollision(collision, incomingSpeed);
        const moving = Math.abs(flipper.currentOmega) > 1e-6;
        if (moving && !trailRestartedByFlipper) {
          replaceTrail();
          trailRestartedByFlipper = true;
          passiveReflectionRegistered = true;
        } else if (!moving && !passiveReflectionRegistered) {
          registerPassiveReflection();
          passiveReflectionRegistered = true;
        }
      }
    }

    if (ball.y - PHYSICS.ballRadius > HEIGHT) {
      endTrail();
      beginBallSpawn();
      return;
    }

    if (trailRecording) {
      activeTrail.push([ball.x, ball.y]);
      if (activeTrail.length > TRAIL_STYLE.maxPoints) activeTrail.shift();
    } else if (trailActive && activeTrail.length > 0) {
      activeTrail.shift();
      if (activeTrail.length === 0) endTrail();
    }
  }

  function tracePolygon(points, targetCtx = ctx) {
    targetCtx.beginPath();
    targetCtx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      targetCtx.lineTo(points[index][0], points[index][1]);
    }
    targetCtx.closePath();
  }

  function traceDrainWall(points, targetCtx = ctx) {
    targetCtx.beginPath();
    targetCtx.moveTo(points[1][0], points[1][1]);
    for (let index = 2; index < points.length; index += 1) {
      targetCtx.lineTo(points[index][0], points[index][1]);
    }
    targetCtx.lineTo(points[0][0], points[0][1]);
  }

  function strokeVectorPath(color, lineWidth, glow, targetCtx = ctx) {
    targetCtx.save();
    targetCtx.globalCompositeOperation = "lighter";
    targetCtx.strokeStyle = color;
    targetCtx.lineWidth = lineWidth;
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
    targetCtx.shadowColor = color;
    targetCtx.shadowBlur = glow;
    targetCtx.stroke();
    targetCtx.shadowBlur = 0;
    targetCtx.stroke();
    targetCtx.restore();
  }

  function strokeFireworkPath(targetCtx, color, lineWidth) {
    targetCtx.globalCompositeOperation = "lighter";
    targetCtx.strokeStyle = color;
    targetCtx.lineWidth = lineWidth;
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
    targetCtx.stroke();
  }

  function drawFlipper(flipper) {
    tracePolygon(flipper.collisionPoints());
    ctx.fillStyle = "#111";
    ctx.fill();
    strokeVectorPath(
      VECTOR_STYLE.geometryColor,
      VECTOR_STYLE.geometryLineWidth,
      VECTOR_STYLE.geometryGlow
    );
  }

  function clearPlayfield() {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const gridColumns = Math.floor((WIDTH - GRID_STYLE.offsetX) / GRID_STYLE.spacing) + 1;
  const gridRows = Math.floor((HEIGHT - GRID_STYLE.offsetY) / GRID_STYLE.spacing) + 1;
  const gridPointPositions = new Float64Array(gridColumns * gridRows * 2);
  const gridWaveParameters = new Float64Array(GRID_STYLE.maxImpulses * 4);

  function prepareGridPoints() {
    for (let index = 0; index < gridImpulses.length; index += 1) {
      const impulse = gridImpulses[index];
      const progress = 1 - impulse.life / impulse.maxLife;
      const base = index * 4;
      gridWaveParameters[base] = impulse.radius * (0.08 + progress * 0.92);
      gridWaveParameters[base + 1] = Math.pow(impulse.life / impulse.maxLife, 0.7);
      gridWaveParameters[base + 2] = Math.sin(progress * Math.PI);
      gridWaveParameters[base + 3] = Math.sin(progress * Math.PI * 3);
    }
    for (let column = 0; column < gridColumns; column += 1) {
      const x = GRID_STYLE.offsetX + column * GRID_STYLE.spacing;
      for (let row = 0; row < gridRows; row += 1) {
        const y = GRID_STYLE.offsetY + row * GRID_STYLE.spacing;
        let offsetX = 0;
        let offsetY = 0;
        for (let index = 0; index < gridImpulses.length; index += 1) {
          const impulse = gridImpulses[index];
          const base = index * 4;
          const dx = x - impulse.x;
          const dy = y - impulse.y;
          const distance = Math.hypot(dx, dy) || 0.001;
          const wave = Math.max(0, 1 - Math.abs(distance - gridWaveParameters[base]) / impulse.width);
          const local = Math.max(0, 1 - distance / impulse.radius);
          const displacement = impulse.strength * gridWaveParameters[base + 1]
            * (wave * gridWaveParameters[base + 2] + local * 0.18 * gridWaveParameters[base + 3]);
          offsetX += dx / distance * displacement;
          offsetY += dy / distance * displacement;
        }
        const pointIndex = (column * gridRows + row) * 2;
        gridPointPositions[pointIndex] = x + offsetX;
        gridPointPositions[pointIndex + 1] = y + offsetY;
      }
    }
  }

  function drawGrid() {
    gridCtx.setTransform(1, 0, 0, 1, 0, 0);
    gridCtx.clearRect(0, 0, WIDTH, HEIGHT);
    gridCtx.save();
    gridCtx.globalCompositeOperation = "source-over";
    gridCtx.strokeStyle = GRID_STYLE.color;
    gridCtx.lineWidth = GRID_STYLE.lineWidth;
    gridCtx.globalAlpha = 1;

    if (gridImpulses.length === 0 && staticGridReady) {
      gridCtx.drawImage(staticGridCanvas, 0, 0);
    } else {
      prepareGridPoints();
      for (let column = 0; column < gridColumns; column += 1) {
        gridCtx.beginPath();
        for (let row = 0; row < gridRows; row += 1) {
          const pointIndex = (column * gridRows + row) * 2;
          const x = gridPointPositions[pointIndex];
          const y = gridPointPositions[pointIndex + 1];
          if (row === 0) gridCtx.moveTo(x, y);
          else gridCtx.lineTo(x, y);
        }
        gridCtx.stroke();
      }
      for (let row = 0; row < gridRows; row += 1) {
        gridCtx.beginPath();
        for (let column = 0; column < gridColumns; column += 1) {
          const pointIndex = (column * gridRows + row) * 2;
          const x = gridPointPositions[pointIndex];
          const y = gridPointPositions[pointIndex + 1];
          if (column === 0) gridCtx.moveTo(x, y);
          else gridCtx.lineTo(x, y);
        }
        gridCtx.stroke();
      }
      if (gridImpulses.length === 0) {
        // Save the complete grid before the moving visibility mask is applied.
        staticGridCtx.drawImage(gridCanvas, 0, 0);
        staticGridReady = true;
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = GRID_STYLE.baseAlpha;
    ctx.drawImage(gridCanvas, 0, 0, WIDTH, HEIGHT);
    ctx.restore();

    gridMaskCtx.setTransform(1, 0, 0, 1, 0, 0);
    gridMaskCtx.clearRect(0, 0, gridMaskCanvas.width, gridMaskCanvas.height);
    // Author gradients in playfield coordinates, rasterize them at half size.
    gridMaskCtx.setTransform(GRID_MASK_SCALE, 0, 0, GRID_MASK_SCALE, 0, 0);
    const ballMask = gridMaskCtx.createRadialGradient(
      ball.x,
      ball.y,
      PHYSICS.ballRadius * 1.4,
      ball.x,
      ball.y,
      GRID_STYLE.visibilityRadius
    );
    ballMask.addColorStop(0, "rgba(255,255,255,0.58)");
    ballMask.addColorStop(0.42, "rgba(255,255,255,0.34)");
    ballMask.addColorStop(0.78, "rgba(255,255,255,0.09)");
    ballMask.addColorStop(1, "rgba(255,255,255,0)");
    gridMaskCtx.fillStyle = ballMask;
    gridMaskCtx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const impulse of gridImpulses) {
      const progress = 1 - impulse.life / impulse.maxLife;
      const decay = Math.pow(impulse.life / impulse.maxLife, 0.55);
      const waveRadius = impulse.radius * (0.08 + progress * 0.92);
      const outerRadius = Math.max(impulse.width * 1.8, waveRadius + impulse.width * 1.35);
      const ringStart = clamp((waveRadius - impulse.width) / outerRadius, 0, 0.94);
      const ringPeak = clamp(waveRadius / outerRadius, ringStart + 0.01, 0.97);
      const reveal = gridMaskCtx.createRadialGradient(
        impulse.x,
        impulse.y,
        0,
        impulse.x,
        impulse.y,
        outerRadius
      );
      reveal.addColorStop(0, `rgba(255,255,255,${0.16 * decay})`);
      reveal.addColorStop(ringStart, `rgba(255,255,255,${0.08 * decay})`);
      reveal.addColorStop(ringPeak, `rgba(255,255,255,${0.92 * decay})`);
      reveal.addColorStop(1, "rgba(255,255,255,0)");
      gridMaskCtx.fillStyle = reveal;
      gridMaskCtx.fillRect(
        impulse.x - outerRadius,
        impulse.y - outerRadius,
        outerRadius * 2,
        outerRadius * 2
      );
    }

    gridCtx.globalCompositeOperation = "destination-in";
    gridCtx.globalAlpha = 1;
    gridCtx.imageSmoothingEnabled = true;
    gridCtx.drawImage(gridMaskCanvas, 0, 0, WIDTH, HEIGHT);
    gridCtx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = GRID_STYLE.highlightAlpha;
    ctx.drawImage(gridCanvas, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function traceSegmentedRing(radius, segments, coverage, rotation) {
    ctx.beginPath();
    const step = Math.PI * 2 / segments;
    const halfArc = step * coverage * 0.5;
    for (let index = 0; index < segments; index += 1) {
      const center = rotation + index * step;
      const start = center - halfArc;
      ctx.moveTo(Math.cos(start) * radius, Math.sin(start) * radius);
      ctx.arc(0, 0, radius, start, center + halfArc);
    }
  }

  function clipBumperVisualsToPlayfield() {
    ctx.beginPath();
    ctx.rect(20, 20, WIDTH - 40, 645);
    ctx.clip();
  }

  function drawBumperVoids() {
    ctx.save();
    clipBumperVisualsToPlayfield();
    ctx.fillStyle = "#111";
    for (const bumper of bumpers) {
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBumpers() {
    ctx.save();
    clipBumperVisualsToPlayfield();
    for (const bumper of bumpers) {
      ctx.save();
      ctx.translate(bumper.x, bumper.y);

      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, bumper.radius, 0, Math.PI * 2);
      strokeVectorPath(FIREWORK_STYLE.white, 1.2, 10);

      ctx.globalAlpha = 0.58 + bumper.pulse * 0.3;
      traceSegmentedRing(29 - bumper.pulse * 2, 8, 0.58, bumper.angle);
      strokeVectorPath(FIREWORK_STYLE.cyan, 1, 8);

      traceSegmentedRing(18 - bumper.pulse * 3, 6, 0.5, -bumper.angle * 1.35);
      strokeVectorPath(FIREWORK_STYLE.violet, 1, 8);

      ctx.globalAlpha = 0.76;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      strokeVectorPath(FIREWORK_STYLE.white, 1, 7);

      if (bumper.pulse > 0) {
        ctx.globalAlpha = bumper.pulse * 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, bumper.radius + (1 - bumper.pulse) * 17, 0, Math.PI * 2);
        strokeVectorPath(FIREWORK_STYLE.white, 1.3, 11);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  let wallGlowLayers = null;
  let ballGlowSprite = null;

  function createGeometryGlow(points, trace) {
    // Cache only the light; opaque interiors must still cover earlier layers.
    const padding = Math.ceil(VECTOR_STYLE.geometryGlow * 3 + VECTOR_STYLE.geometryLineWidth);
    const minX = Math.floor(Math.min(...points.map(point => point[0]))) - padding;
    const minY = Math.floor(Math.min(...points.map(point => point[1]))) - padding;
    const maxX = Math.ceil(Math.max(...points.map(point => point[0]))) + padding;
    const maxY = Math.ceil(Math.max(...points.map(point => point[1]))) + padding;
    const canvas = document.createElement("canvas");
    canvas.width = maxX - minX;
    canvas.height = maxY - minY;
    const glowCtx = canvas.getContext("2d", { alpha: true });
    glowCtx.translate(-minX, -minY);
    trace(glowCtx);
    strokeVectorPath(
      VECTOR_STYLE.geometryColor, VECTOR_STYLE.geometryLineWidth,
      VECTOR_STYLE.geometryGlow, glowCtx
    );
    return { canvas, x: minX, y: minY };
  }

  function drawGeometryGlow(sprite, x = 0, y = 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(sprite.canvas, x + sprite.x, y + sprite.y);
    ctx.restore();
  }

  function drawWalls() {
    if (!wallGlowLayers) {
      const outerPoints = OUTER_WALL_SEGMENTS.flatMap(([x1, y1, x2, y2]) => [[x1, y1], [x2, y2]]);
      const outer = createGeometryGlow(outerPoints, targetCtx => {
        targetCtx.beginPath();
        for (const [x1, y1, x2, y2] of OUTER_WALL_SEGMENTS) {
          targetCtx.moveTo(x1, y1);
          targetCtx.lineTo(x2, y2);
        }
      });
      wallGlowLayers = [outer, ...DRAIN_WALLS.map(points =>
        createGeometryGlow(points, targetCtx => traceDrainWall(points, targetCtx)))];
    }
    drawGeometryGlow(wallGlowLayers[0]);
    for (let index = 0; index < DRAIN_WALLS.length; index += 1) {
      tracePolygon(DRAIN_WALLS[index]);
      ctx.fillStyle = "#111";
      ctx.fill();
      drawGeometryGlow(wallGlowLayers[index + 1]);
    }
  }

  function drawBall() {
    if (ballSpawnTimer > 0) return;
    const radius = PHYSICS.ballRadius;
    if (!ballGlowSprite) {
      ballGlowSprite = createGeometryGlow([[-radius, -radius], [radius, radius]], targetCtx => {
        targetCtx.beginPath();
        targetCtx.arc(0, 0, radius, 0, Math.PI * 2);
      });
    }
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#111";
    ctx.fill();
    drawGeometryGlow(ballGlowSprite, ball.x, ball.y);
  }

  function traceItemSymbol(symbol, targetCtx) {
    targetCtx.beginPath();
    for (const path of symbol.paths) {
      const first = path.points[0];
      targetCtx.moveTo(
        (first[0] - symbol.center[0]) * symbol.scale,
        (first[1] - symbol.center[1]) * symbol.scale
      );
      for (let index = 1; index < path.points.length; index += 1) {
        const point = path.points[index];
        targetCtx.lineTo(
          (point[0] - symbol.center[0]) * symbol.scale,
          (point[1] - symbol.center[1]) * symbol.scale
        );
      }
      if (path.closed) targetCtx.closePath();
    }
  }

  // Three symbols at normal/FEVER size share cached glow images.
  const itemSpriteCache = new Map();
  let itemSpritePixelRatio = 0;

  function getItemSprite(type, scale) {
    const pixelRatio = shell.canvas.width / WIDTH;
    if (pixelRatio !== itemSpritePixelRatio) {
      itemSpriteCache.clear();
      itemSpritePixelRatio = pixelRatio;
    }
    const key = `${type}|${scale}`;
    if (itemSpriteCache.has(key)) return itemSpriteCache.get(key);

    const symbol = ITEM_SYMBOLS[type];
    let extent = 0;
    for (const path of symbol.paths) {
      for (const [x, y] of path.points) {
        extent = Math.max(extent,
          Math.abs(x - symbol.center[0]) * symbol.scale * scale,
          Math.abs(y - symbol.center[1]) * symbol.scale * scale);
      }
    }
    // shadowBlur is in canvas pixels, independent of the shape transform.
    const padding = VECTOR_STYLE.itemGlow * 3 / pixelRatio + 2;
    const size = Math.ceil((extent + padding) * 2 * pixelRatio);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const spriteCtx = canvas.getContext("2d", { alpha: true });
    spriteCtx.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, size / 2, size / 2);
    traceItemSymbol(symbol, spriteCtx);
    spriteCtx.globalCompositeOperation = "lighter";
    spriteCtx.strokeStyle = ITEM_TYPES[type].color;
    spriteCtx.lineWidth = VECTOR_STYLE.itemLineWidth / scale;
    spriteCtx.lineCap = "round";
    spriteCtx.lineJoin = "round";
    spriteCtx.shadowColor = ITEM_TYPES[type].color;
    spriteCtx.shadowBlur = VECTOR_STYLE.itemGlow;
    spriteCtx.stroke();
    spriteCtx.shadowBlur = 0;
    spriteCtx.stroke();

    const sprite = { canvas, size: size / pixelRatio };
    itemSpriteCache.set(key, sprite);
    return sprite;
  }

  function drawFallingItems() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 20, WIDTH, HEIGHT - 20);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;

    const scale = currentItemScale();
    for (const item of fallingItems) {
      const sprite = getItemSprite(item.type, scale);
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);
      ctx.drawImage(sprite.canvas, -sprite.size / 2, -sprite.size / 2, sprite.size, sprite.size);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBallSpawnTelegraph() {
    if (ballSpawnTimer <= 0) return;

    ctx.save();
    clipBumperVisualsToPlayfield();

    const progress = 1 - ballSpawnTimer / BALL_SPAWN.telegraphFrames;
    const eased = 1 - Math.pow(1 - progress, 3);
    const radius = 58 + (4 - 58) * eased;
    const lineLength = 18 + (5 - 18) * eased;
    const arms = 10;

    ctx.globalAlpha = 0.3 + progress * 0.7;
    ctx.beginPath();
    for (let index = 0; index < arms; index += 1) {
      const angle = index / arms * Math.PI * 2;
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const outerRadius = radius + lineLength + (index % 2) * 5;
      ctx.moveTo(
        ball.x + directionX * outerRadius,
        ball.y + directionY * outerRadius
      );
      ctx.lineTo(
        ball.x + directionX * radius,
        ball.y + directionY * radius
      );
    }
    strokeVectorPath(FIREWORK_STYLE.white, 1, 8);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, Math.max(2, radius * 0.45), 0, Math.PI * 2);
    strokeVectorPath(FIREWORK_STYLE.white, 0.8, 6);

    ctx.restore();
  }

  function traceRadialBurst(targetCtx, burst) {
    targetCtx.beginPath();
    if (burst.kind === "spokes") {
      for (let index = 0; index < burst.sides; index += 1) {
        const angle = burst.rotation + index / burst.sides * Math.PI * 2;
        const innerRadius = burst.radius * burst.innerRatio;
        targetCtx.moveTo(
          burst.x + Math.cos(angle) * innerRadius,
          burst.y + Math.sin(angle) * innerRadius
        );
        targetCtx.lineTo(
          burst.x + Math.cos(angle) * burst.radius,
          burst.y + Math.sin(angle) * burst.radius
        );
      }
      return;
    }

    const pointCount = burst.kind === "star" ? burst.sides * 2 : burst.sides;
    for (let index = 0; index < pointCount; index += 1) {
      const angle = burst.rotation + index / pointCount * Math.PI * 2;
      const radius = burst.kind === "star" && index % 2 === 1
        ? burst.radius * burst.innerRatio
        : burst.radius;
      const x = burst.x + Math.cos(angle) * radius;
      const y = burst.y + Math.sin(angle) * radius;
      if (index === 0) targetCtx.moveTo(x, y);
      else targetCtx.lineTo(x, y);
    }
    targetCtx.closePath();
  }

  function drawFireworkFlares(targetCtx) {
    targetCtx.save();
    targetCtx.globalCompositeOperation = "lighter";
    for (const flare of fireworkFlares) {
      if (flare.delay > 0) continue;
      const ratio = flare.life / flare.maxLife;
      const progress = 1 - ratio;
      const fadeIn = Math.min(1, progress * 7);
      const alpha = flare.intensity * fadeIn * ratio;
      const gradient = targetCtx.createRadialGradient(
        flare.x,
        flare.y,
        0,
        flare.x,
        flare.y,
        flare.radius
      );
      gradient.addColorStop(0, FIREWORK_STYLE.white);
      gradient.addColorStop(0.08, flare.color);
      gradient.addColorStop(0.42, `${flare.color}66`);
      gradient.addColorStop(1, `${flare.color}00`);
      targetCtx.globalAlpha = alpha;
      targetCtx.fillStyle = gradient;
      targetCtx.fillRect(
        flare.x - flare.radius,
        flare.y - flare.radius,
        flare.radius * 2,
        flare.radius * 2
      );
    }
    targetCtx.restore();
  }

  function drawFireworkBursts(targetCtx) {
    for (const burst of fireworkBursts) {
      if (burst.delay > 0) continue;
      const ratio = burst.life / burst.maxLife;
      targetCtx.save();
      targetCtx.globalAlpha = Math.min(1, ratio * 1.5);
      traceRadialBurst(targetCtx, burst);
      strokeFireworkPath(targetCtx, burst.color, burst.lineWidth);
      targetCtx.restore();
    }
  }

  function drawFireworkSparks(targetCtx) {
    const groups = new Map();

    for (const spark of fireworkSparks) {
      if (spark.delay > 0) continue;
      const ratio = spark.life / spark.maxLife;
      const band = ratio > 0.66 ? 2 : (ratio > 0.33 ? 1 : 0);
      const key = `${spark.color}|${spark.width}|${band}`;
      if (!groups.has(key)) {
        groups.set(key, {
          color: spark.color,
          width: spark.width,
          alpha: band === 2 ? 0.95 : (band === 1 ? 0.58 : 0.28),
          segments: []
        });
      }

      const speed = Math.hypot(spark.vx, spark.vy) || 1;
      const length = spark.length * (0.35 + ratio * 0.65);
      groups.get(key).segments.push(
        spark.x,
        spark.y,
        spark.x - spark.vx / speed * length,
        spark.y - spark.vy / speed * length
      );
    }

    for (const group of groups.values()) {
      targetCtx.save();
      targetCtx.globalAlpha = group.alpha;
      targetCtx.beginPath();
      const segments = group.segments;
      for (let index = 0; index < segments.length; index += 4) {
        targetCtx.moveTo(segments[index], segments[index + 1]);
        targetCtx.lineTo(segments[index + 2], segments[index + 3]);
      }
      strokeFireworkPath(targetCtx, group.color, group.width);
      targetCtx.restore();
    }
  }

  function drawFireworkGlints(targetCtx) {
    for (const glint of fireworkGlints) {
      if (glint.delay > 0) continue;
      const progress = 1 - glint.life / glint.maxLife;
      const radius = glint.radius * Math.sin(progress * Math.PI);
      const alpha = Math.min(1, glint.life / glint.maxLife * 2);
      if (radius <= 0) continue;

      targetCtx.save();
      targetCtx.globalAlpha = alpha;
      targetCtx.beginPath();
      for (let arm = 0; arm < glint.arms; arm += 1) {
        const angle = glint.rotation + arm / glint.arms * Math.PI;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        targetCtx.moveTo(glint.x - dx, glint.y - dy);
        targetCtx.lineTo(glint.x + dx, glint.y + dy);
      }
      strokeFireworkPath(targetCtx, glint.color, 1.15);
      targetCtx.restore();
    }
  }

  function clipOutsideBumpers(targetCtx) {
    targetCtx.beginPath();
    targetCtx.rect(0, 0, WIDTH, HEIGHT);
    for (const bumper of bumpers) {
      targetCtx.moveTo(bumper.x + bumper.radius, bumper.y);
      targetCtx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    }
    targetCtx.clip("evenodd");
  }

  function drawFireworks() {
    // Delayed effects keep updating, but need no layer rendering yet.
    if (!fireworkFlares.some(effect => effect.delay <= 0)
      && !fireworkBursts.some(effect => effect.delay <= 0)
      && !fireworkSparks.some(effect => effect.delay <= 0)
      && !fireworkGlints.some(effect => effect.delay <= 0)) return;

    fireworkCtx.setTransform(1, 0, 0, 1, 0, 0);
    fireworkCtx.clearRect(0, 0, WIDTH, HEIGHT);
    drawFireworkFlares(fireworkCtx);
    drawFireworkBursts(fireworkCtx);
    drawFireworkSparks(fireworkCtx);
    drawFireworkGlints(fireworkCtx);

    // Blur at half resolution (6px here corresponds to 12px in the playfield).
    fireworkGlowCtx.clearRect(0, 0, fireworkGlowCanvas.width, fireworkGlowCanvas.height);
    fireworkGlowCtx.save();
    fireworkGlowCtx.imageSmoothingEnabled = true;
    fireworkGlowCtx.filter = `blur(${12 * FIREWORK_GLOW_SCALE}px)`;
    fireworkGlowCtx.drawImage(
      fireworkCanvas, 0, 0, fireworkGlowCanvas.width, fireworkGlowCanvas.height
    );
    fireworkGlowCtx.restore();

    ctx.save();
    clipOutsideBumpers(ctx);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.82;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(fireworkGlowCanvas, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.drawImage(fireworkCanvas, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function drawScreenFlash() {
    if (screenFlash < 0.01) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = screenFlash * 0.22;
    ctx.fillStyle = FIREWORK_STYLE.white;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  function traceTrailPath(targetCtx, points) {
    targetCtx.beginPath();
    targetCtx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index++) {
      targetCtx.lineTo(points[index][0], points[index][1]);
    }
  }

  function drawVectorTrail(points, alpha, cacheShape = false) {
    if (points.length < 2) return;

    let layerCanvas = cacheShape ? fadingTrailLayers.get(points) : null;
    if (!layerCanvas) {
      layerCanvas = cacheShape ? document.createElement("canvas") : trailCanvas;
      if (cacheShape) {
        layerCanvas.width = WIDTH;
        layerCanvas.height = HEIGHT;
      }
      const layerCtx = cacheShape ? layerCanvas.getContext("2d", { alpha: true }) : trailCtx;
      layerCtx.clearRect(0, 0, WIDTH, HEIGHT);
      layerCtx.save();
      layerCtx.lineCap = "round";
      layerCtx.lineJoin = "round";
      layerCtx.strokeStyle = TRAIL_STYLE.color;

      for (let index = 0; index < TRAIL_VECTOR_STYLE.widthRatios.length; index += 1) {
        const width = TRAIL_STYLE.collisionRadius * TRAIL_VECTOR_STYLE.widthRatios[index];
        layerCtx.globalCompositeOperation = "source-over";
        layerCtx.lineWidth = width;
        traceTrailPath(layerCtx, points);
        layerCtx.stroke();

        const isCenterLine = index === TRAIL_VECTOR_STYLE.widthRatios.length - 1;
        if (!isCenterLine) {
          layerCtx.globalCompositeOperation = "destination-out";
          layerCtx.lineWidth = width - TRAIL_VECTOR_STYLE.outlineWidth * 2;
          traceTrailPath(layerCtx, points);
          layerCtx.stroke();
        }
      }
      layerCtx.restore();
      if (cacheShape) fadingTrailLayers.set(points, layerCanvas);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.shadowColor = TRAIL_STYLE.color;
    ctx.shadowBlur = TRAIL_VECTOR_STYLE.glow;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.shadowBlur = 0;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
  }

  function drawTrails() {
    for (const trail of fadingTrails) {
      drawVectorTrail(trail.points, trail.life / TRAIL_STYLE.fadeFrames, true);
    }
    if (trailActive) drawVectorTrail(activeTrail, 1);
  }

  function drawComboHud() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.shadowColor = FIREWORK_STYLE.cyan;
    ctx.shadowBlur = 7;
    ctx.fillText(`SCORE ${String(score).padStart(6, "0")}`, 38, 36);
    ctx.save();
    ctx.textAlign = "center";
    if (comboNotice) {
      const glow = comboNotice.life / comboNotice.maxLife;
      ctx.fillStyle = FIREWORK_STYLE.magenta;
      ctx.shadowColor = FIREWORK_STYLE.magenta;
      ctx.shadowBlur = 7 + 17 * glow;
    }
    ctx.fillText(`MULT ×${mult}`, WIDTH / 2, 36);
    ctx.restore();

    if (!trailActive && !comboNotice) {
      ctx.restore();
      return;
    }

    ctx.font = "900 27px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    const showingActiveCombo = trailActive;
    const combo = showingActiveCombo ? currentCombo : comboNotice.combo;
    let noticeAlpha = 1;
    let noticeOffsetY = 0;

    if (comboNotice) {
      const progress = 1 - comboNotice.life / comboNotice.maxLife;
      noticeAlpha = Math.min(1, comboNotice.life / 16, progress * 8);
      noticeOffsetY = -Math.sin(progress * Math.PI) * 8;
    }

    ctx.globalAlpha = showingActiveCombo ? 1 : noticeAlpha;
    ctx.textAlign = "right";
    ctx.fillStyle = showingActiveCombo ? FIREWORK_STYLE.cyan : FIREWORK_STYLE.white;
    ctx.shadowColor = showingActiveCombo ? FIREWORK_STYLE.cyan : FIREWORK_STYLE.magenta;
    ctx.shadowBlur = showingActiveCombo ? 7 : 12;
    const comboRight = WIDTH / 2 + ctx.measureText("00 COMBO").width / 2;
    ctx.fillText(`${String(combo).padStart(2, " ")} COMBO`, comboRight, 86);

    if (comboNotice) {
      ctx.globalAlpha = noticeAlpha;
      ctx.textAlign = "center";
      ctx.font = "800 19px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillStyle = FIREWORK_STYLE.magenta;
      ctx.shadowColor = FIREWORK_STYLE.magenta;
      ctx.shadowBlur = 9;
      ctx.fillText(`BONUS +${comboNotice.bonus}`, WIDTH / 2, 120 + noticeOffsetY);
    }

    ctx.restore();
  }

  function drawRoundHud() {
    const fever = isFeverActive();
    const seconds = Math.ceil(roundTimeRemaining);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.textBaseline = "top";
    ctx.textAlign = "right";
    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = fever ? FIREWORK_STYLE.magenta : "rgba(255,255,255,0.78)";
    ctx.shadowColor = fever ? FIREWORK_STYLE.magenta : FIREWORK_STYLE.cyan;
    ctx.shadowBlur = fever ? 12 : 7;
    ctx.fillText(`TIME ${String(seconds).padStart(2, "0")}`, WIDTH - 38, 36);

    ctx.restore();
  }

  function drawTopScores(topY, highlightCurrent = true) {
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = FIREWORK_STYLE.white;
    ctx.shadowColor = FIREWORK_STYLE.magenta;
    ctx.shadowBlur = 7;
    ctx.fillText("TOP 5", WIDTH / 2, topY);

    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    for (let index = 0; index < SCORE_STORAGE.limit; index += 1) {
      const y = topY + 38 + index * 31;
      const isCurrentResult = highlightCurrent && index === resultRank;
      const value = topScores[index];
      ctx.fillStyle = isCurrentResult
        ? FIREWORK_STYLE.cyan
        : "rgba(255,255,255,0.78)";
      ctx.shadowColor = isCurrentResult ? FIREWORK_STYLE.cyan : FIREWORK_STYLE.magenta;
      ctx.shadowBlur = isCurrentResult ? 8 : 4;
      ctx.textAlign = "right";
      ctx.fillText(`${index + 1}.`, WIDTH / 2 - 45, y);
      ctx.textAlign = "left";
      ctx.fillText(value === undefined ? "------" : String(value).padStart(6, "0"), WIDTH / 2 - 29, y);
    }

    ctx.restore();
  }

  function drawBestCombo(y) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 17px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = FIREWORK_STYLE.magenta;
    ctx.shadowColor = FIREWORK_STYLE.magenta;
    ctx.shadowBlur = 7;
    ctx.fillText(`BEST COMBO ${String(bestCombo).padStart(2, "0")}`, WIDTH / 2, y);
    ctx.restore();
  }

  function drawTimeUp() {
    if (!roundOver) return;

    ctx.save();
    ctx.fillStyle = "rgba(17,17,17,0.76)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    drawScreenFlash();
    ctx.save();
    ctx.translate(shakeOffsetX, shakeOffsetY);
    drawFireworks();
    ctx.restore();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "700 72px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1.8;
    ctx.fillStyle = "#111111";
    ctx.fillText("BRAVO!", WIDTH / 2, RESULT_LAYOUT.bravoY);
    ctx.strokeStyle = FIREWORK_STYLE.white;
    ctx.shadowColor = FIREWORK_STYLE.magenta;
    ctx.shadowBlur = 10;
    ctx.strokeText("BRAVO!", WIDTH / 2, RESULT_LAYOUT.bravoY);

    ctx.font = "700 36px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.lineWidth = 1.4;
    ctx.fillStyle = "#111111";
    ctx.shadowBlur = 0;
    const scoreText = `SCORE ${String(score).padStart(6, "0")}`;
    ctx.fillText(scoreText, WIDTH / 2, RESULT_LAYOUT.scoreY);
    ctx.strokeStyle = FIREWORK_STYLE.cyan;
    ctx.shadowColor = FIREWORK_STYLE.cyan;
    ctx.shadowBlur = 7;
    ctx.strokeText(scoreText, WIDTH / 2, RESULT_LAYOUT.scoreY);

    ctx.font = "700 19px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = FIREWORK_STYLE.white;
    ctx.shadowColor = FIREWORK_STYLE.cyan;
    ctx.shadowBlur = 7;
    ctx.fillText(`MAX COMBO ${String(roundMaxCombo).padStart(2, "0")}`, WIDTH / 2, RESULT_LAYOUT.maxComboY);

    if (resultIsHighScore) {
      ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillStyle = FIREWORK_STYLE.magenta;
      ctx.shadowColor = FIREWORK_STYLE.magenta;
      ctx.shadowBlur = 9;
      ctx.fillText("HIGH SCORE", WIDTH / 2, RESULT_LAYOUT.highScoreY);
    }

    drawTopScores(RESULT_LAYOUT.topScoresY);

    drawBestCombo(RESULT_LAYOUT.bestComboY);

    ctx.font = "600 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = FIREWORK_STYLE.white;
    ctx.shadowColor = FIREWORK_STYLE.magenta;
    ctx.shadowBlur = 7;
    ctx.fillText("PRESS ENTER / TAP TO RETRY", WIDTH / 2, RESULT_LAYOUT.retryY);
    ctx.restore();
  }

  const game = {
    onPauseChange(paused) {
      if (paused) {
        pauseRoundClock();
        if (ballSpawnTimer > 0) ballSpawnAudioPending = true;
        for (const audio of gameAudio) audio.stop();
        stopMusic();
      }
      else {
        resumeRoundClock();
        playMusic();
      }
    },

    onBackToTitle() {
      pauseRoundClock();
      for (const audio of gameAudio) audio.stop();
      stopMusic(true);
    },

    reset() {
      stopMusic(true);
      for (const audio of gameAudio) { audio.stop(); audio.prepare(); }
      for (const flipper of flippers) flipper.reset();
      resetBumpers();
      clearTrails();
      score = 0;
      mult = 1;
      roundMaxCombo = 0;
      resultRank = -1;
      resultIsHighScore = false;
      comboNotice = null;
      fallingItems.length = 0;
      gridImpulses.length = 0;
      itemSpawnClock = 0;
      roundTimeRemaining = ROUND_TIMING.durationSeconds;
      roundOver = false;
      clearFireworks();
      beginBallSpawn();
      roundElapsedSeconds = 0;
      roundClockStartedAt = performance.now();
      playMusic();
    },

    startRestart() {
      if (!roundOver) return false;
      this.reset();
      return true;
    },

    update(dt) {
      if (roundOver) {
        updateFireworks();
        return;
      }
      if (!updateRoundTimer()) return;
      updateFlipperInputs();
      updateBumpers();
      fixedUpdate();
      updateFallingItems();
      updateFireworks();
      updateGridImpulses();
    },

    draw() {
      clearPlayfield();
      ctx.save();
      ctx.translate(shakeOffsetX, shakeOffsetY);
      drawGrid();
      drawTrails();
      drawFallingItems();
      drawBumperVoids();
      drawWalls();
      drawBumpers();
      for (const flipper of flippers) drawFlipper(flipper);
      drawBallSpawnTelegraph();
      if (!roundOver) drawFireworks();
      drawBall();
      ctx.restore();
      if (!roundOver) drawScreenFlash();
      drawComboHud();
      drawRoundHud();
      drawTimeUp();
    },

    drawTitle() {
      ctx.save();
      ctx.fillStyle = TITLE_STYLE.background;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      ctx.fillStyle = TITLE_STYLE.signatureColor;
      ctx.shadowBlur = 0;
      ctx.font = "300 20px system-ui, sans-serif";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText("A Ryo Sato Game", 28, 28);
      ctx.textAlign = "right";
      ctx.fillText("Made with ChatGPT", WIDTH - 28, 28);
      ctx.restore();
      ctx.lineWidth = TITLE_STYLE.lineWidth;
      ctx.lineJoin = "miter";
      ctx.miterLimit = 10;
      ctx.shadowColor = TITLE_STYLE.glowColor;
      ctx.shadowBlur = TITLE_STYLE.glowBlur;
      const titleColors = [TITLE_STYLE.nightColor, TITLE_STYLE.bloomColor, TITLE_STYLE.pinballColor];
      for (let group = 0; group < TITLE_PATHS.length; group += 1) {
        ctx.strokeStyle = titleColors[group];
        for (const path of TITLE_PATHS[group]) ctx.stroke(path);
      }
      drawTopScores(TITLE_LAYOUT.topScoresY, false);
      drawBestCombo(TITLE_LAYOUT.bestComboY);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = FIREWORK_STYLE.white;
      ctx.shadowColor = FIREWORK_STYLE.magenta;
      ctx.shadowBlur = 7;
      ctx.font = "600 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillText("PRESS ENTER / TAP TO START", WIDTH / 2, TITLE_LAYOUT.startY);
      ctx.restore();
    }
  };

  App.setGame(game);
})();
