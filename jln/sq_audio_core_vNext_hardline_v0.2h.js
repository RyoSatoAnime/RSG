/* sq_audio_core_vNext_hardline_v0.2f.js
   SQAudioEngine Hardline vNext (core v0.2f, ramp-safety)
   - WebAudio-based scheduler with lookahead
   - Simple buses (mixers)
   - ToneBank-driven synth (osc/noise + ADSR + optional biquad filter)
   - Per-note FX in PhraseEvent.fx (pitch sweep, vibrato, filter sweep)
   - Phrase/Song JSON playback helpers

   Notes:
   - Designed to be used by SQAudioSuite tools.
   - Exposes global SQAE (and CommonJS module.exports when available).
*/
(function(global){
  'use strict';

  /** @typedef {{attack:number, decay:number, sustain:number, release:number}} ADSR */
  /** @typedef {{type:'lowpass'|'highpass'|'bandpass'|'notch'|'peaking'|'lowshelf'|'highshelf', freq:number, q?:number, gain?:number}} FilterDef */
  /** @typedef {{type:'sine'|'square'|'triangle'|'sawtooth'|'noise'|'wave', waveId?:string, detuneCents?:number}} OscDef */
  /** @typedef {{id:string, osc:OscDef, env?:ADSR, filter?:FilterDef, gain?:number, pan?:number, mono?:'poly'|'mono'|'softMono', monoCutMs?:number}} ToneDef */

  /** @typedef {{meta?:any, tones: Record<string, ToneDef>}} ToneBank */
  /** @typedef {{meta?:any, waves: Record<string, {real:number[], imag:number[]}>}} WaveBank */

  /** @typedef {{t:number, n?:number, hz?:number, d?:number, v?:number, toneId?:string, busKey?:string, pan?:number}} PhraseEvent */
  /** @typedef {{tempo?:number, events: PhraseEvent[]}} Phrase */
  /** @typedef {{tempo?:number, tracks: {id?:string, busKey?:string, toneId?:string, events: PhraseEvent[]}[], loop?:{start:number,end:number}}} Song */

  // Clamp with numeric coercion + NaN/Infinity safety.
  // If x is non-finite, returns the lower bound (a) by default.
  const clamp = (x, a, b)=>{
    const n = Number(x);
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
  };

  const numOr = (x, d)=>{
    const n = Number(x);
    return Number.isFinite(n) ? n : d;
  };
  const nowMs = ()=> (typeof performance!=='undefined' ? performance.now() : Date.now());

  function midiToHz(m){ return 440 * Math.pow(2, (m - 69)/12); }
  function linearFromDb(db){ return Math.pow(10, db/20); }

  function makeNoiseBuffer(ctx, rateHz=0){
    const sr = ctx.sampleRate|0;
    const seconds = 2.0;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);

    const r = Number(rateHz);
    if (!isFinite(r) || r <= 0){
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1);
      return buf;
    }

    // Sample & hold noise: change value 'r' times per second.
    const step = Math.max(1, Math.floor(sr / Math.max(1, r)));
    let v = (Math.random()*2-1);
    for(let i=0;i<len;i++){
      if ((i % step) === 0) v = (Math.random()*2-1);
      d[i] = v;
    }
    return buf;
  }

  function makePulseWave(ctx, duty){
    // duty: 0..1 (0.5 = square). DC is removed to avoid offset clicks.
    const d = clamp(Number(duty)||0.5, 0.01, 0.99);
    const H = 64; // harmonics
    const real = new Float32Array(H+1);
    const imag = new Float32Array(H+1);
    real[0] = 0; imag[0] = 0; // remove DC (a0)
    for (let k=1;k<=H;k++){
      const ang = 2*Math.PI*k*d;
      const a = 2 * Math.sin(ang) / (Math.PI * k);
      const b = 2 * (1 - Math.cos(ang)) / (Math.PI * k);
      real[k] = a;
      imag[k] = b;
    }
    try{
      return ctx.createPeriodicWave(real, imag, { disableNormalization:false });
    }catch(_e){
      return ctx.createPeriodicWave(real, imag);
    }
  }

  class ClockScheduler {
    constructor(ctx, opts={}){
      this.ctx = ctx;
      this.lookaheadSec = opts.lookaheadSec ?? 0.12;
      this.intervalMs = opts.intervalMs ?? 25;
      this._timer = null;
      this._queue = []; // {t:audioTime, fn}
      this._running = false;
      this._lastPumpMs = 0;
    }
    start(){
      if (this._running) return;
      this._running = true;
      this._lastPumpMs = nowMs();
      this._timer = setInterval(()=>this._pump(), this.intervalMs);
    }
    stop(){
      this._running = false;
      if (this._timer){ clearInterval(this._timer); this._timer = null; }
      this._queue.length = 0;
    }
    schedule(audioTime, fn){
      const item = { t: audioTime, fn };
      let i = this._queue.length;
      while(i>0 && this._queue[i-1].t > audioTime) i--;
      this._queue.splice(i, 0, item);
    }
    _pump(){
      if (!this._running) return;
      const tNow = this.ctx.currentTime;
      const tMax = tNow + this.lookaheadSec;
      while(this._queue.length && this._queue[0].t <= tMax){
        const it = this._queue.shift();
        try { it.fn(it.t); } catch(e){ console.error('[SQAE] scheduled fn error', e); }
      }
      this._lastPumpMs = nowMs();
    }
  }

  class SQAudioEngine {
    constructor(opts={}){
      const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
      if (!AudioContextCtor) throw new Error('WebAudio not supported');

      this.ctx = opts.audioContext || new AudioContextCtor({ latencyHint: opts.latencyHint ?? 'interactive' });
      this.state = 'init';

      // Master
      this.master = this.ctx.createGain();
      this.master.gain.value = 1.0;
      this.master.connect(this.ctx.destination);

      // Buses
      this.buses = new Map();
      this.createBus('master', { gain: 1.0 });

      // Banks
      this.toneBank = null;
      this.waveBank = null;
      this._waves = new Map();
      this._pulseWaves = new Map(); // duty -> PeriodicWave

      // Noise
      this._noiseBuf = null;
      this._noiseBufs = new Map(); // rateHz -> AudioBuffer

      // Voice management (mono slots)
      this._activeMono = new Map(); // toneId -> {stopAt:number, stopper:(tStop)=>void}
      this._voiceSerial = 1;
      // Track active voices so we can hard-stop them (used by Tune Player / loop stop).
      this._voices = new Map(); // voiceId -> { stop:(t:number)=>void }

      // Scheduler
      this.sched = new ClockScheduler(this.ctx, {
        lookaheadSec: opts.lookaheadSec,
        intervalMs: opts.intervalMs,
      });

      // Safety: stop scheduling when hidden to avoid runaway
      if (typeof document !== 'undefined'){
        document.addEventListener('visibilitychange', ()=>{
          if (document.hidden) this.sched.stop();
          else if (this.state === 'running') this.sched.start();
        });
      }
    }

    // --- Lifecycle ---
    async unlock(){
      // Call from a user gesture (iOS/Safari requirement).
      if (this.ctx.state === 'suspended'){
        await this.ctx.resume();
      }
      if (!this._noiseBuf) this._noiseBuf = makeNoiseBuffer(this.ctx);
      if (!this._noiseBufs) this._noiseBufs = new Map();
      this.state = 'running';
      this.sched.start();
      return true;
    }

    suspend(){
      this.sched.stop();
      this.state = 'suspended';
      return this.ctx.suspend();
    }

    async resume(){
      await this.ctx.resume();
      this.state = 'running';
      this.sched.start();
    }

    // Hard-stop all currently playing voices (for transport stop / emergency).
    stopAllVoices(tStop=null){
      const t = (tStop != null) ? tStop : (this.ctx.currentTime + 0.01);
      for (const [vid, v] of this._voices.entries()){
        try{ v.stop(t); }catch(_e){}
        this._voices.delete(vid);
      }
      this._activeMono.clear();
    }

    // --- Master/Buses ---
    createBus(busKey, {gain=1.0, pan=0}={}){
      const g = this.ctx.createGain();
      g.gain.value = gain;

      let p = null;
      if (typeof this.ctx.createStereoPanner === 'function'){
        p = this.ctx.createStereoPanner();
        p.pan.value = clamp(pan, -1, 1);
        g.connect(p);
        p.connect(this.master);
      } else {
        g.connect(this.master);
      }

      this.buses.set(busKey, {gain: g, pan: p});
      return busKey;
    }

    setBusGain(busKey, value){
      const b = this.buses.get(busKey);
      if (!b) throw new Error('Unknown bus: '+busKey);
      b.gain.gain.value = value;
    }

    setMasterGain(value){ this.master.gain.value = value; }
    setMasterDb(db){ this.master.gain.value = linearFromDb(db); }

    // --- Banks ---
    loadBanks({toneBank=null, waveBank=null}={}){
      if (toneBank) this._validateToneBank(toneBank);
      if (waveBank) this._validateWaveBank(waveBank);

      this.toneBank = toneBank || this.toneBank;
      this.waveBank = waveBank || this.waveBank;

      if (this.waveBank){
        this._waves.clear();
        for (const [id, w] of Object.entries(this.waveBank.waves || {})){
          const real = new Float32Array(w.real || []);
          const imag = new Float32Array(w.imag || []);
          try{
            this._waves.set(id, this.ctx.createPeriodicWave(real, imag, {disableNormalization:false}));
          }catch(e){
            console.warn('[SQAE] periodic wave failed for', id, e);
          }
        }
      }
    }

    _validateToneBank(tb){
      if (!tb || typeof tb !== 'object') throw new Error('toneBank must be object');
      if (!tb.tones || typeof tb.tones !== 'object') throw new Error('toneBank.tones required');
      for (const [id, t] of Object.entries(tb.tones)){
        if (!id) throw new Error('toneId empty');
        if (!t || typeof t !== 'object') throw new Error('tone '+id+' invalid');
        if (!t.osc || typeof t.osc !== 'object') throw new Error('tone '+id+' missing osc');
        const type = t.osc.type;
        const ok = ['sine','square','triangle','sawtooth','noise','wave'].includes(type);
        if (!ok) throw new Error('tone '+id+' osc.type invalid: '+type);
        if (type==='wave' && !t.osc.waveId) throw new Error('tone '+id+' osc.waveId required');
      }
    }

    _validateWaveBank(wb){
      if (!wb || typeof wb !== 'object') throw new Error('waveBank must be object');
      if (!wb.waves || typeof wb.waves !== 'object') throw new Error('waveBank.waves required');
    }

    // --- Note/Voice ---
    playNote(params){
      // params: {toneId, n|hz, v, t0, dSec, busKey, pan}
      const toneId = params.toneId;
      if (!this.toneBank) throw new Error('toneBank not loaded');
      const tone = this.toneBank.tones[toneId];
      if (!tone) throw new Error('Unknown toneId: '+toneId);

      const t0 = (params.t0 != null) ? params.t0 : this.ctx.currentTime;
      const v = clamp(numOr(params.v, 1.0), 0, 1);
      const busKey = params.busKey || 'master';
      const bus = this.buses.get(busKey);
      if (!bus) throw new Error('Unknown bus: '+busKey);

      const hz = (params.hz != null) ? params.hz : midiToHz(params.n ?? 69);
      // Defensive: params.dSec may be NaN (e.g., parsed from empty UI field).
      const dSec = Math.max(0.001, numOr(params.dSec, 0.25));

      const env0 = tone.env || {attack:0.005, decay:0.03, sustain:0.7, release:0.06};
      // Defensive: allow either {a,d,s,r} or {attack,decay,sustain,release} and avoid NaN.
      const env = {
        attack:  numOr(env0.attack ?? env0.a, 0.005),
        decay:   numOr(env0.decay  ?? env0.d, 0.03),
        sustain: numOr(env0.sustain?? env0.s, 0.7),
        release: numOr(env0.release?? env0.r, 0.06),
      };
      const baseGain = numOr(tone.gain, 0.8);
      const panVal = clamp((params.pan ?? tone.pan ?? 0), -1, 1);
      const fx = (params && params.fx && typeof params.fx === 'object') ? params.fx : null;

      // Mono handling (per toneId)
      const monoMode = tone.mono || 'poly';
      if (monoMode !== 'poly'){
        const prev = this._activeMono.get(toneId);
        if (prev){
          const cutMs = tone.monoCutMs ?? 12;
          try { prev.stopper(t0 + (cutMs/1000)); } catch(_){}
          this._activeMono.delete(toneId);
        }
      }

      const voiceId = this._voiceSerial++;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);

      // ADSR (using exponential ramps for click-free envelopes)
      const peak = Math.max(0.0002, baseGain * v);
      const tA = t0 + clamp(env.attack, 0, 4);
      const tD = tA + clamp(env.decay, 0, 4);
      const sus = clamp(env.sustain, 0, 1);
      const tOff = t0 + dSec;
      const tR = tOff + clamp(env.release, 0.001, 6);

      // Final safety: exponentialRamp requires finite times.
      // If something slipped through, fall back to sane defaults instead of crashing scheduling.
      const tA2 = Number.isFinite(tA) ? tA : (t0 + 0.005);
      const tD2 = Number.isFinite(tD) ? tD : (tA2 + 0.03);
      const tOff2 = Number.isFinite(tOff) ? tOff : (t0 + 0.25);
      const tR2 = Number.isFinite(tR) ? tR : (tOff2 + 0.06);

      // --- ADSR scheduling (early noteOff-safe) ---
      const g0 = 0.0001;
      const susLevel = Math.max(0.0002, peak * sus);

      // exponential-ramp interpolation helper:
      // v(t) = v0 * (v1/v0)^p  where p in [0..1]
      function expAt(v0, v1, t0x, t1x, tx){
        if (!(t1x > t0x)) return v1;
        const p = (tx - t0x) / (t1x - t0x);
        const pp = Math.max(0, Math.min(1, p));
        const a = Math.max(g0, v0);
        const b = Math.max(g0, v1);
        return a * Math.pow(b / a, pp);
      }

      // Always schedule A and D (these may be cut short later)
      g.gain.exponentialRampToValueAtTime(peak, tA2);
      g.gain.exponentialRampToValueAtTime(susLevel, tD2);

      if (tOff2 <= tD2){
        // noteOff occurs during Attack or Decay
        const levelAtOff = (tOff2 <= tA2)
          ? expAt(g0, peak, t0,  tA2, tOff2)   // during Attack
          : expAt(peak, susLevel, tA2, tD2, tOff2); // during Decay

        // Remove scheduled ramps after tOff2 and start release from the computed level
        if (typeof g.gain.cancelScheduledValues === "function"){
          g.gain.cancelScheduledValues(tOff2);
        }
        g.gain.setValueAtTime(Math.max(g0, levelAtOff), tOff2);
        g.gain.exponentialRampToValueAtTime(g0, tR2);
      } else {
        // Normal case: hold sustain until noteOff, then release
        g.gain.setValueAtTime(susLevel, tOff2);
        g.gain.exponentialRampToValueAtTime(g0, tR2);
      }

      // Optional filter inserted before gain (tone.filter and/or per-note fx.flt)
      let nodeOut = g;
      let filterNode = null;

      const toneFilt = tone.filter || null;
      const noteFilt = (fx && fx.flt && typeof fx.flt === 'object') ? fx.flt : null;

      if (toneFilt || noteFilt){
        const f = this.ctx.createBiquadFilter();

        // Base (tone) defaults
        const baseType = (toneFilt && toneFilt.type) ? toneFilt.type : 'lowpass';
        const baseFreq = (toneFilt && toneFilt.freq!=null) ? toneFilt.freq : 1200;
        const baseQ    = (toneFilt && toneFilt.q!=null)    ? toneFilt.q    : null;
        const baseG    = (toneFilt && toneFilt.gain!=null) ? toneFilt.gain : null;

        // Apply base first
        f.type = baseType;
        f.frequency.setValueAtTime(Math.max(10, numOr(baseFreq, 1200)), t0);
        if (baseQ != null) f.Q.setValueAtTime(Math.max(0.0001, numOr(baseQ, 1)), t0);
        if (baseG != null) f.gain.setValueAtTime(numOr(baseG, 0), t0);

        // Apply per-note overrides/sweep
        if (noteFilt){
          if (noteFilt.type) f.type = noteFilt.type;

          // Q/gain (static per note for now)
          if (noteFilt.q != null) f.Q.setValueAtTime(Math.max(0.0001, numOr(noteFilt.q, 1)), t0);
          if (noteFilt.gain != null) f.gain.setValueAtTime(numOr(noteFilt.gain, 0), t0);

          const fFrom = (noteFilt.from != null) ? numOr(noteFilt.from, null) : null;
          const fTo   = (noteFilt.to   != null) ? numOr(noteFilt.to,   null) : null;
          const fTime = Math.max(0, numOr(noteFilt.time, 0));

          if (fFrom != null) f.frequency.setValueAtTime(Math.max(10, fFrom), t0);

          if (fTo != null && fTime > 0){
            const t1 = t0 + fTime;
            const curve = noteFilt.curve || 'lin';
            if (curve === 'exp' && fTo > 0 && (fFrom == null || fFrom > 0)){
              // Only safe for positive values
              f.frequency.exponentialRampToValueAtTime(Math.max(10, fTo), t1);
            } else {
              f.frequency.linearRampToValueAtTime(Math.max(10, fTo), t1);
            }
          } else if (fTo != null){
            f.frequency.setValueAtTime(Math.max(10, fTo), t0);
          }
        }

        filterNode = f;
        f.connect(g);
        nodeOut = f;
      }

      // Per-note panner
      let panner = null;
      if (typeof this.ctx.createStereoPanner === 'function'){
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(panVal, t0);
        g.connect(panner);
        panner.connect(bus.gain);
      } else {
        g.connect(bus.gain);
      }

      // Source
      let src = null;
      let stopFn = null;
      let lfo = null;
      let lfoStopFn = null;
      const osc = tone.osc;

      if (osc.type === 'noise'){
        const b = this.ctx.createBufferSource();
        const r = (osc.noiseRate!=null) ? Number(osc.noiseRate) : 0;
        if (isFinite(r) && r>0){
          const key = Math.floor(r);
          let nb = this._noiseBufs.get(key);
          if (!nb){ nb = makeNoiseBuffer(this.ctx, key); this._noiseBufs.set(key, nb); }
          b.buffer = nb;
        } else {
          b.buffer = this._noiseBuf || (this._noiseBuf = makeNoiseBuffer(this.ctx));
        }
        b.loop = true;
        src = b;
        b.connect(nodeOut);
        stopFn = (tStop)=>{ try{ b.stop(tStop); }catch(_){}; };
      } else {
        const o = this.ctx.createOscillator();
        if (osc.type === 'wave'){
          const pw = this._waves.get(osc.waveId);
          if (pw) o.setPeriodicWave(pw);
          else o.type = 'sine';
        } else {
          if (osc.type === 'square' && osc.duty!=null){
            const d = clamp(Number(osc.duty), 0.01, 0.99);
            if (Math.abs(d - 0.5) > 1e-9){
              let pw = this._pulseWaves.get(d);
              if (!pw){ pw = makePulseWave(this.ctx, d); this._pulseWaves.set(d, pw); }
              o.setPeriodicWave(pw);
            } else {
              o.type = 'square';
            }
          } else {
            o.type = osc.type;
          }
        }
        if (osc.detuneCents) o.detune.setValueAtTime(osc.detuneCents, t0);
        o.frequency.setValueAtTime(Math.max(1, hz), t0);

        // Per-note pitch sweep / vibrato (PhraseEvent.fx)
        if (fx){
          // Pitch sweep
          const notePitch = (fx.pitch && typeof fx.pitch === 'object') ? fx.pitch : null;
          if (notePitch){
            const mode = notePitch.mode || 'cents';
            const pTime = Math.max(0, numOr(notePitch.time, 0));
            const curve = notePitch.curve || 'lin';

            if (mode === 'hz'){
              const hzFrom = (notePitch.from != null) ? numOr(notePitch.from, null) : null;
              const hzTo   = (notePitch.to   != null) ? numOr(notePitch.to,   null) : null;

              if (hzFrom != null) o.frequency.setValueAtTime(Math.max(1, hzFrom), t0);
              if (hzTo != null && pTime > 0){
                if (curve === 'exp' && hzTo > 0 && (hzFrom == null || hzFrom > 0)){
                  o.frequency.exponentialRampToValueAtTime(Math.max(1, hzTo), t0 + pTime);
                } else {
                  o.frequency.linearRampToValueAtTime(Math.max(1, hzTo), t0 + pTime);
                }
              } else if (hzTo != null){
                o.frequency.setValueAtTime(Math.max(1, hzTo), t0);
              }
            } else {
              // default: cents (detune)
              const pFrom = (notePitch.from != null) ? numOr(notePitch.from, null) : null;
              const pTo   = (notePitch.to   != null) ? numOr(notePitch.to,   null) : null;

              if (pFrom != null) o.detune.setValueAtTime(pFrom, t0);
              if (pTo != null && pTime > 0){
                // detune can be negative, so use linear ramp
                o.detune.linearRampToValueAtTime(pTo, t0 + pTime);
              } else if (pTo != null){
                o.detune.setValueAtTime(pTo, t0);
              }
            }
          }

          // Vibrato (detune LFO in cents)
          const noteVib = (fx.vib && typeof fx.vib === 'object') ? fx.vib : null;
          if (noteVib){
            const rate  = Math.max(0.01, numOr(noteVib.rate, 5.0));
            const depth = Math.max(0,    numOr(noteVib.depth, 0)); // cents
            const delay = Math.max(0,    numOr(noteVib.delay, 0));
            const att   = Math.max(0,    numOr(noteVib.attack, 0.02));
            const rel   = Math.max(0,    numOr(noteVib.release, 0.03));

            if (depth > 0){
              const l = this.ctx.createOscillator();
              l.type = 'sine';
              l.frequency.setValueAtTime(rate, t0);

              const lg = this.ctx.createGain();
              lg.gain.setValueAtTime(0, t0);

              l.connect(lg);
              lg.connect(o.detune);

              // Simple envelope for vibrato depth
              const tOn   = t0 + delay;
              const tPeak = tOn + att;
              const tRel  = Math.min(tR2, tOff2 + rel);

              // Ensure scheduled from 0 (linear; avoid exp from 0)
              lg.gain.setValueAtTime(0, t0);
              lg.gain.setValueAtTime(0, tOn);
              if (att > 0) lg.gain.linearRampToValueAtTime(depth, tPeak);
              else lg.gain.setValueAtTime(depth, tOn);

              // Hold until noteOff then release
              lg.gain.setValueAtTime(depth, tOff2);
              if (tRel > tOff2) lg.gain.linearRampToValueAtTime(0, tRel);
              else lg.gain.setValueAtTime(0, tOff2);

              lfo = l;
              lfoStopFn = (tStop)=>{ try{ l.stop(tStop); }catch(_){}; };
            }
          }
        }
        src = o;
        o.connect(nodeOut);
        stopFn = (tStop)=>{ try{ o.stop(tStop); }catch(_){}; if (lfoStopFn) { try{ lfoStopFn(tStop); }catch(_){} } };
      }

      // Start/Stop
      try{
        src.start(t0);
        if (lfo) lfo.start(t0);
        src.stop(tR + 0.02); // hard stop after release tail
        if (lfoStopFn) lfoStopFn(tR + 0.02);
      }catch(e){
        console.warn('[SQAE] voice start/stop error', e);
      }

      // Track voice for transport stop. Also auto-clean after tail.
      if (stopFn){
        this._voices.set(voiceId, { stop: stopFn });
        const tCleanup = (Number.isFinite(tR2) ? tR2 : (t0 + 1.0)) + 0.10;
        this.sched.schedule(tCleanup, ()=>{ this._voices.delete(voiceId); });
      }

      if (monoMode !== 'poly'){
        this._activeMono.set(toneId, { stopAt: tR, stopper: stopFn });
      }

      // For debugging/inspection
      return { voiceId, t0, tOff, tR, toneId, busKey, hasFilter: !!filterNode };
    }

    // --- Phrase/Song playback ---
    playPhrase(phrase, opts={}){
      const ph = phrase || {events:[]};
      const tempo = opts.tempo ?? ph.tempo ?? 120;
      const busKeyDefault = opts.busKey ?? 'master';
      const toneIdDefault = opts.toneId ?? null;
      const tStart = opts.tStart ?? this.ctx.currentTime;

      const beatSec = 60 / Math.max(1, tempo);

      for (const ev of (ph.events||[])){
        const t = tStart + (ev.t||0) * beatSec;
        const dBeat = ev.d ?? 0.25;
        const dSec = Math.max(0.001, dBeat * beatSec);
        const toneId = ev.toneId || toneIdDefault;
        if (!toneId) continue;

        const v = ev.v ?? 1.0;
        const busKey = ev.busKey || busKeyDefault;

        this.sched.schedule(t, ()=>{
          this.playNote({
            toneId,
            n: ev.n,
            hz: ev.hz,
            v,
            t0: t,
            dSec,
            busKey,
            pan: ev.pan,
            fx: ev.fx,
          });
        });
      }

      return { tStart, tempo, count: (ph.events||[]).length };
    }

    playSong(song, opts={}){
      const sg = song || {tracks:[]};
      const tempo = opts.tempo ?? sg.tempo ?? 120;
      const tStart = opts.tStart ?? this.ctx.currentTime;
      const loop = opts.loop ?? sg.loop ?? null;
      const beatSec = 60 / Math.max(1, tempo);

      let loopTimer = null;

      const handle = {
        id: 'song_'+Math.floor(Math.random()*1e9).toString(36),
        stopped: false,
        stop: ()=>{
          handle.stopped = true;
          if (loopTimer){ clearInterval(loopTimer); loopTimer = null; }
          // Flush queued song events and hard-stop currently playing voices.
          this.sched.stop();
          if (this.state === 'running') this.sched.start();
          this.stopAllVoices(this.ctx.currentTime + 0.01);
        },
      };

      const scheduleTracks = (tBase, beatShift=0, onlyWindow=null, windowBeatBase=0)=>{
        for (const tr of (sg.tracks||[])){
          const busKeyDefault = tr.busKey || 'master';
          const toneIdDefault = tr.toneId || null;

          for (const ev of (tr.events||[])){
            const bt = (ev.t||0);
            if (onlyWindow && (bt < onlyWindow.start || bt >= onlyWindow.end)) continue;

            // If scheduling a loop window, align beats to windowBeatBase.
            const beatInWin = bt - windowBeatBase;
            const beat = beatInWin + beatShift;

            const t = tBase + beat * beatSec;

            let dBeat = ev.d ?? 0.25;

            // --- Loop clamp: prevent notes from crossing the scheduling window end ---
            // This avoids a common loop-gap cause: a note tail (t+d) barely crossing loop.end, pushing loop length up by 1 phrase.
            // Opt-out: pass opts.loopClamp === false to playSong().
            if (opts.loopClamp !== false && onlyWindow && Number.isFinite(onlyWindow.end)){
              const eps = 1e-9;
              const endBeat = bt + dBeat;
              if (endBeat > (onlyWindow.end - eps)){
                dBeat = Math.max(0, (onlyWindow.end - bt) - eps);
                if (dBeat <= 0) continue;
              }
            }

            const dSec = Math.max(0.001, dBeat * beatSec);

            const toneId = ev.toneId || toneIdDefault;
            if (!toneId) continue;

            const v = ev.v ?? 1.0;
            const busKey = ev.busKey || busKeyDefault;

            this.sched.schedule(t, ()=>{
              if (handle.stopped) return;
              this.playNote({ toneId, n: ev.n, hz: ev.hz, v, t0: t, dSec, busKey, pan: ev.pan, fx: ev.fx });
            });
          }
        }
      };

      // --- One-shot schedule ---
      if (loop && typeof loop.start==='number' && typeof loop.end==='number' && loop.end > loop.start){
        // Schedule the intro section [0 .. loop.end) once.
        scheduleTracks(tStart, 0, {start: 0, end: loop.end}, 0);

        // If there are events AFTER the loop end, schedule them once as well.
        scheduleTracks(tStart, 0, {start: loop.end, end: Number.POSITIVE_INFINITY}, 0);

        const loopLenBeats = loop.end - loop.start;
        const loopLenSec = loopLenBeats * beatSec;

        // Schedule loop windows continuously, ahead of time.
        // loopBaseT is the audioTime where the first repeat window starts (immediately after intro).
        // Use an integer loop index to avoid drift from repeated floating-point additions.
        const loopBaseT = tStart + loop.end * beatSec;
        const loopLeadSec = opts.loopLeadSec ?? 6.0; // ★追加：ループ頭の何秒前から“次周回”を積むか
        let nextLoopI = 0; // 0,1,2... where 0 corresponds to loopBaseT

        const pumpLoop = ()=>{
          if (handle.stopped) return;
          const tNow = this.ctx.currentTime;
          // ★変更：lookahead だけだと「ループ頭直前にまとめて積む」になりがちで間に合わないことがある
          // → 数秒の“先行バッファ”を足して、早めに積む
          const tMax = tNow + this.sched.lookaheadSec + loopLeadSec;

          // Keep filling until the scheduler horizon is satisfied.
          while ((loopBaseT + nextLoopI * loopLenSec) <= tMax){
            const nextLoopT = loopBaseT + nextLoopI * loopLenSec;
            // Window beats are [loop.start .. loop.end)
            // Place the window starting at nextLoopT, aligned so that beat loop.start maps to nextLoopT.
            scheduleTracks(nextLoopT, 0, {start: loop.start, end: loop.end}, loop.start);
            nextLoopI++;
          }
        };

        // ★追加：最初の周回は“遠くても”先に積んでおく（ここが効く）
        scheduleTracks(loopBaseT, 0, {start: loop.start, end: loop.end}, loop.start);
        nextLoopI = 1;

        // Prime: schedule further repeats.
        pumpLoop();        loopTimer = setInterval(pumpLoop, Math.max(20, this.sched.intervalMs));
      } else {
        // No loop: schedule everything once.
        scheduleTracks(tStart, 0, null, 0);
      }

      return handle;
    }

  }

  const SQAE = {
    version: 'vNext_hardline_v0.1',
    create(opts){ return new SQAudioEngine(opts); },
    midiToHz,
    linearFromDb,
  };

  // CommonJS (optional) + global
  if (typeof module !== 'undefined' && module.exports){
    module.exports = SQAE;
  }
  global.SQAE = SQAE;

})(typeof window !== 'undefined' ? window : globalThis);
