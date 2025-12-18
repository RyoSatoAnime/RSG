// sq_audio_core_v0.7.1c.js
// Based on sq_audio_core_v0.6_antigravity.js
// SR-crush: ScriptProcessorNode -> AudioWorkletNode (with ScriptProcessor fallback)

// sq_audio_core_v0.6.js
//
// 8bit SQAudioEngine core (1-voice / 1-layer).
// - 単音トーンJSONを WebAudio で鳴らす
// - wave: square / triangle / saw / wave32 / noise
// - noteレンジはコア側ではクランプしない（UI側で制限）
// - pitch_sweep / vibrato / filter / bitcrush / sr_crush / env 対応
//
// Tone JSON 仕様 (v0.6):
// {
//   "note": 60,
//   "len_ms": 400,
//   "env_ms": { "attack":2, "decay":160, "sustain":0, "release":120 },
//   "pitch_sweep": { "start_semi":0, "end_semi":0, "time_ms":0 },
//   "vibrato": { "depth_semi":0.3, "rate_hz":6, "delay_ms":40 },
//   "mix": { "master": 0.8 },
//   "filter": { "lpf_hz":12000, "hpf_hz":40, "bit_depth":12, "sr_crush_hz":44100 },
//   "osc": {
//      "wave": "square" | "triangle" | "saw" | "wave32" | "noise",
//      "duty": 0.25,              // squareのみ
//      "detune_cents": 0,         // noise以外
//      "wave32": { "nibbles": "0123AB..." } | null,  // 4bit×32
//      "noise_rate_hz": 600       // wave="noise" のときのみ使用
//   }
// }


// --- SR_CRUSH (AudioWorklet-based, with ScriptProcessor fallback) ---
const SR_CRUSH_PROCESSOR_CODE = `
class SRCrushProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const outputSampleRate = options.processorOptions.sampleRate || 44100;
    const targetHz = options.processorOptions.targetHz || outputSampleRate;

    this.step = Math.max(1, Math.floor(outputSampleRate / Math.max(1, targetHz)));
    this.lastValue = 0;
    this.counter = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    for (let channel = 0; channel < input.length; channel++) {
      const inCh = input[channel];
      const outCh = output[channel];
      const len = inCh.length;

      for (let i = 0; i < len; i++) {
        if (this.counter === 0) {
          this.lastValue = inCh[i];
          this.counter = this.step;
        }
        outCh[i] = this.lastValue;
        this.counter--;
      }
    }
    return true;
  }
}
registerProcessor('sr-crush-processor', SRCrushProcessor);
`;
class SQAudioCore {
  constructor(options = {}) {
    this._options = options;
    this._ac = null;
    this._master = null;

    this._wave32Cache = new Map();   // key: nibbles string
    this._bitCurveCache = new Map(); // key: bitDepth
    this._pulseCache = new Map();    // key: duty
    this._noiseBufCache = new Map(); // key: rateHz

    this._activeTracks = new Map();  // key: trackId, val: { sourceNode, gainNode, endTime }
    this._busCache = new Map();     // key: busKey, val: { inputNode, outGain, srNode, shaper, hpf, lpf }
    this.masterGain = options.masterGain ?? 0.6;
    // AudioWorklet (SR-crush) load state
    this._workletLoaded = false;
  }

  // ====== AudioContext lazy init ======
    _ensureAC() {
    if (this._ac) return this._ac;
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    const master = AC.createGain();
    master.gain.value = this.masterGain;
    master.connect(AC.destination);

    this._ac = AC;
    this._master = master;

    // AudioWorklet module for SR-crush (loaded lazily, non-blocking)
    if (AC.audioWorklet && !this._workletLoaded) {
      try {
        const blob = new Blob([SR_CRUSH_PROCESSOR_CODE], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        AC.audioWorklet.addModule(url)
          .then(() => {
            this._workletLoaded = true;
            URL.revokeObjectURL(url);
          })
          .catch(err => {
            console.error("AudioWorklet loading failed:", err);
          });
      } catch (e) {
        console.warn("AudioWorklet not available or failed to init:", e);
      }
    }

    return AC;
  }

  get audioContext() {
    return this._ensureAC();
  }

  get currentTime() {
    return this._ensureAC().currentTime;
  }

  // ====== Note→Hz （コア側ではC2〜B7に縛らない） ======
  noteToHz(note) {
    const n = Number.isFinite(note) ? (note | 0) : 69;
    // 0〜127 くらいに軽くクランプしておく（極端なオーバーフローだけ防ぐ）
    const nn = Math.min(127, Math.max(0, n));
    return 440 * Math.pow(2, (nn - 69) / 12);
  }

  // ====== ビット深度クラッシャ (WaveShaper) ======
  _getBitDepthCurve(bits = 12) {
    bits = Math.max(2, Math.min(16, bits | 0));
    const key = bits;
    if (this._bitCurveCache.has(key)) return this._bitCurveCache.get(key);

    const levels = Math.pow(2, bits);
    const n = 2048;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1; // -1..+1
      const q = Math.round((x * 0.5 + 0.5) * (levels - 1)) / (levels - 1);
      curve[i] = q * 2 - 1;
    }
    this._bitCurveCache.set(key, curve);
    return curve;
  }

  // ====== PWMパルス波 (duty付き) ======
  _getPulseWave(duty = 0.5) {
    const AC = this._ensureAC();

    let D = duty;
    if (!Number.isFinite(D)) D = 0.5;
    D = Math.max(0.05, Math.min(0.95, D));

    const dutyKey = Math.round(D * 1000) / 1000; // 0.125/0.25/0.5 等をキーに

    if (this._pulseCache.has(dutyKey)) {
      return this._pulseCache.get(dutyKey);
    }

    const size = 64;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);

    real[0] = 0;
    imag[0] = 0;

    for (let n = 1; n < size; n++) {
      const a = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * D);
      real[n] = a;
      imag[n] = 0;
    }

    const wave = AC.createPeriodicWave(real, imag, { disableNormalization: false });
    this._pulseCache.set(dutyKey, wave);
    return wave;
  }

  // ====== wave32 から PeriodicWave ======
  _getWave32(wave32) {
    if (!wave32 || typeof wave32.nibbles !== "string") return null;
    const key = wave32.nibbles.trim().toUpperCase();
    if (key.length === 0) return null;

    if (this._wave32Cache.has(key)) return this._wave32Cache.get(key);

    const AC = this._ensureAC();
    const nibbles = key;
    const N = nibbles.length;

    const samples = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const ch = nibbles[i];
      const v = parseInt(ch, 16);
      const norm = isNaN(v) ? 0 : v / 15;
      samples[i] = norm * 2 - 1;
    }

    const harmonics = Math.min(32, N);
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let k = 1; k < harmonics; k++) {
      let sumRe = 0;
      let sumIm = 0;
      for (let n = 0; n < N; n++) {
        const phase = (2 * Math.PI * k * n) / N;
        sumRe += samples[n] * Math.cos(phase);
        sumIm += samples[n] * Math.sin(phase);
      }
      real[k] = sumRe / N;
      imag[k] = sumIm / N;
    }

    const wave = AC.createPeriodicWave(real, imag, { disableNormalization: false });
    this._wave32Cache.set(key, wave);
    return wave;
  }

  // ====== Sample&Hold ノイズバッファ ======
  _getNoiseBuffer(rateHz = 600) {
    const AC = this._ensureAC();
    const key = Math.max(20, Math.floor(rateHz));
    if (this._noiseBufCache.has(key)) return this._noiseBufCache.get(key);

    const sr = AC.sampleRate;
    const dur = 1.0;
    const length = Math.floor(sr * dur);
    const raw = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      raw[i] = Math.random() * 2 - 1;
    }
    const step = Math.max(1, Math.floor(sr / Math.max(20, key)));
    const sh = new Float32Array(length);
    let last = raw[0];
    let c = 0;
    for (let i = 0; i < length; i++) {
      if (c === 0) {
        last = raw[i];
        c = step;
      }
      sh[i] = last;
      c--;
    }
    const buf = AC.createBuffer(1, length, sr);
    buf.copyToChannel(sh, 0);
    this._noiseBufCache.set(key, buf);
    return buf;
  }

  // ====== エンベロープ適用 ======
  _applyEnvelope(g, t0, env_ms = {}, len_ms = 400) {
    const A = (env_ms.attack ?? 2) / 1000;
    const D = (env_ms.decay ?? 160) / 1000;
    const S = env_ms.sustain ?? 0;
    const R = (env_ms.release ?? 120) / 1000;

    const lenSec = len_ms / 1000;

    const peakT = t0 + A;
    const decayT = t0 + A + D;
    const releaseStart = t0 + lenSec;

    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(1.0, peakT);
    g.gain.linearRampToValueAtTime(S, decayT);
    g.gain.setValueAtTime(S, releaseStart);
    g.gain.linearRampToValueAtTime(0.0001, releaseStart + R);

    return releaseStart + R;
  }

  // ====== Pitch sweep (直線) ======
  _applyPitch(osc, baseHz, t0, pitch_sweep = {}) {
    const startSemi = pitch_sweep.start_semi ?? 0;
    const endSemi = pitch_sweep.end_semi ?? 0;
    const timeMs = pitch_sweep.time_ms ?? 0;

    const startHz = baseHz * Math.pow(2, startSemi / 12);
    const endHz = baseHz * Math.pow(2, endSemi / 12);

    if (timeMs > 0) {
      const dur = timeMs / 1000;
      osc.frequency.setValueAtTime(startHz, t0);
      osc.frequency.linearRampToValueAtTime(endHz, t0 + dur);
    } else {
      osc.frequency.setValueAtTime(startHz, t0);
    }
  }

  // ====== Vibrato (LFO) ======
  _applyVibrato(osc, baseHz, t0, endTime, vibrato = null) {
    if (!vibrato) return;
    const depthSemi = Number(vibrato.depth_semi ?? 0);
    const rateHz = Number(vibrato.rate_hz ?? 0);
    const delayMs = Number(vibrato.delay_ms ?? 0);

    if (!(depthSemi > 0) || !(rateHz > 0)) return;

    const AC = this._ensureAC();

    // depth_semi を「Hz振幅」に変換（近似：基準はbaseHz）
    const depthHz = baseHz * (Math.pow(2, depthSemi / 12) - 1);
    if (!(depthHz > 0)) return;

    const lfo = AC.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = rateHz;

    const lfoGain = AC.createGain();
    lfoGain.gain.setValueAtTime(0, t0);

    const delaySec = Math.max(0, delayMs / 1000);
    const vibratoStart = t0 + delaySec;

    // ふわっとオンにしたければここでフェードインも可能だが、
    // v0.6ではいきなりfull depthでOKとする。
    lfoGain.gain.setValueAtTime(0, t0);
    lfoGain.gain.setValueAtTime(depthHz, vibratoStart);

    lfo.connect(lfoGain).connect(osc.frequency);

    lfo.start(t0);
    lfo.stop(endTime + 0.05);
  }

  // ====== SR crush ノード (ScriptProcessorベース) ======
  // 将来的に AudioWorklet 実装に差し替えやすいよう、1箇所に分離。
    _createSRCrushNode(srCrushHz) {
    const AC = this._ensureAC();
    const sampleRate = AC.sampleRate;
    const targetHz = srCrushHz || sampleRate;
    if (targetHz >= sampleRate - 1) return null;

    // AudioWorklet が使える & ロード済みならそちらを優先
    if (this._workletLoaded && typeof AudioWorkletNode !== "undefined") {
      try {
        return new AudioWorkletNode(AC, 'sr-crush-processor', {
          processorOptions: {
            sampleRate: sampleRate,
            targetHz: srCrushHz || sampleRate
          }
        });
      } catch (e) {
        console.warn("Failed to create AudioWorkletNode(sr-crush-processor). Fallback to ScriptProcessor.", e);
        // fall through to ScriptProcessor
      }
    }

    // --- フォールバック: 旧 ScriptProcessor (または Worklet 未ロード時) ---
    if (!AC.createScriptProcessor) {
      // 古いAPIがない or 将来のブラウザで無効な場合はバイパス
      return null;
    }

    const target = Math.max(20, Math.min(sampleRate, srCrushHz || sampleRate));
    const bufferSize = 512;
    const node = AC.createScriptProcessor(bufferSize, 1, 1);

    const step = Math.max(1, Math.floor(sampleRate / target));
    let last = 0;
    let counter = 0;

    node.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      const len = input.length;
      for (let i = 0; i < len; i++) {
        if (counter === 0) {
          last = input[i];
          counter = step;
        }
        output[i] = last;
        counter--;
      }
    };

    return node;
  }

  // ====== ソース生成（osc or noise） ======
  _buildSource(tone, t0, env_ms, len_ms, filterIn) {
    const AC = this._ensureAC();
    const oscDesc = tone.osc || {};
    const wave = oscDesc.wave || "square";

    const vibrato = tone.vibrato || null;

    const gain = AC.createGain();
    const note = tone.note ?? 69;
    const baseHz = this.noteToHz(note);

    if (wave === "noise") {
      // ノイズソース（vibrato / pitch_sweep は無視）
      const rate = oscDesc.noise_rate_hz ?? 600;
      const buf = this._getNoiseBuffer(rate);
      const src = AC.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const endTime = this._applyEnvelope(gain, t0, env_ms, len_ms);

      src.connect(gain).connect(filterIn);
      src.start(t0);
      src.stop(endTime + 0.05);
      return { node: src, endTime, gainNode: gain };
    } else {
      // ピッチ付きオシレーター
      const osc = AC.createOscillator();

      if (wave === "square") {
        const duty = oscDesc.duty ?? 0.5;
        const pw = this._getPulseWave(duty);
        osc.setPeriodicWave(pw);
      } else if (wave === "triangle") {
        osc.type = "triangle";
      } else if (wave === "saw") {
        osc.type = "sawtooth";
      } else if (wave === "wave32" && oscDesc.wave32) {
        const pw = this._getWave32(oscDesc.wave32);
        if (pw) {
          osc.setPeriodicWave(pw);
        } else {
          osc.type = "square";
        }
      } else {
        osc.type = "square";
      }

      const detuneCents = oscDesc.detune_cents ?? 0;
      osc.detune.setValueAtTime(detuneCents, t0);

      // pitch_sweep → baseFreq
      this._applyPitch(osc, baseHz, t0, tone.pitch_sweep || {});

      // エンベロープ適用＆endTime取得
      const endTime = this._applyEnvelope(gain, t0, env_ms, len_ms);

      // vibrato（LFO）適用
      this._applyVibrato(osc, baseHz, t0, endTime, vibrato);

      osc.connect(gain).connect(filterIn);
      osc.start(t0);
      osc.stop(endTime + 0.05);

      return { node: osc, endTime, gainNode: gain };
    }
  }

  
  // ====== Bus (共有FXチェーン) ======
  // BGMなど「大量ノート」を鳴らす場合、ノートごとにHPF/LPF/SRcrush/BitDepthを作ると
  // iOS/EdgeでCPU/GC負荷が跳ねてドロップしやすい。
  // そこで busKey ごとに FX チェーンを1回だけ作って共有し、各ノートは osc+env だけ生成して繋ぐ。
  _getOrCreateBus(busKey, filter = {}, masterGain = 1.0) {
    const AC = this._ensureAC();
    const key = String(busKey || "default");

    if (this._busCache.has(key)) return this._busCache.get(key);

    // Filter chain: HPF → LPF → (SRcrush) → BitDepth → outGain → master
    const hpf = AC.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = filter.hpf_hz ?? 20;

    const lpf = AC.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = filter.lpf_hz ?? 12000;

    const shaper = AC.createWaveShaper();
    const bd = filter.bit_depth ?? 12;
    shaper.curve = this._getBitDepthCurve(bd);
    shaper.oversample = "none";

    const srCrushHz = filter.sr_crush_hz ?? 44100;
    const sampleRate = AC.sampleRate;

    let srNode = null;
    if (srCrushHz > 0 && srCrushHz < sampleRate) {
      srNode = this._createSRCrushNode(srCrushHz);
    }

    const outGain = AC.createGain();
    outGain.gain.value = Number.isFinite(masterGain) ? masterGain : 1.0;

    hpf.connect(lpf);
    if (srNode) {
      lpf.connect(srNode);
      srNode.connect(shaper);
    } else {
      lpf.connect(shaper);
    }
    shaper.connect(outGain);
    outGain.connect(this._master);

    const bus = { inputNode: hpf, outGain, srNode, shaper, hpf, lpf, filterSnapshot: { ...filter } };
    this._busCache.set(key, bus);
    return bus;
  }

  /**
   * playToneBus: busKeyごとに共有FXチェーンを使って鳴らす（大量ノート向け）
   * - toneJson.filter がトラック内でほぼ固定な前提で効果が大きい
   * - 音色が変わる場合は busKey をトラックごとに分ける / filter統一を検討
   */
  playToneBus(toneJson, whenSec = 0, busKey = "bgm", trackId = null, monoCutMs = null) {
    const AC = this._ensureAC();
    if (AC.state === "suspended") {
      AC.resume?.();
    }
    const t0 = AC.currentTime + Math.max(0, whenSec);

    // --- Monophonic check (same as playTone) ---
    if (trackId != null) {
      if (this._activeTracks.has(trackId)) {
        const old = this._activeTracks.get(trackId);
        try {
          const now = AC.currentTime;
          if (old.gainNode) {
            old.gainNode.gain.cancelScheduledValues(now);
            old.gainNode.gain.setValueAtTime(old.gainNode.gain.value, now);
            const r = (Number.isFinite(monoCutMs) && monoCutMs >= 0)
              ? Math.max(0.005, monoCutMs / 1000)
              : ((old.releaseSec != null) ? old.releaseSec : 0.02);


            old.gainNode.gain.cancelScheduledValues(now);
            old.gainNode.gain.setValueAtTime(old.gainNode.gain.value, now);
            old.gainNode.gain.linearRampToValueAtTime(0, now + r);
          }
          if (old.sourceNode) {
            old.sourceNode.stop(now + r + 0.02);
          }
        } catch (e) {}
        this._activeTracks.delete(trackId);
      }
    }

    const len_ms = toneJson.len_ms ?? 400;
    const env = toneJson.env_ms || {};
    const mix = toneJson.mix || {};
    const filter = toneJson.filter || {};

    const masterLevel = typeof mix.master === "number" ? mix.master : 0.8;

    // per-note master gain (cheap)
    const toneGain = AC.createGain();
    toneGain.gain.value = masterLevel;
    // shared FX chain
    const bus = this._getOrCreateBus(busKey, filter, 1.0);

    // connect per-note gain into bus input
    toneGain.connect(bus.inputNode);

    // build osc+env only, routed into toneGain
    const srcInfo = this._buildSource(toneJson, t0, env, len_ms, toneGain);
    const endTime = srcInfo ? srcInfo.endTime : t0 + len_ms / 1000;

    if (trackId != null && srcInfo) {
      const relMs = (toneJson.env_ms && Number.isFinite(toneJson.env_ms.release)) ? toneJson.env_ms.release : 10;
      const releaseSec = Math.max(0.01, relMs / 1000);

      const entry = {
        sourceNode: srcInfo.node,
        gainNode: srcInfo.gainNode,
        endTime: endTime,
        releaseSec
      };
      this._activeTracks.set(trackId, entry);
    }

    return { endTime };
  }


  // ====== 単音再生 ======
  /**
   * toneJson: v0.6 仕様
   * trackId: 任意文字列。指定すると「同じtrackIdで鳴っている前の音」を止めてから鳴らす（モノフォニック動作）
   */
  playTone(toneJson, whenSec = 0, trackId = null, monoCutMs = null) {
    const AC = this._ensureAC();
    if (AC.state === "suspended") {
      AC.resume?.();
    }

    const t0 = AC.currentTime + Math.max(0, whenSec);

    // --- Monophonic check ---
    if (trackId != null) {
      if (this._activeTracks.has(trackId)) {
        const old = this._activeTracks.get(trackId);
        // 前の音を止める（プチッとならないよう少しフェードアウトさせてもいいが、
        // ここでは即座にエンベロープを落としてstopさせる実装にする）
        try {
          const now = AC.currentTime;
          // 既に終わってるかもしれないが念のため
          if (old.gainNode) {
            old.gainNode.gain.cancelScheduledValues(now);
            old.gainNode.gain.setValueAtTime(old.gainNode.gain.value, now);
            old.gainNode.gain.linearRampToValueAtTime(0, now + 0.01);
          }
          if (old.sourceNode) {
            old.sourceNode.stop(now + 0.02);
          }
        } catch (e) {
          // ignore
        }
        this._activeTracks.delete(trackId);
      }
    }

    const len_ms = toneJson.len_ms ?? 400;
    const env = toneJson.env_ms || {};
    const mix = toneJson.mix || {};
    const filter = toneJson.filter || {};

    const masterLevel = typeof mix.master === "number" ? mix.master : 0.8;

    // per-tone Master Gain
    const toneGain = AC.createGain();
    toneGain.gain.value = masterLevel;
    toneGain.connect(this._master);

    // Filter chain: HPF → LPF → (SRcrush) → BitDepth
    const hpf = AC.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = filter.hpf_hz ?? 20;

    const lpf = AC.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = filter.lpf_hz ?? 12000;

    const shaper = AC.createWaveShaper();
    const bd = filter.bit_depth ?? 12;
    shaper.curve = this._getBitDepthCurve(bd);
    shaper.oversample = "none";

    const srCrushHz = filter.sr_crush_hz ?? 44100;
    const sampleRate = AC.sampleRate;

    let srNode = null;
    if (srCrushHz > 0 && srCrushHz < sampleRate) {
      srNode = this._createSRCrushNode(srCrushHz);
    }

    hpf.connect(lpf);
    if (srNode) {
      lpf.connect(srNode);
      srNode.connect(shaper);
    } else {
      lpf.connect(shaper);
    }
    shaper.connect(toneGain);

    const srcInfo = this._buildSource(toneJson, t0, env, len_ms, hpf);
    const endTime = srcInfo ? srcInfo.endTime : t0 + len_ms / 1000;

    // --- Register active track ---
    if (trackId != null && srcInfo) {
      const entry = {
        sourceNode: srcInfo.node,
        gainNode: srcInfo.gainNode, // _buildSourceが返すように変更が必要
        endTime: endTime
      };
      this._activeTracks.set(trackId, entry);

      // 自然に終わったらマップから消す
      srcInfo.node.onended = () => {
        // 今登録されているのが自分自身なら消す（上書きされてたら消さない）
        if (this._activeTracks.get(trackId) === entry) {
          this._activeTracks.delete(trackId);
        }
      };
    }

    return { startTime: t0, endTime };
  }
}

// export default SQAudioCore;
window.SQAudioCore = SQAudioCore;
