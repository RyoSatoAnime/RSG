(() => {
  "use strict";

  const SUBSTEPS = 6;
  const GRAVITY = 0.60;
  const MAX_SPEED = 45;
  const BALL_ROLL_AUDIO_MAX_SPEED = MAX_SPEED;
  const BALL_ROLL_AUDIO_DEBUG = false;
  const BALL_RADIUS = 22;

  const SHOTMAP_ENABLED = true;
  const SHOTMAP_FIRE_DEBUG = false;
  const SHOTMAP_FIRE_MARGIN = 2;
  const SHOTMAP_RATIO_MIN = 0.12;
  const SHOTMAP_RATIO_MAX = 0.88;
  const SHOTMAP_RATIO_TOLERANCE = 0.04;
  const SHOTMAP_PUSH_OUT = 3;
  const SHOTMAP_POSITION_COUNT = 8;
  const SHOT_POWER_BY_POSITION = [
    20, 38, 40, 42, 42, 45, 48, 55
  ];

  const LEFT_SHOT_ANGLE_DEG = [
    -106, -98, -91, -87, -81, -76, -70, -66
  ];

  const RIGHT_SHOT_ANGLE_DEG =
    LEFT_SHOT_ANGLE_DEG.map(angleDeg => -180 - angleDeg);

  const shotMapState = {
    skipFlipperCollisionSubsteps: 0
  };

  const ball = { x: 0, y: 0, vx: 0, vy: 0 };

  let ballInPlay = false;
  let waitingForLaunch = true;
  let launchRequested = false;
  let lastLaunchAtMs = 0;
  const secondChanceState = {
    available: false,
    firstLaunchAtMs: null,
    elapsedMs: 0
  };

  const STUCK_SPEED_EPS = 0.35;
  const STUCK_MOVE_EPS = 3.0;
  const STUCK_TIME_MS = 1200;
  const SPINNER_PULSE_FRAMES = 5;

  const HIGH_SCORE_PARTICLE_THRESHOLD = 1000;
  const HIGH_SCORE_PARTICLE_COUNT = 16;
  const HIGH_SCORE_PARTICLE_MAX_COUNT = 48;
  const HIGH_SCORE_PARTICLE_LIFE_MIN_MS = 400;
  const HIGH_SCORE_PARTICLE_LIFE_MAX_MS = 650;
  const HIGH_SCORE_PARTICLE_SPEED_MIN = 4;
  const HIGH_SCORE_PARTICLE_SPEED_MAX = 10;
  const HIGH_SCORE_PARTICLE_GRAVITY = 0.025;
  const HIGH_SCORE_PARTICLE_SIZE_MIN = 3;
  const HIGH_SCORE_PARTICLE_SIZE_MAX = 6;

  const highScoreParticles = [];

  let SFXmute = false;
  const TOP_LANE_PASS_COOLDOWN_FRAMES = 6;
  const ORBIT_LANE_TRIGGER_COOLDOWN_FRAMES = 12;
  const WALL_BUMP_HIT_COOLDOWN_FRAMES = 12;
  const CENTER_POST_SFX_MIN_SPEED = 10;
  const CENTER_POST_SFX_COOLDOWN_FRAMES = 12;

  const TABLE777_SLOT_LEVEL_THRESHOLDS = [1, 3, 8];
  const TABLE777_SLOT_LEVEL_UP_SCORES = [0, 100, 300];
  const TABLE777_LOOP_VALUE_INITIAL = 20;
  const TABLE777_LOOP_VALUE_ADD = 20;
  const TABLE777_LOOP_VALUE_MAX = 100;
  const TABLE777_SAUCER_VALUE_INITIAL = 50;
  const TABLE777_SAUCER_VALUE_ADD = 50;
  const TABLE777_SAUCER_VALUE_MAX = 200;
  const TABLE777_SAUCER_VALUE_THRESHOLDS = [10, 25, 50];

  const TABLE777_SLOT_SYMBOLS = ["bar", "bell", "seven", "kickback", "ballSave"];

  const TABLE777_SLOT_LEVEL_WEIGHTS = [
    { bar: 48, bell: 18, seven: 10, kickback: 12, ballSave: 12 },
    { bar: 28, bell: 34, seven: 14, kickback: 12, ballSave: 12 },
    { bar: 18, bell: 28, seven: 34, kickback: 10, ballSave: 10 }
  ];

  const TABLE777_GUARANTEED_SYMBOL_BY_LEVEL = ["bar", "bell", "seven"];

  const TABLE777_SLOT_FEATURE_DURATION_MS = 5000;

  const TABLE777_SLOT_VISUAL_W = 400;
  const TABLE777_SLOT_VISUAL_H = 140;
  const TABLE777_SLOT_DRUM_COUNT = 3;
  const TABLE777_SLOT_DRUM_W = TABLE777_SLOT_VISUAL_W / TABLE777_SLOT_DRUM_COUNT;
  const TABLE777_SLOT_DRUM_WINDOW = { top: 14, bottom: 127 };
  const TABLE777_SLOT_SYMBOL_H = TABLE777_SLOT_DRUM_WINDOW.bottom - TABLE777_SLOT_DRUM_WINDOW.top;

  const TABLE777_SLOT_SYMBOL_DEFS = [
    { id: "bar",      label: "BAR",       color: "#fff", kind: "payout" },
    { id: "bell",     label: "BELL",      color: "#ffd84a", kind: "payout" },
    { id: "seven",    label: "7",         color: "#b12", kind: "payout" },
    { id: "kickback", label: "KICKBACK",  color: "#5ef", kind: "feature" },
    { id: "ballSave", label: "BALL SAVE", color: "#85f", kind: "feature" }
  ];

  const TABLE777_SLOT_REEL_STRIP_IDS = [
    ["bar", "bell", "bar", "seven", "kickback", "bar", "bell", "ballSave"],
    ["bar", "bar", "bell", "seven", "bar", "kickback", "bell", "ballSave"],
    ["bar", "bell", "bar", "ballSave", "seven", "bar", "kickback", "bell"]
  ];

  const TABLE777_LOOP_TRIGGER_TIMEOUT_MS = 1000;

  const table777LoopTriggerPairState = {
    firstTriggerId: null,
    timerMs: 0
  };

  const table777OrbitBonusState = {
    active: false,
    sequence: null,
    stepIndex: 0,
    timerMs: 0,
    triggerWasInside: []
  };

  const table777SlotVisualState = {
    initialized: false,
    spinning: false,
    result: null,
    label: "",
    payout: 0,
    message: "",
    wasGuaranteed: false,
    flashTimerMs: 0,
    drums: []
  };

  const table777DelayedSlotMessageState = {
    timerMs: 0,
    message: "",
    frames: 90
  };

  const table777PendingSlotRewardState = {
    timerMs: 0,
    reward: null
  };

  const table777SlotSymbolSpriteState = {
    src: "",
    images: {},
    ready: false,
    loading: false,
    failed: false,
    objectUrls: []
  };

  const NUDGE_COOLDOWN_MS = 1000;
  const NUDGE_POWER_Y = -7.0;
  const NUDGE_MIN_Y = 760;

  let nudgeCooldownMs = 0;
  let nudgeCountThisGame = 0;

  let stuckTimerMs = 0;
  let stuckSampleX = 0;
  let stuckSampleY = 0;
  let stuckRelaunchAvailable = false;
  let currentStuckZoneId = null;

  const DEBUG = false;
  const SCORE_LOG_DEBUG = false;

  let score = 0;

  const GAME_CONFIG = {
    ballsPerGame: 5,
    resultInputLockFrames: 102
  };

  function getBallsPerGame() {
    const configured = TABLE?.game?.ballsPerGame;
    if (!Number.isFinite(configured)) return GAME_CONFIG.ballsPerGame;
    return Math.max(1, Math.floor(configured));
  }

  const RECORDS_STORAGE_KEY_PREFIX = "rcp.records.v1";
  const MAX_RECORDS = 5;

  const recordsState = {
    entries: [],
    currentGameRecorded: false,
    lastInsertedIndex: -1
  };

  const CANVAS_BACKGROUND_COLOR = "#171717";

  // Runtime SVG assets live in ./svg/.
  // Put future in-game SVG files there and reference them with "./svg/<file>.svg".
  const DEFAULT_ASSETS = {
    playfieldLogo: {
      src: "./svg/rcp_logo.svg",
      x: 256,
      y: 876,
      scale: 0.377,
      opacity: 1
    },
    titleLogo: {
      src: "./svg/rcp_logo.svg",
      scale: 0.9,
      opacity: 1,
      offsetY: -15
    }
  };

  function getTableSelectItems() {
    const tables = window.RCP_TABLES || {};
    const items = Object.entries(tables).map(([key, table]) => ({
      id: table.id || key,
      label: table.label || table.id || key
    }));

    if (items.length > 0) return items;

    return [
      { id: "table1", label: "Table 1" }
    ];
  }

  const TABLE_SELECT_ITEMS = getTableSelectItems();

  const titleState = {
    active: true,
    selectedTableIndex: 0
  };

  const overlayState = {
    mode: "none",
    returnTo: "title"
  };

  const TITLE_PANEL = {
    x: 40,
    y: 310,
    w: 660,
    h: 660
  };

  let playfieldLogoImage = null;
  let playfieldLogoReady = false;
  let playfieldLogoLoadStarted = false;

  let playfieldMaskImage = null;
  let playfieldMaskReady = false;
  let playfieldMaskLoadStarted = false;

  let centerValueDoublerIndicatorImage = null;
  let centerValueDoublerIndicatorReady = false;
  let centerValueDoublerIndicatorLoadStarted = false;

  let titleLogoImage = null;
  let titleLogoReady = false;
  let titleLogoLoadStarted = false;

  let howToOverlayImage = null;
  let howToOverlayReady = false;
  let howToOverlayLoadStarted = false;

  const imageCacheBySrc = new Map();

  const STATIC_PLAYFIELD_CACHE_SLOT = {
    wallsDrainOrbit: 0,
    topLaneDividers: 1,
    playfieldLogo: 2,
    posts: 3
  };
  const STATIC_PLAYFIELD_CACHE_SLOT_COUNT = 4;

  const staticPlayfieldCache = {
    canvas: null,
    ready: false,
    slotHeight: 0
  };

  function getImageCacheKey(kind, cfg) {
    return kind + ":" + (cfg?.src ?? "");
  }

  const gameState = {
    status: "ready",
    currentBall: 1,
    resultInputLock: 0
  };

  const DEFAULT_DISPLAY_HINTS = [
    "L TARGETS BUILD ORBIT",
    "R TARGETS BOOST ORBIT",
    "BUMPERS BUILD BONUS",
    "TOP LANES BOOST MULT",
    "SPINNERS LEVEL BUMPERS"
  ];

  const displayState = {
    message: "",
    messageTimer: 0,
    mode: "normal",
    lastBonusTotal: 0,
    lastTotalScore: 0,
    lastLostBall: 0,
    hintIndex: 0,
    awaitingFirstLaunchMessage: false,
    centerValueDisplayUnlocked: false
  };

  const DEFAULT_RULE_CONFIG = {
    orbitTargetBaseInitialScore: 100,
    orbitTargetBaseAdd: 100,
    orbitTargetBaseMaxScore: 1000,
    orbitBoostBonusScore: 1000,
    orbitBoostDurationMs: 6000,

    topDropBankBonusInitialScore: 500,
    topDropBankBonusAdd: 500,
    topDropBankBonusMaxScore: 2000,
    topDropResetDelayMs: 2000,
    dropTargetGroupResetDelayMs: 2000,
    kickbackDurationMs: 6000,
    ballSaveDurationMs: 8000,

    dropTargetScores: {
      orbitValue: {
        hit: 25,
        bankComplete: 100
      },
      orbitBoost: {
        hit: 25,
        bankComplete: 100
      }
    },

    bumperScores: [15, 30, 50],
    bumperLevelThresholds: [],
    bumperBonusValueAdd: 1000,
    bumperBonusValueThresholds: [10, 25, 45, 70, 100],

    spinnerScorePerSpin: 10,
    spinnerValueInitialScore: 10,
    spinnerValueAdd: 0,
    spinnerValueMaxScore: 10,
    spinnerBumperLevelThresholds: [50, 150],
    spinnerOrbitValueThresholds: [],
    spinnerBonusValueThresholds: [],

    bonusValueInitialScore: 0,
    bonusValueAdd: 0,
    bonusValueMaxScore: Number.POSITIVE_INFINITY,
    bonusValuePersistsOnBallLoss: false,
    collectBonusOnBallLoss: true,

    centerValueInitialScore: 250,
    centerValueAdd: 250,
    centerValueMaxScore: 2000,
    spinnerCenterValueThresholds: [],

    centerValueDoublerMultiplier: 1,
    centerValueDoublerDurationMs: 0,
    centerValueDoublerResetDelayMs: 0,
    centerValueDoublerTriggerTargets: [],

    topLaneScore: 10,
    topLaneCompleteScore: 200,
    bonusMultMax: 5,

    wallBumpScore: 5,

    loopBonusScore: 100
  };

  function cloneDropTargetScores(dropTargetScores) {
    const src = dropTargetScores || {};
    const result = {};
    for (const [group, scores] of Object.entries(src)) {
      result[group] = scores && typeof scores === "object" ? { ...scores } : scores;
    }
    return result;
  }

  function cloneRuleConfig(config) {
    return {
      ...config,
      dropTargetScores: cloneDropTargetScores(config.dropTargetScores),
      bumperScores: Array.isArray(config.bumperScores) ? config.bumperScores.slice() : [],
      bumperLevelThresholds: Array.isArray(config.bumperLevelThresholds)
        ? config.bumperLevelThresholds.slice()
        : [],
      bumperBonusValueThresholds: Array.isArray(config.bumperBonusValueThresholds)
        ? config.bumperBonusValueThresholds.slice()
        : [],
      spinnerBumperLevelThresholds: Array.isArray(config.spinnerBumperLevelThresholds)
        ? config.spinnerBumperLevelThresholds.slice()
        : [],
      spinnerOrbitValueThresholds: Array.isArray(config.spinnerOrbitValueThresholds)
        ? config.spinnerOrbitValueThresholds.slice()
        : [],
      spinnerCenterValueThresholds: Array.isArray(config.spinnerCenterValueThresholds)
        ? config.spinnerCenterValueThresholds.slice()
        : [],
      spinnerBonusValueThresholds: Array.isArray(config.spinnerBonusValueThresholds)
        ? config.spinnerBonusValueThresholds.slice()
        : [],
      centerValueDoublerTriggerTargets: Array.isArray(config.centerValueDoublerTriggerTargets)
        ? config.centerValueDoublerTriggerTargets.slice()
        : []
    };
  }

  function mergeDropTargetScores(base, overrides) {
    const result = cloneDropTargetScores(base);
    const src = overrides || {};
    for (const [group, scores] of Object.entries(src)) {
      result[group] = {
        ...(result[group] || {}),
        ...(scores && typeof scores === "object" ? scores : {})
      };
    }
    return result;
  }

  function buildRuleConfig(tableRules) {
    const base = cloneRuleConfig(DEFAULT_RULE_CONFIG);
    if (!tableRules) {
      return base;
    }

    return {
      ...base,
      ...tableRules,
      dropTargetScores: mergeDropTargetScores(
        base.dropTargetScores,
        tableRules.dropTargetScores
      ),
      bumperScores: Array.isArray(tableRules.bumperScores)
        ? tableRules.bumperScores.slice()
        : base.bumperScores,
      bumperLevelThresholds: Array.isArray(tableRules.bumperLevelThresholds)
        ? tableRules.bumperLevelThresholds.slice()
        : base.bumperLevelThresholds,
      bumperBonusValueThresholds: Array.isArray(tableRules.bumperBonusValueThresholds)
        ? tableRules.bumperBonusValueThresholds.slice()
        : base.bumperBonusValueThresholds,
      spinnerBumperLevelThresholds: Array.isArray(tableRules.spinnerBumperLevelThresholds)
        ? tableRules.spinnerBumperLevelThresholds.slice()
        : base.spinnerBumperLevelThresholds,
      spinnerOrbitValueThresholds: Array.isArray(tableRules.spinnerOrbitValueThresholds)
        ? tableRules.spinnerOrbitValueThresholds.slice()
        : base.spinnerOrbitValueThresholds,
      spinnerCenterValueThresholds: Array.isArray(tableRules.spinnerCenterValueThresholds)
        ? tableRules.spinnerCenterValueThresholds.slice()
        : base.spinnerCenterValueThresholds,
      spinnerBonusValueThresholds: Array.isArray(tableRules.spinnerBonusValueThresholds)
        ? tableRules.spinnerBonusValueThresholds.slice()
        : base.spinnerBonusValueThresholds,
      centerValueDoublerTriggerTargets: Array.isArray(tableRules.centerValueDoublerTriggerTargets)
        ? tableRules.centerValueDoublerTriggerTargets.slice()
        : base.centerValueDoublerTriggerTargets
    };
  }

  // Runtime rules merged from DEFAULT_RULE_CONFIG and the active table rules.
  let RULE_CONFIG = cloneRuleConfig(DEFAULT_RULE_CONFIG);

  function applyRuleConfig(table) {
    RULE_CONFIG = buildRuleConfig(table?.rules);
  }

  const loopBonusState = {
    active: false,
    fromSpinnerId: null,
    passedCenter: false,
    timerMs: 0,
    centerWasInside: false
  };

  const loopRouteState = {
    active: false,
    sequence: null,
    stepIndex: 0,
    timerMs: 0,
    triggerWasInside: []
  };

  const orbitSoundState = {
    upWasInside: false,
    downWasInside: false,
    cooldownMs: 0
  };

  const saucerHoldState = {
    active: false,
    saucer: null,
    timerMs: 0
  };

  let orbitSfxCue = 0;
  let orbitSfxKind = null;

  const ruleState = {
    bonusValue: 0,
    bonusMult: 1,

    orbitBoostActive: false,
    orbitBoostTimerMs: 0,
    orbitTargetBaseScore: RULE_CONFIG.orbitTargetBaseInitialScore,
    orbitTargetValueStep: 0,

    bumperLevel: 0,
    bumperHitCount: 0,
    bumperBonusStep: 0,

    spinnerTotalSpins: 0,
    spinnerBonusValueStep: 0,
    spinnerValueScore: RULE_CONFIG.spinnerValueInitialScore,

    centerValueScore: RULE_CONFIG.centerValueInitialScore,
    centerValueStep: 0,

    centerValueDoublerActive: false,
    centerValueDoublerTimerMs: 0,
    centerValueDoublerTriggerHitState: {},
    centerValueDoublerTriggerResetTimerMs: 0,

    topDropBankBonusScore: 500,

    slotLevel: 0,
    loopCount: 0,
    loopValue: TABLE777_LOOP_VALUE_INITIAL,
    saucerValue: TABLE777_SAUCER_VALUE_INITIAL,
    guaranteedRoleReady: false,
    saucerValueStep: 0
  };

  const COLORS = {
    black: "#000",
    white: "#fff",
    cyan: "#0ff",
    rcpRed: "#b12",
    scoreFlash: "#ff0",
    cooldown: "#999",
    ballBase: "#e0e0e0",
    ballStroke: "#bfbfbf"
  };

  function getTableColor(name, fallbackName = name) {
    const tableColor = TABLE?.visual?.colors?.[name];
    if (typeof tableColor === "string" && tableColor) {
      return tableColor;
    }

    return COLORS[fallbackName] ?? COLORS[name] ?? "#fff";
  }

  function getTableColorValue(name, fallbackValue) {
    const tableColor = TABLE?.visual?.colors?.[name];
    if (typeof tableColor === "string" && tableColor) {
      return tableColor;
    }

    return fallbackValue;
  }

  function getBumperFlashFill() {
    const level = Math.max(0, Math.min(2, ruleState.bumperLevel));

    if (level === 0) {
      return getTableColor("scoreFlash", "scoreFlash");
    }

    if (level === 1) {
      return getTableColorValue("bumperFlashLevel1", "#f93");
    }

    return getTableColorValue("bumperFlashLevel2", getTableColor("flipper", "rcpRed"));
  }

  function getSpinnerPulseFill() {
    if (TABLE?.id !== "table1") {
      return getTableColor("scoreFlash", "scoreFlash");
    }

    const initial = RULE_CONFIG.spinnerValueInitialScore;
    const step = RULE_CONFIG.spinnerValueAdd;
    const calculatedLevel = step > 0
      ? Math.floor((ruleState.spinnerValueScore - initial) / step)
      : 0;
    const level = Math.max(0, Math.min(2, calculatedLevel));

    if (level <= 0) {
      return getTableColor("scoreFlash", "scoreFlash");
    }

    if (level === 1) {
      return getTableColorValue("bumperFlashLevel1", "#f93");
    }

    return getTableColor("flipper", "rcpRed");
  }

  function pushScoreLog(label, points, total) {
    if (!SCORE_LOG_DEBUG) return;
    console.log(label + ": " + points + "pt, total: " + total);
  }

  function spawnHighScoreParticles(x, y) {
    const color = getTableColor("scoreFlash", "scoreFlash");

    for (let i = 0; i < HIGH_SCORE_PARTICLE_COUNT; i++) {
      const angle =
        (Math.PI * 2 * i) / HIGH_SCORE_PARTICLE_COUNT +
        Math.random() * (Math.PI * 2 / HIGH_SCORE_PARTICLE_COUNT);
      const speed = HIGH_SCORE_PARTICLE_SPEED_MIN +
        Math.random() * (HIGH_SCORE_PARTICLE_SPEED_MAX - HIGH_SCORE_PARTICLE_SPEED_MIN);
      const lifeMs = HIGH_SCORE_PARTICLE_LIFE_MIN_MS +
        Math.random() * (HIGH_SCORE_PARTICLE_LIFE_MAX_MS - HIGH_SCORE_PARTICLE_LIFE_MIN_MS);

      highScoreParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: HIGH_SCORE_PARTICLE_SIZE_MIN +
          Math.random() * (HIGH_SCORE_PARTICLE_SIZE_MAX - HIGH_SCORE_PARTICLE_SIZE_MIN),
        lifeMs,
        maxLifeMs: lifeMs,
        color
      });
    }

    const excess = highScoreParticles.length - HIGH_SCORE_PARTICLE_MAX_COUNT;
    if (excess > 0) {
      highScoreParticles.splice(0, excess);
    }
  }

  function updateHighScoreParticles(dtMs) {
    if (highScoreParticles.length <= 0) return;

    // 既存の物理はvelocityを1frame(1/60s)単位で扱うため、dtMsをframe数へ変換する。
    const frames = dtMs * 60 / 1000;

    for (let i = highScoreParticles.length - 1; i >= 0; i--) {
      const particle = highScoreParticles[i];

      particle.lifeMs -= dtMs;
      if (particle.lifeMs <= 0) {
        highScoreParticles.splice(i, 1);
        continue;
      }

      particle.vy += HIGH_SCORE_PARTICLE_GRAVITY * frames;
      particle.x += particle.vx * frames;
      particle.y += particle.vy * frames;
    }
  }

  function drawHighScoreParticles(drawCtx) {
    if (highScoreParticles.length <= 0) return;

    drawCtx.save();

    for (const particle of highScoreParticles) {
      drawCtx.globalAlpha = Math.max(0, particle.lifeMs / particle.maxLifeMs);
      drawCtx.fillStyle = particle.color;
      drawCtx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }

    drawCtx.restore();
  }

  function addScore(points, label = "score", options = null) {
    const safePoints = Math.max(0, Math.floor(points || 0));
    if (safePoints <= 0) return;
    score += safePoints;
    pushScoreLog(label, safePoints, score);

    if (
      safePoints >= HIGH_SCORE_PARTICLE_THRESHOLD &&
      Number.isFinite(options?.particleX) &&
      Number.isFinite(options?.particleY)
    ) {
      spawnHighScoreParticles(options.particleX, options.particleY);
    }
  }

  function normalizeRecordEntry(entry) {
    const raw = entry && typeof entry === "object" ? entry : {};
    return {
      score: Math.max(0, Math.floor(raw.score || 0)),
      date: typeof raw.date === "string" ? raw.date : new Date().toISOString()
    };
  }

  function sortRecords(entries) {
    return entries.slice().sort((a, b) => b.score - a.score);
  }

  function getSelectedTableId() {
    return TABLE_SELECT_ITEMS[titleState.selectedTableIndex]?.id ?? "table1";
  }

  function getCurrentTableId() {
    return getSelectedTableId();
  }

  function getTableById(tableId) {
    return window.RCP_TABLES?.[tableId] ?? null;
  }

  function isTable777() {
    return TABLE?.id === "table777";
  }

  function getRecordsStorageKey() {
    return RECORDS_STORAGE_KEY_PREFIX + "." + getCurrentTableId();
  }

  function loadRecords() {
    let parsed = [];

    try {
      const raw = localStorage.getItem(getRecordsStorageKey());
      if (raw) {
        parsed = JSON.parse(raw);
      }
    } catch {
      parsed = [];
    }

    if (!Array.isArray(parsed)) {
      parsed = [];
    }

    recordsState.entries = sortRecords(
      parsed.map(normalizeRecordEntry)
    ).slice(0, MAX_RECORDS);
  }

  function saveRecords() {
    try {
      localStorage.setItem(getRecordsStorageKey(), JSON.stringify(recordsState.entries));
    } catch {
      // ignore storage failures
    }
  }

  function submitRecord(finalScore) {
    if (recordsState.currentGameRecorded) return;

    const entry = {
      score: Math.max(0, Math.floor(finalScore || 0)),
      date: new Date().toISOString()
    };

    recordsState.entries.push(entry);
    recordsState.entries = sortRecords(recordsState.entries).slice(0, MAX_RECORDS);

    let insertedIndex = -1;
    for (let i = 0; i < recordsState.entries.length; i++) {
      if (
        recordsState.entries[i].score === entry.score &&
        recordsState.entries[i].date === entry.date
      ) {
        insertedIndex = i;
        break;
      }
    }

    recordsState.lastInsertedIndex = insertedIndex;
    recordsState.currentGameRecorded = true;
    saveRecords();
  }

  function updateBumperLevelFromSpinner() {
    const thresholds = RULE_CONFIG.spinnerBumperLevelThresholds;
    if (!Array.isArray(thresholds) || thresholds.length <= 0) return;

    const prevLevel = ruleState.bumperLevel;
    let nextLevel = 0;

    if (ruleState.spinnerTotalSpins >= thresholds[0]) {
      nextLevel = 1;
    }

    if (thresholds.length > 1 && ruleState.spinnerTotalSpins >= thresholds[1]) {
      nextLevel = 2;
    }

    ruleState.bumperLevel = Math.max(ruleState.bumperLevel, nextLevel);

    if (ruleState.bumperLevel > prevLevel) {
      showRuleMessage("bumperLevelUp", "BUMPER LEVEL UP", 90);

      if (TABLE?.id === "table2") {
        window.RCPAudio?.playMelody?.("valueUp", {
          muted: SFXmute
        });
      }
    }
  }

  function updateCenterValueFromSpinner() {
    const thresholds = RULE_CONFIG.spinnerCenterValueThresholds;
    if (!Array.isArray(thresholds) || thresholds.length <= 0) return;

    let changed = false;

    while (
      ruleState.centerValueStep < thresholds.length &&
      ruleState.spinnerTotalSpins >= thresholds[ruleState.centerValueStep]
    ) {
      const prev = ruleState.centerValueScore;

      ruleState.centerValueScore = Math.min(
        RULE_CONFIG.centerValueMaxScore,
        ruleState.centerValueScore + RULE_CONFIG.centerValueAdd
      );

      ruleState.centerValueStep++;

      if (ruleState.centerValueScore > prev) {
        changed = true;
      }
    }

    if (!changed) return;

    if (TABLE?.id === "table3") {
      window.RCPAudio?.playMelody?.("levelUp", {
        muted: SFXmute
      });
    }

    if (ruleState.centerValueScore >= RULE_CONFIG.centerValueMaxScore) {
      showDisplayMessage("CENTER VALUE MAX", 90);
    } else {
      showDisplayMessage("CENTER VALUE UP", 90);
    }
  }

  function updateOrbitTargetValueFromSpinner() {
    const thresholds = RULE_CONFIG.spinnerOrbitValueThresholds;
    if (!Array.isArray(thresholds) || thresholds.length <= 0) return;

    let changed = false;

    while (
      ruleState.orbitTargetValueStep < thresholds.length &&
      ruleState.spinnerTotalSpins >= thresholds[ruleState.orbitTargetValueStep]
    ) {
      const prev = ruleState.orbitTargetBaseScore;

      ruleState.orbitTargetBaseScore = Math.min(
        RULE_CONFIG.orbitTargetBaseMaxScore,
        ruleState.orbitTargetBaseScore + RULE_CONFIG.orbitTargetBaseAdd
      );

      ruleState.orbitTargetValueStep++;

      if (ruleState.orbitTargetBaseScore > prev) {
        changed = true;
      }
    }

    if (!changed) return;

    if (TABLE?.id === "table1") {
      window.RCPAudio?.playMelody?.("levelUp", {
        muted: SFXmute
      });
    }

    if (ruleState.orbitTargetBaseScore >= RULE_CONFIG.orbitTargetBaseMaxScore) {
      showDisplayMessage("ORBIT TARGET MAX " + ruleState.orbitTargetBaseScore, 90);
    } else {
      showDisplayMessage("ORBIT TARGET UP " + ruleState.orbitTargetBaseScore, 90);
    }
  }

  function getBonusPowerMultiplier() {
    const initial = RULE_CONFIG.bonusValueInitialScore;
    if (!Number.isFinite(initial) || initial <= 0) return 1;
    return Math.max(1, ruleState.bonusValue / initial);
  }

  function formatBonusPowerMultiplier() {
    return getBonusPowerMultiplier().toFixed(1);
  }

  function getBonusPowerLevelUpScore() {
    const scoreSteps = TABLE?.bonusPowerLevelUpScores;
    if (!Array.isArray(scoreSteps)) return 0;

    const multiplier = getBonusPowerMultiplier();
    const step = scoreSteps.find(item =>
      Number.isFinite(item?.multiplier) &&
      Math.abs(item.multiplier - multiplier) < 0.001
    );

    return Math.max(0, Math.floor(step?.score || 0));
  }

  function updateBonusValueFromSpinner() {
    const thresholds = RULE_CONFIG.spinnerBonusValueThresholds;
    if (!Array.isArray(thresholds) || thresholds.length <= 0) return;

    let changed = false;

    while (
      ruleState.spinnerBonusValueStep < thresholds.length &&
      ruleState.spinnerTotalSpins >= thresholds[ruleState.spinnerBonusValueStep]
    ) {
      const prev = ruleState.bonusValue;

      ruleState.bonusValue = Math.min(
        RULE_CONFIG.bonusValueMaxScore,
        ruleState.bonusValue + RULE_CONFIG.bonusValueAdd
      );

      ruleState.spinnerBonusValueStep++;

      if (ruleState.bonusValue > prev) {
        changed = true;
        addScore(getBonusPowerLevelUpScore(), "bonus power level up");
      }
    }

    if (!changed) return;
    // Keep the collected bonus and its melody intact while spins still score.
    if (saucerHoldState.active && TABLE?.saucerBonusLevels) return;

    if (TABLE?.saucerBonusLevels) {
      showDisplayMessage("BONUS POWER UP", 90);
    } else if (ruleState.bonusValue >= RULE_CONFIG.bonusValueMaxScore) {
      showDisplayMessage("BONUS VALUE MAX " + ruleState.bonusValue, 90);
    } else {
      showDisplayMessage("BONUS VALUE UP " + ruleState.bonusValue, 90);
    }

    if (TABLE?.id === "table4") {
      const melodyId = ruleState.bonusValue >= RULE_CONFIG.bonusValueMaxScore
        ? "bonusPowerMax"
        : "valueUp";

      window.RCPAudio?.playMelody?.(melodyId, {
        muted: SFXmute
      });
    }
  }

  function increaseSpinnerValue() {
    const prev = ruleState.spinnerValueScore;

    ruleState.spinnerValueScore = Math.min(
      RULE_CONFIG.spinnerValueMaxScore,
      ruleState.spinnerValueScore + RULE_CONFIG.spinnerValueAdd
    );

    if (ruleState.spinnerValueScore > prev) {
      showDisplayMessage(
        "SPINNER VALUE UP " + ruleState.spinnerValueScore,
        90
      );
    } else {
      showDisplayMessage(
        "SPINNER VALUE MAX " + ruleState.spinnerValueScore,
        90
      );
    }
  }

  function usesSpinnerValueProgression() {
    return (RULE_CONFIG.spinnerValueAdd || 0) > 0;
  }

  function awardSpinnerSpin() {
    addScore(ruleState.spinnerValueScore, "spinner spin");
    ruleState.spinnerTotalSpins++;
    updateBumperLevelFromSpinner();
    updateCenterValueFromSpinner();
    updateOrbitTargetValueFromSpinner();
    updateBonusValueFromSpinner();
  }

  function getCurrentBumperScore() {
    const level = Math.max(0, Math.min(
      RULE_CONFIG.bumperScores.length - 1,
      ruleState.bumperLevel
    ));

    return RULE_CONFIG.bumperScores[level];
  }

  function updateBumperLevelFromBumperHit() {
    const thresholds = RULE_CONFIG.bumperLevelThresholds;
    if (!Array.isArray(thresholds) || thresholds.length <= 0) return;

    const prevLevel = ruleState.bumperLevel;
    let nextLevel = 0;

    for (let i = 0; i < thresholds.length; i++) {
      if (ruleState.bumperHitCount >= thresholds[i]) {
        nextLevel = i + 1;
      }
    }

    const maxLevel = Math.max(0, RULE_CONFIG.bumperScores.length - 1);
    nextLevel = Math.min(nextLevel, maxLevel);

    ruleState.bumperLevel = Math.max(ruleState.bumperLevel, nextLevel);

    if (ruleState.bumperLevel > prevLevel) {
      showRuleMessage("bumperLevelUp", "BUMPER LEVEL UP", 90);

      if (TABLE?.id === "table3") {
        window.RCPAudio?.playMelody?.("valueUp", {
          muted: SFXmute
        });
      }
    }
  }

  function updateBonusValueFromBumperHit() {
    let changed = false;

    while (
      ruleState.bumperBonusStep < RULE_CONFIG.bumperBonusValueThresholds.length &&
      ruleState.bumperHitCount >= RULE_CONFIG.bumperBonusValueThresholds[ruleState.bumperBonusStep]
    ) {
      ruleState.bonusValue += RULE_CONFIG.bumperBonusValueAdd;
      showRuleMessage("bonusValueUp", "BONUS VALUE UP", 90);
      ruleState.bumperBonusStep++;
      changed = true;
    }

    if (
      changed &&
      (TABLE?.id === "table1" || TABLE?.id === "table2")
    ) {
      window.RCPAudio?.playMelody?.("valueUp", {
        muted: SFXmute
      });
    }
  }

  function updateTable777SaucerValueFromBumperHit() {
    if (!isTable777()) return;

    let changed = false;

    while (
      ruleState.saucerValueStep < TABLE777_SAUCER_VALUE_THRESHOLDS.length &&
      ruleState.bumperHitCount >= TABLE777_SAUCER_VALUE_THRESHOLDS[ruleState.saucerValueStep]
    ) {
      const prev = ruleState.saucerValue;

      ruleState.saucerValue = Math.min(
        TABLE777_SAUCER_VALUE_MAX,
        ruleState.saucerValue + TABLE777_SAUCER_VALUE_ADD
      );

      ruleState.saucerValueStep++;

      if (ruleState.saucerValue > prev) {
        changed = true;

        if (ruleState.saucerValue >= TABLE777_SAUCER_VALUE_MAX) {
          showDisplayMessage("SAUCER VALUE MAX " + ruleState.saucerValue, 90);
        } else {
          showDisplayMessage("SAUCER VALUE UP " + ruleState.saucerValue, 90);
        }
      }
    }

    if (changed) {
      window.RCPAudio?.playMelody?.("valueUp", {
        muted: SFXmute
      });
    }
  }

  function resetLoopBonusState() {
    loopBonusState.active = false;
    loopBonusState.fromSpinnerId = null;
    loopBonusState.passedCenter = false;
    loopBonusState.timerMs = 0;
    loopBonusState.centerWasInside = false;
  }

  function resetLoopRouteState() {
    loopRouteState.active = false;
    loopRouteState.sequence = null;
    loopRouteState.stepIndex = 0;
    loopRouteState.timerMs = 0;
    loopRouteState.triggerWasInside = [];
  }

  function resetOrbitSoundState() {
    orbitSoundState.upWasInside = false;
    orbitSoundState.downWasInside = false;
    orbitSoundState.cooldownMs = 0;
    orbitSfxCue = 0;
    orbitSfxKind = null;
  }

  function triggerOrbitSfx(kind) {
    orbitSfxCue++;
    orbitSfxKind = kind;
    orbitSoundState.cooldownMs = TABLE?.orbitSound?.cooldownMs ?? 250;
  }

  function updateOrbitSoundCooldown(dtMs) {
    if (orbitSoundState.cooldownMs <= 0) return;
    orbitSoundState.cooldownMs -= dtMs;
    if (orbitSoundState.cooldownMs < 0) orbitSoundState.cooldownMs = 0;
  }

  function checkOrbitSoundTrigger(b) {
    const cfg = TABLE?.orbitSound;
    if (!cfg) return;

    const upTrigger = cfg.upTrigger;
    const downTrigger = cfg.downTrigger;

    const upDx = b.x - upTrigger.x;
    const upDy = b.y - upTrigger.y;
    const upInside = upDx * upDx + upDy * upDy <= upTrigger.r * upTrigger.r;

    const downDx = b.x - downTrigger.x;
    const downDy = b.y - downTrigger.y;
    const downInside = downDx * downDx + downDy * downDy <= downTrigger.r * downTrigger.r;

    if (upInside && !orbitSoundState.upWasInside && b.vy < 0 && orbitSoundState.cooldownMs <= 0) {
      triggerOrbitSfx("orbit_up");
    }

    if (downInside && !orbitSoundState.downWasInside && b.vy > 0 && orbitSoundState.cooldownMs <= 0) {
      triggerOrbitSfx("orbit_down");
    }

    orbitSoundState.upWasInside = upInside;
    orbitSoundState.downWasInside = downInside;
  }

  function startLoopBonus(spinnerId) {
    loopBonusState.active = true;
    loopBonusState.fromSpinnerId = spinnerId;
    loopBonusState.passedCenter = false;
    loopBonusState.timerMs = TABLE?.loopBonus?.timeoutMs ?? 1800;
    loopBonusState.centerWasInside = false;
  }

  function cancelLoopBonus() {
    resetLoopBonusState();
  }

  function updateLoopBonusTimer(dtMs) {
    if (!loopBonusState.active) return;

    loopBonusState.timerMs -= dtMs;

    if (loopBonusState.timerMs <= 0) {
      cancelLoopBonus();
    }
  }

  function checkLoopCenterPass(b) {
    const trigger = TABLE?.loopBonus?.centerTrigger;
    if (!trigger) return;

    const dx = b.x - trigger.x;
    const dy = b.y - trigger.y;
    const inside = dx * dx + dy * dy <= trigger.r * trigger.r;

    if (inside && !loopBonusState.centerWasInside) {
      loopBonusState.passedCenter = true;
    }

    loopBonusState.centerWasInside = inside;
  }

  function awardLoopBonus() {
    const points = TABLE?.loopBonus?.score ?? RULE_CONFIG.loopBonusScore ?? 100;
    addScore(points, "loop bonus");

    window.RCPAudio?.play?.("orbit", {
      muted: SFXmute
    });

    showDisplayMessage("LOOP BONUS " + points, 90);
  }

  function handleLoopSpinnerPass(spinnerId) {
    if (!loopBonusState.active) {
      startLoopBonus(spinnerId);
      return;
    }

    if (spinnerId === loopBonusState.fromSpinnerId) {
      startLoopBonus(spinnerId);
      return;
    }

    if (loopBonusState.passedCenter) {
      awardLoopBonus();
      resetLoopBonusState();
      return;
    }

    startLoopBonus(spinnerId);
  }

  function cancelLoopBonusForScoringTrigger(kind) {
    if (loopBonusState.active) {
      cancelLoopBonus();
    }

    if (loopRouteState.active) {
      resetLoopRouteState();
    }
  }

  function awardBumperHit() {
    cancelLoopBonusForScoringTrigger("bumper");
    addScore(getCurrentBumperScore(), "bumper hit");
    ruleState.bumperHitCount++;

    updateTable777SaucerValueFromBumperHit();

    updateBonusValueFromBumperHit();
    updateBumperLevelFromBumperHit();
  }

  function awardWallBump(wallBump) {
    cancelLoopBonusForScoringTrigger("wallBump");
    addScore(RULE_CONFIG.wallBumpScore, "wall bump");

    window.RCPAudio?.play?.("wallBump", {
      muted: SFXmute
    });

    wallBump.flash = 6;
    wallBump.hitCooldown = WALL_BUMP_HIT_COOLDOWN_FRAMES;
  }

  function awardOrbitTargetHit(target = null) {
    cancelTable777OrbitBonus();
    cancelLoopBonusForScoringTrigger("orbitTarget");

    const collectedBoost =
      TABLE?.id === "table1" &&
      ruleState.orbitBoostActive;

    const baseScore = Math.min(
      RULE_CONFIG.orbitTargetBaseMaxScore,
      ruleState.orbitTargetBaseScore
    );

    const points = baseScore + (
      ruleState.orbitBoostActive ? RULE_CONFIG.orbitBoostBonusScore : 0
    );

    addScore(points, "orbit target hit", target ? {
      particleX: (target.x1 + target.x2) / 2,
      particleY: (target.y1 + target.y2) / 2
    } : null);

    if (ruleState.orbitBoostActive) {
      ruleState.orbitBoostActive = false;
      ruleState.orbitBoostTimerMs = 0;
      window.RCPAudio?.stopBoostedMelody?.();
    }

    if (collectedBoost) {
      window.RCPAudio?.playMelody?.("boostCollect", {
        muted: SFXmute
      });
    }
  }

  function awardFixedScoreTargetHit(target) {
    cancelTable777OrbitBonus();
    cancelLoopBonusForScoringTrigger("target");
    addScore(target.score ?? 0, target.id || "target");

    if (target.message) {
      showDisplayMessage(target.message, 60);
    }
  }

  function resetCenterValueDoublerTriggerState() {
    ruleState.centerValueDoublerTriggerHitState = {};
    const triggers = RULE_CONFIG.centerValueDoublerTriggerTargets;
    if (!Array.isArray(triggers)) return;

    for (const id of triggers) {
      ruleState.centerValueDoublerTriggerHitState[id] = false;
    }
  }

  function resetCenterValueDoubler() {
    ruleState.centerValueDoublerActive = false;
    ruleState.centerValueDoublerTimerMs = 0;
    ruleState.centerValueDoublerTriggerResetTimerMs = 0;
    resetCenterValueDoublerTriggerState();
  }

  function isCenterValueDoublerTriggerTarget(target) {
    const triggers = RULE_CONFIG.centerValueDoublerTriggerTargets;
    if (!Array.isArray(triggers) || triggers.length <= 0) return false;
    return triggers.includes(target.id);
  }

  function isCenterValueDoublerTriggerLocked(target) {
    if (!isCenterValueDoublerTriggerTarget(target)) return false;
    return ruleState.centerValueDoublerTriggerResetTimerMs > 0;
  }

  function notifyCenterValueDoublerTargetHit(targetId) {
    const triggers = RULE_CONFIG.centerValueDoublerTriggerTargets;
    if (!Array.isArray(triggers) || triggers.length <= 0) return;

    if (!triggers.includes(targetId)) return;

    if (ruleState.centerValueDoublerActive) return;
    if (ruleState.centerValueDoublerTriggerResetTimerMs > 0) return;

    if (!ruleState.centerValueDoublerTriggerHitState) {
      resetCenterValueDoublerTriggerState();
    }

    ruleState.centerValueDoublerTriggerHitState[targetId] = true;

    let allHit = true;
    for (const id of triggers) {
      if (!ruleState.centerValueDoublerTriggerHitState[id]) {
        allHit = false;
        break;
      }
    }

    if (!allHit) return;

    ruleState.centerValueDoublerActive = true;
    ruleState.centerValueDoublerTimerMs = RULE_CONFIG.centerValueDoublerDurationMs ?? 6000;
    ruleState.centerValueDoublerTriggerResetTimerMs =
      RULE_CONFIG.centerValueDoublerResetDelayMs ?? 2000;
    if (TABLE?.ui?.showCenterValueDoublerReadyMessage !== false) {
      showDisplayMessage("CENTER x2", 90);
    }

    if (TABLE?.id === "table3") {
      window.RCPAudio?.playMelody?.("boosted", {
        muted: SFXmute
      });
    }
  }

  function updateCenterValueDoubler(dtMs) {
    if (ruleState.centerValueDoublerActive) {
      ruleState.centerValueDoublerTimerMs -= dtMs;
      if (ruleState.centerValueDoublerTimerMs <= 0) {
        ruleState.centerValueDoublerActive = false;
        ruleState.centerValueDoublerTimerMs = 0;
        window.RCPAudio?.stopBoostedMelody?.();
      }
    }

    if (ruleState.centerValueDoublerTriggerResetTimerMs > 0) {
      ruleState.centerValueDoublerTriggerResetTimerMs -= dtMs;
      if (ruleState.centerValueDoublerTriggerResetTimerMs <= 0) {
        ruleState.centerValueDoublerTriggerResetTimerMs = 0;
        resetCenterValueDoublerTriggerState();
      }
    }
  }

  function awardCenterValueTargetHit(target) {
    cancelTable777OrbitBonus();
    cancelLoopBonusForScoringTrigger("centerTarget");

    const basePoints = Math.min(
      RULE_CONFIG.centerValueMaxScore,
      ruleState.centerValueScore
    );

    const multiplier = ruleState.centerValueDoublerActive
      ? Math.max(1, RULE_CONFIG.centerValueDoublerMultiplier ?? 1)
      : 1;

    const points = basePoints * multiplier;
    addScore(points, target.id || "center target", {
      particleX: (target.x1 + target.x2) / 2,
      particleY: (target.y1 + target.y2) / 2
    });

    if (multiplier > 1) {
      showDisplayMessage("CENTER VALUE " + basePoints + " x" + multiplier, 90);
      ruleState.centerValueDoublerActive = false;
      ruleState.centerValueDoublerTimerMs = 0;
      window.RCPAudio?.stopBoostedMelody?.();
      window.RCPAudio?.playMelody?.("boostCollect", {
        muted: SFXmute
      });
    } else {
      showDisplayMessage("CENTER VALUE " + basePoints, 90);
    }
  }

  function increaseOrbitTargetBaseScore() {
    if (ruleState.orbitTargetBaseScore >= RULE_CONFIG.orbitTargetBaseMaxScore) {
      showDisplayMessage("ORBIT TARGET MAX", 90);
      return;
    }

    ruleState.orbitTargetBaseScore = Math.min(
      RULE_CONFIG.orbitTargetBaseMaxScore,
      ruleState.orbitTargetBaseScore + RULE_CONFIG.orbitTargetBaseAdd
    );
    showDisplayMessage("ORBIT TARGET +" + RULE_CONFIG.orbitTargetBaseAdd, 90);
  }

  function getOrbitValueIndicatorLitCount() {
    const initial = RULE_CONFIG.orbitTargetBaseInitialScore;
    const step = RULE_CONFIG.orbitTargetBaseAdd;
    const cfg = TABLE?.orbitValueIndicator;
    const shape = cfg?.shape ? INDICATOR_SHAPES[cfg.shape] : null;
    const newIndicatorCount = Array.isArray(cfg?.polygons)
      ? cfg.polygons.length
      : (shape?.polygons?.length ?? 0);

    const legacyIndicatorCount = TABLE?.orbitValueIndicators?.length ?? 0;
    const maxLit = newIndicatorCount || legacyIndicatorCount;

    return Math.max(0, Math.min(
      maxLit,
      Math.floor((ruleState.orbitTargetBaseScore - initial) / step)
    ));
  }

  function getTopDropValueIndicatorLitCount() {
    const cfg = TABLE?.topDropValueIndicator;
    if (!cfg) return 0;

    const shapeName = cfg.shape || "triangle3";
    const shape = INDICATOR_SHAPES[shapeName];
    const maxLit = shape?.polygons?.length ?? 0;

    const initial = RULE_CONFIG.topDropBankBonusInitialScore;
    const step = RULE_CONFIG.topDropBankBonusAdd;

    if (step <= 0) return 0;

    return Math.max(0, Math.min(
      maxLit,
      Math.floor((ruleState.topDropBankBonusScore - initial) / step)
    ));
  }

  function getCenterValueIndicatorLitCount() {
    const cfg = TABLE?.centerValueIndicator;
    if (!cfg) return 0;

    const shapeName = cfg.shape || "indicator7";
    const shape = INDICATOR_SHAPES[shapeName];
    const maxLit = shape?.polygons?.length ?? 0;

    const initial = RULE_CONFIG.centerValueInitialScore;
    const step = RULE_CONFIG.centerValueAdd;

    if (step <= 0) return 0;

    return Math.max(0, Math.min(
      maxLit,
      Math.floor((ruleState.centerValueScore - initial) / step)
    ));
  }

  function getCurrentOrbitTargetScore() {
    const baseScore = Math.min(
      RULE_CONFIG.orbitTargetBaseMaxScore,
      ruleState.orbitTargetBaseScore
    );

    return baseScore + (
      ruleState.orbitBoostActive ? RULE_CONFIG.orbitBoostBonusScore : 0
    );
  }

  function resetRuleState() {
    const rules = getRuleConfig();

    ruleState.bonusValue = rules.bonusValueInitialScore;
    ruleState.bonusMult = 1;

    ruleState.orbitBoostActive = false;
    ruleState.orbitBoostTimerMs = 0;
    ruleState.orbitTargetBaseScore = rules.orbitTargetBaseInitialScore;
    ruleState.orbitTargetValueStep = 0;

    ruleState.bumperLevel = 0;
    ruleState.bumperHitCount = 0;
    ruleState.bumperBonusStep = 0;

    ruleState.spinnerTotalSpins = 0;
    ruleState.spinnerBonusValueStep = 0;
    ruleState.spinnerValueScore = rules.spinnerValueInitialScore;

    ruleState.centerValueScore = rules.centerValueInitialScore;
    ruleState.centerValueStep = 0;

    resetCenterValueDoubler();

    ruleState.topDropBankBonusScore = rules.topDropBankBonusInitialScore;

    ruleState.slotLevel = 0;
    ruleState.loopCount = 0;
    ruleState.loopValue = TABLE777_LOOP_VALUE_INITIAL;
    ruleState.saucerValue = TABLE777_SAUCER_VALUE_INITIAL;
    ruleState.guaranteedRoleReady = false;
    ruleState.saucerValueStep = 0;

    resetTable777SlotVisualState();
    resetTable777OrbitBonusState();
    resetTable777DelayedSlotMessage();
    resetTable777PendingSlotReward();
  }

  let bumpers = [];
  let slingshots = [];
  let walls = [];
  let wallBumps = [];
  let drainWalls = [];
  let drainWallVisualCaches = [];
  const DRAIN_WALL_VISUAL_SUPERSAMPLE = 2;
  const DRAIN_WALL_VISUAL_PADDING = 2;
  let targets = [];
  let targetIslands = [];
  let dropTargets = [];
  const dropTargetGroupResetTimersMs = {};
  let kickbacks = [];
  let ballSaves = [];
  let topLaneDividers = [];
  let topLanes = [];
  let orbitLaneTriggers = [];
  let loopTriggers = [];
  let spinners = [];
  let saucers = [];
  let posts = [];
  let timedBlockers = [];

  let canvas = null;
  let ctx = null;
  let TABLE = null;
  let tableModeRuntime = null;

  function getTableAssets() {
    return TABLE?.assets ?? DEFAULT_ASSETS;
  }

  function getAssetConfig(name) {
    const tableAssets = TABLE?.assets || {};

    if (name === "titleLogo") {
      return tableAssets.titleLogo || DEFAULT_ASSETS.titleLogo;
    }

    if (name === "playfieldLogo") {
      if (tableAssets.playfieldLogo === false || tableAssets.playfieldLogo === null) {
        return null;
      }
      if (tableAssets.playfieldLogo === undefined || tableAssets.playfieldLogo === true) {
        return DEFAULT_ASSETS.playfieldLogo;
      }
      if (typeof tableAssets.playfieldLogo === "object") {
        return tableAssets.playfieldLogo;
      }
      return DEFAULT_ASSETS.playfieldLogo;
    }

    if (name === "playfieldMask" || name === "howToOverlay" || name === "centerValueDoublerIndicator") {
      const cfg = tableAssets[name];
      return cfg && typeof cfg === "object" ? cfg : null;
    }

    return tableAssets[name] ?? DEFAULT_ASSETS[name] ?? null;
  }

  function getDisplayHints() {
    const hints = TABLE?.ui?.displayHints;
    return Array.isArray(hints) && hints.length > 0
      ? hints
      : DEFAULT_DISPLAY_HINTS;
  }

  function getRuleConfig() {
    return RULE_CONFIG;
  }

  function createTableModeRuntime(table) {
    if (typeof table?.createRuntime !== "function") return null;

    return table.createRuntime({
      ball,
      ballRadius: BALL_RADIUS,
      addScore,
      showMessage: showDisplayMessage,
      loseBall: handleBallLost,
      finishGame: handleTableModeGameOver,
      formatScore,
      getScore: () => score,
      getGameStatus: () => gameState.status,
      getDisplayMessage: () => displayState.messageTimer > 0 ? displayState.message : "",
      isBallInPlay: () => ballInPlay,
      isDropTargetDown: targetId =>
        dropTargets.some(target => target.id === targetId && target.down),
      playSfx: (soundId, options = {}) => window.RCPAudio?.play?.(soundId, {
        ...options,
        muted: SFXmute
      }),
      playMelody: (melodyId, options = {}) => window.RCPAudio?.playMelody?.(melodyId, {
        ...options,
        muted: SFXmute
      }),
      getBgmTiming: () => window.RCPAudio?.getBgmTiming?.(),
      getBgmDurationMs: () => window.RCP_BGM_DEFS?.cosmoRaiders?.duration * 1000,
      stopBgm: () => window.RCPAudio?.stopBgm?.(),
      resetWavePlayfield: resetBallScopedRules,
      launchBall: options => launchBall(options),
      prepareBallLaunch() {
        ballInPlay = false;
        waitingForLaunch = true;
        ball.vx = 0;
        ball.vy = 0;
        gameState.status = "ready";
        resetStuckDetection();
        resetShotMapState();
      },
      setBallInactive() {
        ballInPlay = false;
        waitingForLaunch = false;
        ball.vx = 0;
        ball.vy = 0;
        resetStuckDetection();
        resetShotMapState();
      },
      respawnBall() {
        placeBallAtSpawn();
        ballInPlay = true;
        waitingForLaunch = false;
        gameState.status = "playing";
        lastLaunchAtMs = performance.now();
        resetStuckDetection();
        resetShotMapState();
      }
    });
  }

  let CANVAS_W = 740;
  let CANVAS_H = 1280;
  const MAX_RENDER_DPR = 2;

  function syncCanvasResolution() {
    if (!canvas || !ctx) return;

    const dpr = Math.max(
      1,
      Math.min(MAX_RENDER_DPR, window.devicePixelRatio || 1)
    );

    const renderWidth = Math.round(CANVAS_W * dpr);
    const renderHeight = Math.round(CANVAS_H * dpr);

    if (
      canvas.width !== renderWidth ||
      canvas.height !== renderHeight
    ) {
      canvas.width = renderWidth;
      canvas.height = renderHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;

    if ("imageSmoothingQuality" in ctx) {
      ctx.imageSmoothingQuality = "high";
    }
  }

  let orbitCollisionSegments = [];
  let oneWayWallCollisionSegments = [];
  let orbitVisualPaths = [];

  // Broadphase prep: flat segment colliders (walls, drains, orbit, dividers, etc.).
  let solidSegments = [];
  // Broadphase prep: one-way segment colliders.
  let oneWaySolidSegments = [];
  // Broadphase prep: trigger segments (top lanes, kickbacks, ball saves).
  let sensorSegments = [];
  // Broadphase prep: circular colliders (bumpers, posts).
  let circleColliders = [];
  // Broadphase prep: hit segments on targets, drop targets, slingshot edges.
  let activeSegmentColliders = [];

  let leftFlipper = null;
  let rightFlipper = null;
  let flippers = [];
  let paused = false;

  class Flipper {
    constructor(x, y, length, minAngle, maxAngle, isLeft) {
      this.x = x;
      this.y = y;
      this.length = length;
      this.minAngle = minAngle;
      this.maxAngle = maxAngle;
      this.isLeft = isLeft;
      this.angle = minAngle;
      this.isUp = false;
      this.thickness = 16;
      this.upSpeed = isLeft ? -0.52 : 0.52;
      this.downSpeed = isLeft ? 0.2 : -0.2;
      this.currentOmega = 0;
    }
    update(dt) {
      const prevAngle = this.angle;
      const targetSpeed = this.isUp ? this.upSpeed : this.downSpeed;
      this.angle += targetSpeed * dt;
      if (this.isLeft) {
        if (this.angle < this.maxAngle) this.angle = this.maxAngle;
        if (this.angle > this.minAngle) this.angle = this.minAngle;
      } else {
        if (this.angle > this.maxAngle) this.angle = this.maxAngle;
        if (this.angle < this.minAngle) this.angle = this.minAngle;
      }
      this.currentOmega = (this.angle - prevAngle) / dt;
    }
    getP2() {
      return {
        x: this.x + Math.cos(this.angle) * this.length,
        y: this.y + Math.sin(this.angle) * this.length
      };
    }
  }

  function degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function getShotMapFlipperTopNormal(flipper) {
    const tx = Math.cos(flipper.angle);
    const ty = Math.sin(flipper.angle);
    const n1 = { x: -ty, y: tx };
    const n2 = { x: ty, y: -tx };
    return n1.y < n2.y ? n1 : n2;
  }

  function getFlipperSegmentClosestPoint(flipper, b) {
    const p2 = flipper.getP2();
    const x1 = flipper.x;
    const y1 = flipper.y;
    const x2 = p2.x;
    const y2 = p2.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) {
      t = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    return {
      ratio: t,
      px: x1 + t * dx,
      py: y1 + t * dy
    };
  }

  function getFlipperContactRatio(flipper, b) {
    return getFlipperSegmentClosestPoint(flipper, b).ratio;
  }

  function getShotMapIndexFromRatio(ratio, positionCount = SHOTMAP_POSITION_COUNT) {
    const ratioRange =
      SHOTMAP_RATIO_MAX - SHOTMAP_RATIO_MIN;

    const normalized =
      ratioRange > 0
        ? (ratio - SHOTMAP_RATIO_MIN) / ratioRange
        : 0;

    return Math.max(
      0,
      Math.min(
        positionCount - 1,
        Math.round(normalized * (positionCount - 1))
      )
    );
  }

  function isBallNearFlipper(b, flipper, margin) {
    const closest = getFlipperSegmentClosestPoint(flipper, b);
    const dist2 =
      (b.x - closest.px) * (b.x - closest.px) +
      (b.y - closest.py) * (b.y - closest.py);
    const totalR = BALL_RADIUS + flipper.thickness + margin;
    return dist2 <= totalR * totalR;
  }

  function isRatioInShotMapFireRange(ratio) {
    return (
      ratio >= SHOTMAP_RATIO_MIN - SHOTMAP_RATIO_TOLERANCE &&
      ratio <= SHOTMAP_RATIO_MAX + SHOTMAP_RATIO_TOLERANCE
    );
  }

  function getFlipperShotMap(flipper) {
    const configured = flipper.shotMap;
    if (configured?.enabled === false) return null;

    const fallbackAngles = flipper.isLeft
      ? LEFT_SHOT_ANGLE_DEG
      : RIGHT_SHOT_ANGLE_DEG;

    return {
      angles: Array.isArray(configured?.angles) ? configured.angles : fallbackAngles,
      powers: Array.isArray(configured?.powers) ? configured.powers : SHOT_POWER_BY_POSITION
    };
  }

  function applyShotMapVelocity(flipper, index, shotMap) {
    const angleDeg = shotMap.angles[index];
    const angle = degToRad(angleDeg);
    const power =
      shotMap.powers[index] ??
      shotMap.powers[0] ??
      25;

    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;
    const topNormal = getShotMapFlipperTopNormal(flipper);
    ball.x += topNormal.x * SHOTMAP_PUSH_OUT;
    ball.y += topNormal.y * SHOTMAP_PUSH_OUT;
    shotMapState.skipFlipperCollisionSubsteps = SUBSTEPS * 2;

    return { angleDeg, power, index };
  }

  function tryFireMappedFlipperShot(flipper) {
    if (!SHOTMAP_ENABLED) return false;
    if (!ballInPlay || waitingForLaunch || paused) return false;
    if (saucerHoldState.active) return false;
    if (!isBallNearFlipper(ball, flipper, SHOTMAP_FIRE_MARGIN)) return false;

    const shotMap = getFlipperShotMap(flipper);
    if (!shotMap || shotMap.angles.length <= 0) return false;

    const positionCount = Math.min(shotMap.angles.length, shotMap.powers.length);
    if (positionCount <= 0) return false;

    const ratio = getFlipperContactRatio(flipper, ball);
    if (!isRatioInShotMapFireRange(ratio)) return false;

    const index = getShotMapIndexFromRatio(ratio, positionCount);
    const { angleDeg, power } = applyShotMapVelocity(flipper, index, shotMap);

    if (SHOTMAP_FIRE_DEBUG) {
      console.log("[shotmap mapped fire]", {
        side: flipper.isLeft ? "left" : "right",
        ratio: Math.round(ratio * 1000) / 1000,
        position: index + 1,
        angleDeg,
        power
      });
    }

    return true;
  }

  function initFlippers() {
    const defs = TABLE?.flippers;
    if (defs?.left && defs?.right) {
      leftFlipper = new Flipper(
        defs.left.x,
        defs.left.y,
        defs.left.length,
        degToRad(defs.left.minAngleDeg),
        degToRad(defs.left.maxAngleDeg),
        true
      );
      rightFlipper = new Flipper(
        defs.right.x,
        defs.right.y,
        defs.right.length,
        degToRad(defs.right.minAngleDeg),
        degToRad(defs.right.maxAngleDeg),
        false
      );
      leftFlipper.thickness = defs.left.thickness ?? leftFlipper.thickness;
      rightFlipper.thickness = defs.right.thickness ?? rightFlipper.thickness;
      leftFlipper.id = defs.left.id ?? "left";
      rightFlipper.id = defs.right.id ?? "right";
      leftFlipper.shotMap = defs.left.shotMap ?? null;
      rightFlipper.shotMap = defs.right.shotMap ?? null;

      flippers = [leftFlipper, rightFlipper];

      if (Array.isArray(defs.additional)) {
        for (const def of defs.additional) {
          const isLeft = def.side === "left";
          const flipper = new Flipper(
            def.x,
            def.y,
            def.length,
            degToRad(def.minAngleDeg),
            degToRad(def.maxAngleDeg),
            isLeft
          );
          flipper.id = def.id ?? (isLeft ? "left" : "right");
          flipper.thickness = def.thickness ?? flipper.thickness;
          flipper.shotMap = def.shotMap ?? null;
          flippers.push(flipper);
        }
      }
      return;
    }

    const flipLen = 90;
    leftFlipper = new Flipper(157, 860, flipLen, (30 * Math.PI) / 180, (-20 * Math.PI) / 180, true);
    rightFlipper = new Flipper(443, 860, flipLen, (150 * Math.PI) / 180, (200 * Math.PI) / 180, false);
    flippers = [leftFlipper, rightFlipper];
  }

  function cubicPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    return {
      x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
      y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
    };
  }

  function makeCubicSegments(p0, p1, p2, p3, count, r) {
    const segs = [];
    let prev = cubicPoint(p0, p1, p2, p3, 0);
    for (let i = 1; i <= count; i++) {
      const next = cubicPoint(p0, p1, p2, p3, i / count);
      segs.push({
        x1: prev.x,
        y1: prev.y,
        x2: next.x,
        y2: next.y,
        r
      });
      prev = next;
    }
    return segs;
  }

  function makeSegmentsFromCurveDef(def) {
    const segs = makeCubicSegments(def.p0, def.p1, def.p2, def.p3, def.count, def.r);
    const filtered = typeof def.take === "number" ? segs.slice(0, def.take) : segs;
    if (def.nx == null && def.ny == null) return filtered;
    return filtered.map(seg => ({
      ...seg,
      nx: def.nx ?? 0,
      ny: def.ny ?? 0,
      midX: (seg.x1 + seg.x2) / 2,
      midY: (seg.y1 + seg.y2) / 2
    }));
  }

  function makeSegmentBounds(seg, padding = 0) {
    const r = (seg.r ?? 0) + padding;
    return {
      minX: Math.min(seg.x1, seg.x2) - r,
      minY: Math.min(seg.y1, seg.y2) - r,
      maxX: Math.max(seg.x1, seg.x2) + r,
      maxY: Math.max(seg.y1, seg.y2) + r
    };
  }

  function makeCircleBounds(x, y, r, padding = 0) {
    const totalR = r + padding;
    return {
      minX: x - totalR,
      minY: y - totalR,
      maxX: x + totalR,
      maxY: y + totalR
    };
  }

  function isBallNearBounds(b, bounds, padding = BALL_RADIUS) {
    return (
      b.x >= bounds.minX - padding &&
      b.x <= bounds.maxX + padding &&
      b.y >= bounds.minY - padding &&
      b.y <= bounds.maxY + padding
    );
  }

  function assignSegmentBounds(seg) {
    seg.bounds = makeSegmentBounds(seg);
  }

  function rebuildWallSegmentBounds() {
    for (let i = 0; i < walls.length; i++) {
      assignSegmentBounds(walls[i]);
    }

    for (let i = 0; i < drainWalls.length; i++) {
      const segs = drainWalls[i].collisionSegments;
      for (let si = 0; si < segs.length; si++) {
        assignSegmentBounds(segs[si]);
      }
    }

    for (let i = 0; i < orbitCollisionSegments.length; i++) {
      assignSegmentBounds(orbitCollisionSegments[i]);
    }

    for (let i = 0; i < oneWayWallCollisionSegments.length; i++) {
      assignSegmentBounds(oneWayWallCollisionSegments[i]);
    }

    for (let i = 0; i < topLaneDividers.length; i++) {
      assignSegmentBounds(topLaneDividers[i]);
    }

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (target.wall) assignSegmentBounds(target.wall);
      if (target.wallBottom) assignSegmentBounds(target.wallBottom);
    }
  }

  function rebuildCircleColliderBounds() {
    for (let i = 0; i < bumpers.length; i++) {
      const bumper = bumpers[i];
      bumper.bounds = makeCircleBounds(bumper.x, bumper.y, bumper.collisionR ?? bumper.r);
    }

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      post.bounds = makeCircleBounds(post.x, post.y, post.r);
    }
  }

  function rebuildTargetColliderBounds() {
    for (let i = 0; i < targets.length; i++) {
      assignSegmentBounds(targets[i]);
    }
  }

  function rebuildDropTargetColliderBounds() {
    for (let i = 0; i < dropTargets.length; i++) {
      assignSegmentBounds(dropTargets[i]);
    }
  }

  function rebuildSlingshotActiveSegmentBounds() {
    for (let i = 0; i < slingshots.length; i++) {
      const activeSegment = slingshots[i].activeSegment;
      if (activeSegment) {
        activeSegment.bounds = makeSegmentBounds({
          ...activeSegment,
          r: activeSegment.hitWidth ?? activeSegment.r ?? 0
        });
      }
    }
  }

  function rebuildSlingshotBodySegmentBounds() {
    for (let i = 0; i < slingshots.length; i++) {
      const bodySegs = slingshots[i].bodyCollisionSegments;
      if (!bodySegs || !bodySegs.length) continue;

      for (let si = 0; si < bodySegs.length; si++) {
        assignSegmentBounds(bodySegs[si]);
      }
    }
  }

  function rebuildWallBumpSegmentBounds() {
    for (let i = 0; i < wallBumps.length; i++) {
      const segs = wallBumps[i].segments;
      if (!segs || !segs.length) continue;

      for (let si = 0; si < segs.length; si++) {
        assignSegmentBounds(segs[si]);
      }
    }
  }

  function pushSegmentColliderEntry(list, kind, source, seg) {
    list.push({ kind, source, seg, bounds: makeSegmentBounds(seg) });
  }

  function rebuildTimedBlockerBounds() {
    for (let i = 0; i < timedBlockers.length; i++) {
      assignSegmentBounds(timedBlockers[i]);
    }
  }

  function rebuildCollisionCollections() {
    rebuildTimedBlockerBounds();
    rebuildWallSegmentBounds();
    rebuildCircleColliderBounds();
    rebuildTargetColliderBounds();
    rebuildDropTargetColliderBounds();
    rebuildSlingshotActiveSegmentBounds();
    rebuildSlingshotBodySegmentBounds();
    rebuildWallBumpSegmentBounds();
    solidSegments = [];
    oneWaySolidSegments = [];
    sensorSegments = [];
    circleColliders = [];
    activeSegmentColliders = [];

    for (let i = 0; i < walls.length; i++) {
      pushSegmentColliderEntry(solidSegments, "wall", walls[i], walls[i]);
    }

    for (let i = 0; i < drainWalls.length; i++) {
      const drainWall = drainWalls[i];
      const segs = drainWall.collisionSegments;
      for (let si = 0; si < segs.length; si++) {
        pushSegmentColliderEntry(solidSegments, "drainWall", drainWall, segs[si]);
      }
    }

    for (let i = 0; i < orbitCollisionSegments.length; i++) {
      pushSegmentColliderEntry(solidSegments, "orbit", null, orbitCollisionSegments[i]);
    }

    for (let i = 0; i < topLaneDividers.length; i++) {
      pushSegmentColliderEntry(solidSegments, "topLaneDivider", topLaneDividers[i], topLaneDividers[i]);
    }

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (target.wall) {
        pushSegmentColliderEntry(solidSegments, "targetWall", target, target.wall);
      }
      if (target.wallBottom) {
        pushSegmentColliderEntry(solidSegments, "targetWallBottom", target, target.wallBottom);
      }
    }

    for (let i = 0; i < slingshots.length; i++) {
      const sling = slingshots[i];
      const bodySegs = sling.bodyCollisionSegments;
      if (!bodySegs || !bodySegs.length) continue;
      for (let si = 0; si < bodySegs.length; si++) {
        solidSegments.push({
          kind: "slingshotBody",
          source: sling,
          seg: bodySegs[si],
          bounds: bodySegs[si].bounds
        });
      }
    }

    for (let i = 0; i < oneWayWallCollisionSegments.length; i++) {
      pushSegmentColliderEntry(
        oneWaySolidSegments,
        "oneWayWall",
        null,
        oneWayWallCollisionSegments[i]
      );
    }

    for (let i = 0; i < topLanes.length; i++) {
      const lane = topLanes[i];
      if (lane.trigger) {
        pushSegmentColliderEntry(sensorSegments, "topLaneTrigger", lane, lane.trigger);
      }
    }

    for (let i = 0; i < kickbacks.length; i++) {
      pushSegmentColliderEntry(sensorSegments, "kickback", kickbacks[i], kickbacks[i]);
    }

    for (let i = 0; i < ballSaves.length; i++) {
      pushSegmentColliderEntry(sensorSegments, "ballSave", ballSaves[i], ballSaves[i]);
    }

    for (let i = 0; i < bumpers.length; i++) {
      const bumper = bumpers[i];
      circleColliders.push({
        kind: "bumper",
        source: bumper,
        x: bumper.x,
        y: bumper.y,
        r: bumper.r,
        bounds: bumper.bounds
      });
    }

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      circleColliders.push({
        kind: "post",
        source: post,
        x: post.x,
        y: post.y,
        r: post.r,
        bounds: post.bounds
      });
    }

    for (let i = 0; i < dropTargets.length; i++) {
      activeSegmentColliders.push({
        kind: "dropTarget",
        source: dropTargets[i],
        seg: dropTargets[i],
        bounds: dropTargets[i].bounds
      });
    }

    for (let i = 0; i < targets.length; i++) {
      activeSegmentColliders.push({
        kind: "target",
        source: targets[i],
        seg: targets[i],
        bounds: targets[i].bounds
      });
    }

    for (let i = 0; i < slingshots.length; i++) {
      const sling = slingshots[i];
      if (sling.activeSegment) {
        activeSegmentColliders.push({
          kind: "slingshot",
          source: sling,
          seg: sling.activeSegment,
          bounds: sling.activeSegment.bounds
        });
      }
    }
  }

  function rebuildTableData(table) {
    TABLE = table;
    CANVAS_W = table.canvas?.w ?? 740;
    CANVAS_H = table.canvas?.h ?? 1280;
    invalidateStaticPlayfieldCache();

    bumpers = Array.isArray(table.bumpers)
      ? table.bumpers.map(b => ({ ...b, flash: 0 }))
      : [];

    walls = Array.isArray(table.walls)
      ? table.walls.map(w => ({ ...w }))
      : [];

    wallBumps = Array.isArray(table.wallBumps)
      ? table.wallBumps.map(w => ({
          ...w,
          segments: Array.isArray(w.segments) ? w.segments.map(seg => ({ ...seg })) : [],
          flash: 0,
          hitCooldown: 0
        }))
      : [];

    drainWalls = Array.isArray(table.drainWalls)
      ? table.drainWalls.map(w => ({
          ...w,
          points: Array.isArray(w.points) ? w.points.map(p => ({ ...p })) : [],
          collisionSegments: Array.isArray(w.collisionSegments)
            ? w.collisionSegments.map(seg => ({ ...seg }))
            : []
        }))
      : [];
    rebuildDrainWallVisualCaches();

    slingshots = Array.isArray(table.slingshots)
      ? table.slingshots.map(s => ({
          ...s,
          body: s.body ? s.body.map(p => ({ ...p })) : [],
          bodyPath2D: s.bodyPath ? new Path2D(s.bodyPath) : null,
          bodyCollisionSegments: Array.isArray(s.bodyCollisionSegments)
            ? s.bodyCollisionSegments.map(seg => ({ ...seg }))
            : [],
          activeSegment: { ...s.activeSegment },
          flash: 0
        }))
      : [];

    orbitVisualPaths = [];
    orbitCollisionSegments = [];
    oneWayWallCollisionSegments = [];

    if (table.orbit) {
      if (table.orbit.visualPaths) {
        orbitVisualPaths = Object.values(table.orbit.visualPaths)
          .filter(Boolean)
          .map(d => new Path2D(d));
      }
      if (Array.isArray(table.orbit.collisionCurves)) {
        orbitCollisionSegments = table.orbit.collisionCurves.flatMap(makeSegmentsFromCurveDef);
      }
      if (Array.isArray(table.orbit.oneWayCollisionCurves)) {
        oneWayWallCollisionSegments = table.orbit.oneWayCollisionCurves.flatMap(makeSegmentsFromCurveDef);
      }
    }

    if (Array.isArray(table.oneWayWalls)) {
      oneWayWallCollisionSegments = oneWayWallCollisionSegments.concat(
        table.oneWayWalls.flatMap(makeSegmentsFromCurveDef)
      );
    }

    targets = Array.isArray(table.targets)
      ? table.targets.map(t => ({
          ...t,
          wall: t.wall ? { ...t.wall } : null,
          flash: 0,
          hitCooldown: 0
        }))
      : [];

    targetIslands = Array.isArray(table.targetIslands)
      ? table.targetIslands.map(island => ({
          ...island,
          points: Array.isArray(island.points) ? island.points.map(p => ({ ...p })) : []
        }))
      : [];

    dropTargets = Array.isArray(table.dropTargets)
      ? table.dropTargets.map(t => ({
          ...t,
          down: false,
          flash: 0,
          hitCooldown: 0
        }))
      : [];

    resetDropTargetGroupResetTimers();

    topLaneDividers = Array.isArray(table.topLaneDividers)
      ? table.topLaneDividers.map(d => ({ ...d }))
      : [];

    topLanes = Array.isArray(table.topLanes)
      ? table.topLanes.map(lane => ({
          ...lane,
          indicator: lane.indicator ? { ...lane.indicator } : null,
          trigger: lane.trigger ? { ...lane.trigger } : null,
          lit: false,
          flash: 0,
          wasInside: false,
          passCooldown: 0
        }))
      : [];

    orbitLaneTriggers = Array.isArray(table.orbitLaneTriggers)
      ? table.orbitLaneTriggers.map(trigger => ({
          ...trigger,
          wasInside: false,
          passCooldown: 0
        }))
      : [];

    loopTriggers = Array.isArray(table.loopTriggers)
      ? table.loopTriggers.map(trigger => ({
          ...trigger,
          wasInside: false,
          passCooldown: 0
        }))
      : [];

    spinners = Array.isArray(table.spinners)
      ? table.spinners.map(s => ({
          ...s,
          rect: s.rect ? { ...s.rect } : null,
          spinCount: 0,
          wasInside: false,
          pulseRemaining: 0,
          pulseTimer: 0,
          pulseOn: false,
          spinSfxCue: 0,
          pendingScoreSpins: 0,
          sfxStepQueue: []
        }))
      : [];

    saucers = Array.isArray(table.saucers)
      ? table.saucers.map(saucer => ({
          ...saucer,
          wasInside: false,
          flash: 0
        }))
      : [];

    posts = Array.isArray(table.posts)
      ? table.posts.map(p => ({ ...p, sfxCooldown: 0 }))
      : [];

    kickbacks = Array.isArray(table.kickbacks)
      ? table.kickbacks.map(kb => ({
          ...kb,
          active: false,
          timerMs: 0,
          wasInside: false,
          flash: 0
        }))
      : [];

    ballSaves = Array.isArray(table.ballSaves)
      ? table.ballSaves.map(bs => ({
          ...bs,
          active: false,
          timerMs: 0,
          wasInside: false,
          flash: 0
        }))
      : [];

    timedBlockers = Array.isArray(table.timedBlockers)
      ? table.timedBlockers.map(blocker => {
          const triggerHitState = {};
          const triggers = Array.isArray(blocker.triggerTargets)
            ? blocker.triggerTargets
            : [];
          for (const id of triggers) {
            triggerHitState[id] = false;
          }
          return {
            ...blocker,
            open: false,
            timerMs: 0,
            triggerHitState,
            flash: 0
          };
        })
      : [];

    rebuildCollisionCollections();
  }

  function resetStuckDetection() {
    stuckTimerMs = 0;
    stuckSampleX = ball.x;
    stuckSampleY = ball.y;
    stuckRelaunchAvailable = false;
    currentStuckZoneId = null;
  }

  function isBallInStuckZone(b, zone) {
    if (zone.type === "circle") {
      const dx = b.x - zone.x;
      const dy = b.y - zone.y;
      return dx * dx + dy * dy <= zone.r * zone.r;
    }
    return false;
  }

  function getCurrentStuckZone(b) {
    const zones = TABLE?.stuckZones || [];
    for (let i = 0; i < zones.length; i++) {
      if (isBallInStuckZone(b, zones[i])) return zones[i];
    }
    return null;
  }

  function updateStuckDetection(dtMs) {
    stuckRelaunchAvailable = false;
    currentStuckZoneId = null;

    if (!ballInPlay || waitingForLaunch) {
      resetStuckDetection();
      return;
    }

    const zone = getCurrentStuckZone(ball);
    if (!zone) {
      resetStuckDetection();
      return;
    }

    const now = performance.now();
    const withinLaunchWindow =
      typeof zone.allowAfterLaunchMs === "number" &&
      now - lastLaunchAtMs <= zone.allowAfterLaunchMs;

    const allowedByZone = zone.allowAlways === true || withinLaunchWindow;

    if (!allowedByZone) {
      resetStuckDetection();
      return;
    }

    const speed = Math.hypot(ball.vx || 0, ball.vy || 0);
    const moved = Math.hypot(ball.x - stuckSampleX, ball.y - stuckSampleY);

    const nearlyStill = speed <= STUCK_SPEED_EPS && moved <= STUCK_MOVE_EPS;

    if (nearlyStill) {
      stuckTimerMs += dtMs;
    } else {
      stuckTimerMs = 0;
      stuckSampleX = ball.x;
      stuckSampleY = ball.y;
    }

    if (stuckTimerMs >= STUCK_TIME_MS) {
      stuckRelaunchAvailable = true;
      currentStuckZoneId = zone.id;
    }
  }

  function getBallLaunchMelodyId(ballNumber) {
    if (ballNumber === 1) return "start";
    if (ballNumber >= 2 && ballNumber <= 5) {
      return "ball" + ballNumber;
    }
    return null;
  }

  function getSpawnLaunchVelocityX(spawn) {
    const minVx = spawn.launchVxMin;
    const maxVx = spawn.launchVxMax;
    if (!Number.isFinite(minVx) && !Number.isFinite(maxVx)) return -1.0;

    const safeMin = Math.max(0, Number.isFinite(minVx) ? minVx : maxVx);
    const safeMax = Math.max(safeMin, Number.isFinite(maxVx) ? maxVx : safeMin);
    const magnitude = safeMin + Math.random() * (safeMax - safeMin);

    if (spawn.launchRandomDirection) {
      return Math.random() < 0.5 ? -magnitude : magnitude;
    }

    return spawn.launchDirection === "right" ? magnitude : -magnitude;
  }

  function placeBallAtSpawn() {
    const spawn = TABLE?.spawn ?? {
      x: CANVAS_W / 2,
      y: 80,
      launchPowerMin: 0,
      launchPowerMax: 0
    };

    const minPower = spawn.launchPowerMin ?? 0;
    const maxPower = spawn.launchPowerMax ?? minPower;
    const power = minPower + Math.random() * Math.max(0, maxPower - minPower);

    ball.x = spawn.x;
    ball.y = spawn.y;
    ball.vx = getSpawnLaunchVelocityX(spawn);
    ball.vy = -power;
  }

  function launchBall(options = {}) {
    const isNewBallLaunch = waitingForLaunch;
    placeBallAtSpawn();

    ballInPlay = true;
    waitingForLaunch = false;
    launchRequested = false;
    lastLaunchAtMs = performance.now();
    if (isNewBallLaunch) {
      secondChanceState.available = TABLE?.secondChance?.enabled === true && !tableModeRuntime;
      secondChanceState.firstLaunchAtMs = lastLaunchAtMs;
      secondChanceState.elapsedMs = 0;
    }
    resetStuckDetection();

    displayState.mode = "normal";
    if (TABLE?.ui?.displayHintsUntilFirstMessage) {
      displayState.awaitingFirstLaunchMessage = true;
      displayState.message = "";
      displayState.messageTimer = 0;
    }

    if (isNewBallLaunch && TABLE?.ui?.centerValueDisplayAfterFirstMessage) {
      displayState.centerValueDisplayUnlocked = false;
    }

    if (isNewBallLaunch && gameState.currentBall > 1) {
      const hints = getDisplayHints();
      displayState.hintIndex = (displayState.hintIndex + 1) % hints.length;
    }

    gameState.status = "playing";
    resetLoopBonusState();
    resetLoopRouteState();
    resetOrbitSoundState();

    if (isNewBallLaunch) {
      const melodyId = getBallLaunchMelodyId(gameState.currentBall);
      if (melodyId === "start" && TABLE?.id === "cosmo_raiders") {
        window.RCPAudio?.playBgm?.("cosmoRaiders", {
          muted: SFXmute,
          playbackRate: options.bgmPlaybackRate,
          layers: options.bgmLayers
        });
      } else if (melodyId) {
        window.RCPAudio?.playMelody?.(melodyId, {
          muted: SFXmute
        });
      }
    }
  }

  function resetTopLanes() {
    for (let li = 0; li < topLanes.length; li++) {
      topLanes[li].lit = false;
      topLanes[li].flash = 0;
      topLanes[li].wasInside = false;
      topLanes[li].passCooldown = 0;
    }
  }

  function resetOrbitLaneTriggers() {
    for (let i = 0; i < orbitLaneTriggers.length; i++) {
      orbitLaneTriggers[i].wasInside = false;
      orbitLaneTriggers[i].passCooldown = 0;
    }
  }

  function resetTable777LoopTriggerPairState() {
    table777LoopTriggerPairState.firstTriggerId = null;
    table777LoopTriggerPairState.timerMs = 0;
  }

  function resetTable777OrbitBonusState() {
    table777OrbitBonusState.active = false;
    table777OrbitBonusState.sequence = null;
    table777OrbitBonusState.stepIndex = 0;
    table777OrbitBonusState.timerMs = 0;
    table777OrbitBonusState.triggerWasInside = [];
  }

  function updateTable777OrbitBonusState(dtMs) {
    if (!isTable777()) return;
    if (!table777OrbitBonusState.active) return;

    table777OrbitBonusState.timerMs -= dtMs;

    if (table777OrbitBonusState.timerMs <= 0) {
      resetTable777OrbitBonusState();
    }
  }

  function cancelTable777OrbitBonus() {
    if (!isTable777()) return;
    resetTable777OrbitBonusState();
  }

  function getTable777OrbitBonusSequences(cfg) {
    const triggers = cfg?.triggers;
    if (!Array.isArray(triggers) || triggers.length < 2) return [];

    if (Array.isArray(cfg.sequences) && cfg.sequences.length > 0) {
      return cfg.sequences.filter(seq =>
        Array.isArray(seq) &&
        seq.length >= 2 &&
        seq.every(index => Number.isInteger(index) && index >= 0 && index < triggers.length)
      );
    }

    return [];
  }

  function awardTable777OrbitBonus() {
    const points = TABLE?.orbitBonus?.score ?? 100;
    addScore(points, "table777 orbit bonus");

    window.RCPAudio?.play?.("orbit", {
      muted: SFXmute
    });

    showDisplayMessage("ORBIT BONUS " + points, 90);
  }

  function handleTable777OrbitBonusTriggerEnter(triggerIndex) {
    const cfg = TABLE?.orbitBonus;
    if (!cfg) return;

    const sequences = getTable777OrbitBonusSequences(cfg);
    if (!sequences.length) return;

    const state = table777OrbitBonusState;

    if (!state.active) {
      const sequence = sequences.find(seq => seq[0] === triggerIndex);
      if (!sequence) return;

      state.active = true;
      state.sequence = sequence;
      state.stepIndex = 1;
      state.timerMs = cfg.timeoutMs ?? 1000;
      return;
    }

    const sequence = state.sequence;
    if (!Array.isArray(sequence)) {
      resetTable777OrbitBonusState();
      return;
    }

    if (triggerIndex !== sequence[state.stepIndex]) {
      resetTable777OrbitBonusState();

      const restartSequence = sequences.find(seq => seq[0] === triggerIndex);
      if (restartSequence) {
        state.active = true;
        state.sequence = restartSequence;
        state.stepIndex = 1;
        state.timerMs = cfg.timeoutMs ?? 1000;
      }
      return;
    }

    state.stepIndex++;

    if (state.stepIndex >= sequence.length) {
      awardTable777OrbitBonus();
      resetTable777OrbitBonusState();
    }
  }

  function checkTable777OrbitBonusTriggers(b) {
    if (!isTable777()) return;

    const cfg = TABLE?.orbitBonus;
    const triggers = cfg?.triggers;

    if (!Array.isArray(triggers) || triggers.length < 2) return;

    const state = table777OrbitBonusState;

    while (state.triggerWasInside.length < triggers.length) {
      state.triggerWasInside.push(false);
    }

    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      const dx = b.x - trigger.x;
      const dy = b.y - trigger.y;
      const r = trigger.r ?? 30;
      const inside = dx * dx + dy * dy <= r * r;
      const entered = inside && !state.triggerWasInside[i];

      if (entered) {
        handleTable777OrbitBonusTriggerEnter(i);
      }

      state.triggerWasInside[i] = inside;
    }
  }

  function updateTable777LoopTriggerPairState(dtMs) {
    if (!isTable777()) return;
    if (table777LoopTriggerPairState.timerMs <= 0) return;

    table777LoopTriggerPairState.timerMs -= dtMs;

    if (table777LoopTriggerPairState.timerMs <= 0) {
      resetTable777LoopTriggerPairState();
    }
  }

  function resetLoopTriggers() {
    for (let i = 0; i < loopTriggers.length; i++) {
      loopTriggers[i].wasInside = false;
      loopTriggers[i].passCooldown = 0;
    }

    resetTable777LoopTriggerPairState();
  }

  function resetSpinnerTransientState() {
    for (let i = 0; i < spinners.length; i++) {
      const spinner = spinners[i];

      spinner.wasInside = false;
      spinner.pulseRemaining = 0;
      spinner.pulseTimer = 0;
      spinner.pulseOn = false;
      spinner.pendingScoreSpins = 0;
      spinner.sfxStepQueue = [];
    }
  }

  function resetSaucerHoldState() {
    saucerHoldState.active = false;
    saucerHoldState.saucer = null;
    saucerHoldState.timerMs = 0;

    for (let i = 0; i < saucers.length; i++) {
      saucers[i].wasInside = false;
      saucers[i].flash = 0;
    }
  }

  function getDropTargetGroup(target) {
    if (typeof target?.group === "string" && target.group) {
      return target.group;
    }

    if (target.id === "drop_target_left_1" || target.id === "drop_target_left_2") {
      return "orbitValue";
    }

    if (
      target.id === "drop_target_right_1" ||
      target.id === "drop_target_right_2" ||
      target.id === "drop_target_right_3"
    ) {
      return "orbitBoost";
    }

    return "unknown";
  }

  function getDropTargetsByGroup(group) {
    return dropTargets.filter(t => getDropTargetGroup(t) === group);
  }

  function getDropTargetGroupsFromCurrentTable() {
    const groups = new Set();

    for (const target of dropTargets) {
      const group = getDropTargetGroup(target);
      if (group && group !== "unknown") {
        groups.add(group);
      }
    }

    return Array.from(groups);
  }

  function resetDropTargetGroupResetTimers() {
    for (const key of Object.keys(dropTargetGroupResetTimersMs)) {
      delete dropTargetGroupResetTimersMs[key];
    }

    for (const group of getDropTargetGroupsFromCurrentTable()) {
      dropTargetGroupResetTimersMs[group] = 0;
    }
  }

  function areDropTargetsInGroupAllDown(group) {
    const groupTargets = getDropTargetsByGroup(group);
    if (!groupTargets.length) return false;
    return groupTargets.every(t => t.down);
  }

  function getDropTargetGroupDownCount(group) {
    return getDropTargetsByGroup(group).reduce(
      (count, target) => count + (target.down ? 1 : 0),
      0
    );
  }

  function getSaucerBonusLevels() {
    return Array.isArray(TABLE?.saucerBonusLevels)
      ? TABLE.saucerBonusLevels
      : [];
  }

  function getSaucerBonusLevel(saucer) {
    const group = saucer?.requiredDropTargetGroup;
    if (!group) return null;

    const downCount = getDropTargetGroupDownCount(group);
    let activeLevel = null;

    for (const level of getSaucerBonusLevels()) {
      if (downCount >= level.requiredDownCount) {
        activeLevel = level;
      }
    }

    return activeLevel;
  }

  function isSaucerReady(saucer) {
    const group = saucer?.requiredDropTargetGroup;
    if (!group) return true;

    const requiredCount = saucer.requiredDropTargetCount;
    if (Number.isFinite(requiredCount)) {
      return getDropTargetGroupDownCount(group) >= requiredCount;
    }

    return areDropTargetsInGroupAllDown(group);
  }

  function notifySaucerBonusTargetProgress(group) {
    const saucer = saucers.find(item => item.requiredDropTargetGroup === group);
    if (!saucer) return;

    const level = getSaucerBonusLevel(saucer);
    if (!level) return;

    const downCount = getDropTargetGroupDownCount(group);
    if (downCount !== level.requiredDownCount) return;

    showDisplayMessage("SAUCER LEVEL " + level.level, 90);

    if (TABLE?.id === "table4") {
      const melodyIds = {
        1: "bonusGain",
        2: "saucerLevel2",
        3: "comboTarget"
      };
      const melodyId = melodyIds[level.level];

      if (melodyId) {
        window.RCPAudio?.playMelody?.(melodyId, {
          muted: SFXmute
        });
        return true;
      }
    }
    return false;
  }

  function awardDropTargetCompletionBonuses(target, { suppressMelody = false } = {}) {
    const bonuses = TABLE?.dropTargetCompletionBonuses;
    if (!Array.isArray(bonuses)) return;

    let awardedBonus = null;

    for (const bonus of bonuses) {
      const targetIds = bonus?.targetIds;
      if (!Array.isArray(targetIds) || !targetIds.includes(target.id)) continue;

      const completed = targetIds.every(targetId =>
        dropTargets.some(item => item.id === targetId && item.down)
      );
      if (!completed) continue;

      if (!awardedBonus || (bonus.score || 0) > (awardedBonus.score || 0)) {
        awardedBonus = bonus;
      }
    }

    if (awardedBonus) {
      addScore(awardedBonus.score, awardedBonus.id || "drop target completion", {
        particleX: (target.x1 + target.x2) / 2,
        particleY: (target.y1 + target.y2) / 2
      });

      if (
        !suppressMelody && TABLE?.id === "table4" &&
        (awardedBonus.id === "upper_left_pair" ||
          awardedBonus.id === "upper_right_pair")
      ) {
        window.RCPAudio?.playMelody?.("bonusGain", {
          muted: SFXmute
        });
      }
    }
  }

  function scheduleDropTargetGroupReset(group, delayMs) {
    if (!(group in dropTargetGroupResetTimersMs)) {
      dropTargetGroupResetTimersMs[group] = 0;
    }
    dropTargetGroupResetTimersMs[group] = delayMs;
  }

  function getDropTargetGroupResetDelayMs(group) {
    const perGroup = RULE_CONFIG.dropTargetGroupResetDelays?.[group];
    if (typeof perGroup === "number") return perGroup;
    if (group === "topDrop") return RULE_CONFIG.topDropResetDelayMs ?? 2000;
    return RULE_CONFIG.dropTargetGroupResetDelayMs ?? 2000;
  }

  function resetKickbacks() {
    for (let i = 0; i < kickbacks.length; i++) {
      const kb = kickbacks[i];
      kb.active = false;
      kb.timerMs = 0;
      kb.wasInside = false;
      kb.flash = 0;
    }
  }

  function activateKickbacksForDropTargetGroup(group) {
    let activated = false;

    for (let i = 0; i < kickbacks.length; i++) {
      const kb = kickbacks[i];
      const triggers = kb.triggerGroups;
      if (!Array.isArray(triggers) || !triggers.includes(group)) continue;

      const duration = kb.durationMs ?? RULE_CONFIG.kickbackDurationMs ?? 6000;
      kb.active = true;
      kb.timerMs = duration;
      kb.flash = 8;
      activated = true;
    }

    if (activated) {
      showRuleMessage("kickbackReady", "KICKBACK READY", 90);
    }

    return activated;
  }

  function updateKickbacks(dtMs) {
    for (let i = 0; i < kickbacks.length; i++) {
      const kb = kickbacks[i];
      if (kb.flash > 0) kb.flash--;

      if (!kb.active) continue;

      kb.timerMs -= dtMs;
      if (kb.timerMs <= 0) {
        kb.active = false;
        kb.timerMs = 0;
      }
    }
  }

  function checkKickbackSensors(b) {
    for (let i = 0; i < kickbacks.length; i++) {
      const kb = kickbacks[i];

      if (!kb.active) {
        kb.wasInside = false;
        continue;
      }

      const inside = isBallTouchingSensorSegment(b, kb);

      if (inside && !kb.wasInside) {
        b.vx += kb.powerX ?? 0;
        b.vy = Math.min(b.vy, 0) + (kb.powerY ?? 0);

        kb.active = false;
        kb.timerMs = 0;
        kb.flash = 10;

        window.RCPAudio?.play?.("featureConsumed", {
          muted: SFXmute
        });
      }

      kb.wasInside = inside;
    }
  }

  function resetBallSaves() {
    for (let i = 0; i < ballSaves.length; i++) {
      const bs = ballSaves[i];
      bs.active = false;
      bs.timerMs = 0;
      bs.wasInside = false;
      bs.flash = 0;
    }
  }

  function activateBallSavesForDropTargetGroup(group) {
    let activated = false;

    for (let i = 0; i < ballSaves.length; i++) {
      const bs = ballSaves[i];
      const triggers = bs.triggerGroups;
      if (!Array.isArray(triggers) || !triggers.includes(group)) continue;

      const duration = bs.durationMs ?? RULE_CONFIG.ballSaveDurationMs ?? 8000;
      bs.active = true;
      bs.timerMs = duration;
      bs.flash = 8;
      activated = true;
    }

    if (activated) {
      showRuleMessage("ballSaveReady", "BALL SAVE READY", 90);
    }

    return activated;
  }

  function updateBallSaves(dtMs) {
    for (let i = 0; i < ballSaves.length; i++) {
      const bs = ballSaves[i];
      if (bs.flash > 0) bs.flash--;

      if (!bs.active) continue;

      bs.timerMs -= dtMs;
      if (bs.timerMs <= 0) {
        bs.active = false;
        bs.timerMs = 0;
      }
    }
  }

  function checkBallSaveSensors(b) {
    for (let i = 0; i < ballSaves.length; i++) {
      const bs = ballSaves[i];

      if (!bs.active) {
        bs.wasInside = false;
        continue;
      }

      const inside = isBallTouchingSensorSegment(b, bs);

      if (inside && !bs.wasInside) {
        b.vx += bs.powerX ?? 0;
        b.vy = Math.min(b.vy, 0) + (bs.powerY ?? -24);

        bs.active = false;
        bs.timerMs = 0;
        bs.flash = 12;

        window.RCPAudio?.play?.("featureConsumed", {
          muted: SFXmute
        });
      }

      bs.wasInside = inside;
    }
  }

  function updateDropTargetGroupResetTimers(dtMs) {
    for (const group of Object.keys(dropTargetGroupResetTimersMs)) {
      if (dropTargetGroupResetTimersMs[group] <= 0) continue;

      dropTargetGroupResetTimersMs[group] -= dtMs;

      if (dropTargetGroupResetTimersMs[group] <= 0) {
        resetDropTargetGroup(group);
      }
    }
  }

  function resetDropTargetGroup(group) {
    for (let i = 0; i < dropTargets.length; i++) {
      if (getDropTargetGroup(dropTargets[i]) !== group) continue;
      dropTargets[i].down = false;
      dropTargets[i].flash = 0;
      dropTargets[i].hitCooldown = 0;
    }

    dropTargetGroupResetTimersMs[group] = 0;
  }

  function resetDropTargets() {
    for (let di = 0; di < dropTargets.length; di++) {
      dropTargets[di].down = false;
      dropTargets[di].flash = 0;
      dropTargets[di].hitCooldown = 0;
    }

    for (const group of getDropTargetGroupsFromCurrentTable()) {
      dropTargetGroupResetTimersMs[group] = 0;
    }
  }

  function areAllTopLanesLit() {
    if (!topLanes.length) return false;

    for (let i = 0; i < topLanes.length; i++) {
      if (!topLanes[i].lit) return false;
    }

    return true;
  }

  function awardTopLane(lane) {
    cancelLoopBonusForScoringTrigger("topLane");
    addScore(RULE_CONFIG.topLaneScore, "top lane pass");

    if (!areAllTopLanesLit()) return;

    addScore(RULE_CONFIG.topLaneCompleteScore, "top lane complete");

    const prevMult = ruleState.bonusMult;

    ruleState.bonusMult = Math.min(
      RULE_CONFIG.bonusMultMax,
      ruleState.bonusMult + 1
    );

    if (ruleState.bonusMult > prevMult) {
      showRuleMessage("bonusMultUp", "BONUS MULT UP", 90);
    } else {
      showDisplayMessage("TOP LANE BONUS", 90);
    }

    resetTopLanes();
  }

  function resetBallScopedRules() {
    if (!RULE_CONFIG.bonusValuePersistsOnBallLoss) {
      ruleState.bonusValue = RULE_CONFIG.bonusValueInitialScore;
    }
    ruleState.bonusMult = 1;

    window.RCPAudio?.stopMelody?.();

    ruleState.orbitBoostActive = false;
    ruleState.orbitBoostTimerMs = 0;

    if (!isTable777()) {
      ruleState.bumperHitCount = 0;
      ruleState.bumperBonusStep = 0;
    }

    if (isTable777()) {
      ruleState.guaranteedRoleReady = false;
    }

    resetTopLanes();
    resetOrbitLaneTriggers();
    resetLoopTriggers();
    resetSpinnerTransientState();
    resetTable777SlotVisualState();
    resetTable777OrbitBonusState();
    resetTable777DelayedSlotMessage();
    resetTable777PendingSlotReward();
    resetDropTargets();
    resetKickbacks();
    resetBallSaves();
    resetTimedBlockers();
    resetCenterValueDoubler();
    resetSaucerHoldState();
  }

  function resetTimedBlockers() {
    for (let i = 0; i < timedBlockers.length; i++) {
      const blocker = timedBlockers[i];
      blocker.open = false;
      blocker.timerMs = 0;
      blocker.flash = 0;
      const triggers = Array.isArray(blocker.triggerTargets) ? blocker.triggerTargets : [];
      for (const id of triggers) {
        blocker.triggerHitState[id] = false;
      }
    }
  }

  function notifyTimedBlockerTargetHit(targetId) {
    for (let i = 0; i < timedBlockers.length; i++) {
      const blocker = timedBlockers[i];
      const triggers = Array.isArray(blocker.triggerTargets) ? blocker.triggerTargets : [];
      if (!triggers.includes(targetId)) continue;

      blocker.triggerHitState[targetId] = true;

      let allHit = triggers.length > 0;
      for (const id of triggers) {
        if (!blocker.triggerHitState[id]) {
          allHit = false;
          break;
        }
      }

      if (!allHit) continue;

      blocker.open = true;
      blocker.timerMs = blocker.openDurationMs ?? RULE_CONFIG.timedBlockerOpenDurationMs ?? 6000;
      blocker.flash = 8;

      for (const id of triggers) {
        blocker.triggerHitState[id] = false;
      }

      if (blocker.messageOpen) {
        showDisplayMessage(blocker.messageOpen, 90);
      } else {
        showDisplayMessage("CENTER OPEN", 90);
      }
    }
  }

  function updateTimedBlockers(dtMs) {
    for (let i = 0; i < timedBlockers.length; i++) {
      const blocker = timedBlockers[i];
      if (blocker.open) {
        blocker.timerMs -= dtMs;
        if (blocker.timerMs <= 0) {
          blocker.timerMs = 0;
          blocker.open = false;
        }
      }
      if (blocker.flash > 0) blocker.flash--;
    }
  }

  function resetShotMapState() {
    shotMapState.skipFlipperCollisionSubsteps = 0;
  }

  function handleTableModeGameOver() {
    ballInPlay = false;
    waitingForLaunch = true;
    ball.vx = 0;
    ball.vy = 0;
    resetStuckDetection();
    nudgeCooldownMs = 0;
    resetShotMapState();

    displayState.lastBonusTotal = 0;
    displayState.lastTotalScore = score;
    submitRecord(score);
    displayState.mode = "gameOver";
    gameState.status = "gameOver";
    gameState.resultInputLock = GAME_CONFIG.resultInputLockFrames;

    window.RCPAudio?.playMelody?.("gameOver", {
      muted: SFXmute
    });
  }

  function trySecondChance() {
    if (gameState.status === "secondChance") return true;
    if (!ballInPlay || tableModeRuntime || TABLE?.secondChance?.enabled !== true ||
        !secondChanceState.available || secondChanceState.firstLaunchAtMs === null ||
        performance.now() - secondChanceState.firstLaunchAtMs > 5000) return false;

    secondChanceState.available = false;
    secondChanceState.elapsedMs = 0;
    ballInPlay = false;
    waitingForLaunch = false;
    launchRequested = false;
    ball.vx = 0;
    ball.vy = 0;
    resetStuckDetection();
    nudgeCooldownMs = 0;
    resetShotMapState();
    gameState.status = "secondChance";
    displayState.mode = "secondChance";
    displayState.message = "";
    displayState.messageTimer = 0;
    window.RCPAudio?.playMelody?.("secondChance", { muted: SFXmute });
    return true;
  }

  function updateSecondChance(dtMs) {
    if (gameState.status !== "secondChance") return;
    secondChanceState.elapsedMs += dtMs;
    // Keep the relaunch notice visible throughout the melody and brief hold.
    if (secondChanceState.elapsedMs >= 1600) launchBall();
  }

  function handleBallLost() {
    if (trySecondChance()) return;
    const lostBall = gameState.currentBall;
    displayState.lastLostBall = lostBall;

    const bonusTotal = RULE_CONFIG.collectBonusOnBallLoss
      ? ruleState.bonusValue * ruleState.bonusMult
      : 0;

    if (bonusTotal > 0) {
      addScore(bonusTotal, "bonus collect");
    }

    displayState.lastBonusTotal = bonusTotal;
    displayState.lastTotalScore = score;

    resetBallScopedRules();
    resetLoopBonusState();
    resetLoopRouteState();
    resetOrbitSoundState();

    ballInPlay = false;
    waitingForLaunch = true;
    ball.vx = 0;
    ball.vy = 0;
    resetStuckDetection();
    nudgeCooldownMs = 0;
    resetShotMapState();

    if (gameState.currentBall < getBallsPerGame()) {
      displayState.mode = "ballLost";
      gameState.currentBall++;
      gameState.status = "ballLost";

      window.RCPAudio?.playMelody?.("ballLost", {
        muted: SFXmute
      });
    } else {
      submitRecord(score);
      displayState.mode = "gameOver";
      gameState.status = "gameOver";
      gameState.resultInputLock = GAME_CONFIG.resultInputLockFrames;
      window.RCPAudio?.playMelody?.("gameOver", {
        muted: SFXmute
      });
    }
  }

  function collideOneWaySegment(b, seg) {
    const nx = seg.nx ?? 0;
    const ny = seg.ny ?? 0;
    const dx = b.x - seg.midX;
    const dy = b.y - seg.midY;
    const sideDot = dx * nx + dy * ny;
    if (sideDot <= 0) return;
    collideSegment(b, seg.x1, seg.y1, seg.x2, seg.y2, seg.r, false, 0, 0, 0);
  }

  function notifyTableModeNonEnemyCollision() {
    tableModeRuntime?.onNonEnemyCollision?.();
  }

  function collideSegment(b, x1, y1, x2, y2, r, isFlipper, flipperOmega, pivotX, pivotY) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) {
      t = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const dist2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
    const totalR = BALL_RADIUS + r;
    if (dist2 >= totalR * totalR) return false;
    const dist = Math.sqrt(dist2);
    if (dist === 0) return false;
    notifyTableModeNonEnemyCollision();
    const nx = (b.x - px) / dist;
    const ny = (b.y - py) / dist;
    const depth = totalR - dist;
    b.x += nx * depth;
    b.y += ny * depth;
    let svx = 0;
    let svy = 0;
    if (isFlipper) {
      const rx = px - pivotX;
      const ry = py - pivotY;
      svx = -flipperOmega * ry;
      svy = flipperOmega * rx;
    }
    let rvx = b.vx - svx;
    let rvy = b.vy - svy;
    const dot = rvx * nx + rvy * ny;
    if (dot < 0) {
      const restitution = 0.6;
      let bump = 1 + restitution;
      if (isFlipper && Math.abs(flipperOmega) > 0.1) bump += 0.8;
      rvx -= bump * dot * nx;
      rvy -= bump * dot * ny;
      b.vx = rvx + svx;
      b.vy = rvy + svy;
    }
    return true;
  }

  function collideBumper(b, bumper) {
    const dx = b.x - bumper.x;
    const dy = b.y - bumper.y;
    const distSq = dx * dx + dy * dy;
    const collisionR = bumper.collisionR ?? bumper.r;
    const totalR = BALL_RADIUS + collisionR;
    const totalRSq = totalR * totalR;
    if (distSq >= totalRSq) return;
    const dist = Math.sqrt(distSq);
    if (dist < 1e-6) return;
    notifyTableModeNonEnemyCollision();
    const nx = dx / dist;
    const ny = dy / dist;
    const depth = totalR - dist;
    b.x += nx * depth;
    b.y += ny * depth;
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      const restitution = 0.9;
      b.vx -= (1 + restitution) * dot * nx;
      b.vy -= (1 + restitution) * dot * ny;
      b.vx += nx * bumper.power;
      b.vy += ny * bumper.power;

      window.RCPAudio?.play?.("bumper", {
        muted: SFXmute
      });

      awardBumperHit();
      bumper.flash = 6;
    }
  }

  function playTargetHitAudio(target) {
    const isNormalTable1OrbitTarget =
      TABLE?.id === "table1" &&
      target.type !== "fixedScore" &&
      target.type !== "centerValue" &&
      !ruleState.orbitBoostActive;

    const isNormalTable3CenterTarget =
      TABLE?.id === "table3" &&
      target.type === "centerValue" &&
      !ruleState.centerValueDoublerActive;

    if (isNormalTable1OrbitTarget || isNormalTable3CenterTarget) {
      window.RCPAudio?.playMelody?.("valueTarget", {
        muted: SFXmute
      });
      return;
    }

    window.RCPAudio?.play?.("target", {
      muted: SFXmute
    });
  }

  function collideTarget(b, target) {
    const x1 = target.x1;
    const y1 = target.y1;
    const x2 = target.x2;
    const y2 = target.y2;
    const r = target.r ?? 6;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) {
      t = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }

    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const hitFromBelow = b.y >= py;
    const dist2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
    const totalR = BALL_RADIUS + r;
    if (dist2 >= totalR * totalR) return;

    const dist = Math.sqrt(dist2);
    if (dist < 1e-6) return;
    notifyTableModeNonEnemyCollision();

    const nx = (b.x - px) / dist;
    const ny = (b.y - py) / dist;
    const depth = totalR - dist;

    b.x += nx * depth;
    b.y += ny * depth;

    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      const restitution = 0.45;
      b.vx -= (1 + restitution) * dot * nx;
      b.vy -= (1 + restitution) * dot * ny;
    }

    if (target.hitFrom === "below" && !hitFromBelow) return;

    if (target.hitCooldown > 0) return;

    const rebound = target.rebound ?? 0;
    b.vx += nx * rebound;
    b.vy += ny * rebound;

    if (isCenterValueDoublerTriggerLocked(target)) return;

    playTargetHitAudio(target);

    if (target.type === "fixedScore") {
      awardFixedScoreTargetHit(target);
    } else if (target.type === "centerValue") {
      awardCenterValueTargetHit(target);
    } else {
      awardOrbitTargetHit(target);
    }
    notifyTimedBlockerTargetHit(target.id);
    notifyCenterValueDoublerTargetHit(target.id);
    tableModeRuntime?.onTargetHit?.(target.id);
    target.flash = 6;
    target.hitCooldown = 6;
  }

  function activateOrbitBoost() {
    ruleState.orbitBoostActive = true;
    ruleState.orbitBoostTimerMs = RULE_CONFIG.orbitBoostDurationMs;

    if (TABLE?.id === "table1") {
      window.RCPAudio?.playMelody?.("boosted", {
        muted: SFXmute
      });
    }
  }

  function handleTable777DropTargetBankComplete(group) {
    if (!isTable777()) return false;

    if (group === "loopValue") {
      const prev = ruleState.loopValue;

      ruleState.loopValue = Math.min(
        TABLE777_LOOP_VALUE_MAX,
        ruleState.loopValue + TABLE777_LOOP_VALUE_ADD
      );

      if (ruleState.loopValue > prev) {
        if (ruleState.loopValue >= TABLE777_LOOP_VALUE_MAX) {
          showDisplayMessage("LOOP VALUE MAX " + ruleState.loopValue, 90);
        } else {
          showDisplayMessage("LOOP VALUE UP " + ruleState.loopValue, 90);
        }
      } else {
        showDisplayMessage("LOOP VALUE MAX " + ruleState.loopValue, 90);
      }

      return true;
    }

    if (group === "combo") {
      ruleState.guaranteedRoleReady = true;
      showDisplayMessage("COMBO READY", 90);
      return true;
    }

    return false;
  }

  function getDropTargetBankMelodyId(group) {
    if (TABLE?.id === "table4" && group === "bonusReady") {
      return null;
    }

    if (TABLE?.id === "table777" && group === "combo") {
      return "comboTarget";
    }

    if (TABLE?.id === "table2" && group === "topDrop") {
      return "levelUp";
    }

    if (TABLE?.id === "table1" && group === "orbitBoost") {
      return null;
    }

    return "bankCompleted";
  }

  function playDropTargetBankMelody(group) {
    const melodyId = getDropTargetBankMelodyId(group);
    if (!melodyId) return;

    window.RCPAudio?.playMelody?.(melodyId, {
      muted: SFXmute
    });
  }

  function collideDropTarget(b, target) {
    if (target.down) return;

    const x1 = target.x1;
    const y1 = target.y1;
    const x2 = target.x2;
    const y2 = target.y2;
    const r = target.r ?? 5;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = 0;
    if (len2 > 0) {
      t = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }

    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const hitFromBelow = b.y >= py;
    const dist2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
    const totalR = BALL_RADIUS + r;
    if (dist2 >= totalR * totalR) return;

    const dist = Math.sqrt(dist2);
    if (dist < 1e-6) return;
    notifyTableModeNonEnemyCollision();

    const nx = (b.x - px) / dist;
    const ny = (b.y - py) / dist;
    const depth = totalR - dist;

    b.x += nx * depth;
    b.y += ny * depth;

    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      const restitution = 0.45;
      b.vx -= (1 + restitution) * dot * nx;
      b.vy -= (1 + restitution) * dot * ny;
    }

    if (target.hitFrom === "below" && !hitFromBelow) return;

    if (target.hitCooldown > 0) return;

    const rebound = target.rebound ?? 1.2;
    b.vx += nx * rebound;
    b.vy += ny * rebound;

    const group = getDropTargetGroup(target);
    const groupScoreConfig = RULE_CONFIG.dropTargetScores[group];

    cancelLoopBonusForScoringTrigger("dropTarget");
    cancelTable777OrbitBonus();
    addScore(groupScoreConfig?.hit ?? 0, "drop target hit");

    target.down = true;
    target.flash = 6;
    target.hitCooldown = 6;

    const playedSaucerLevelMelody = notifySaucerBonusTargetProgress(group);
    awardDropTargetCompletionBonuses(target, { suppressMelody: playedSaucerLevelMelody });

    const bankCompleted = areDropTargetsInGroupAllDown(group);
    const bankHasMelody = bankCompleted && (
      getDropTargetBankMelodyId(group) || (TABLE?.id === "table1" && group === "orbitBoost")
    );
    if (!bankHasMelody && !window.RCPAudio?.isMelodyPlaying?.()) {
      window.RCPAudio?.play?.("dropTarget", { muted: SFXmute });
    }

    if (bankCompleted) {
      const bankCompleteScore = groupScoreConfig?.bankComplete ?? 0;

      if (group === "topDrop") {
        addScore(ruleState.topDropBankBonusScore, "topDrop bank complete", {
          particleX: (target.x1 + target.x2) / 2,
          particleY: (target.y1 + target.y2) / 2
        });

        scheduleDropTargetGroupReset(
          "topDrop",
          RULE_CONFIG.topDropResetDelayMs
        );

        ruleState.topDropBankBonusScore = Math.min(
          RULE_CONFIG.topDropBankBonusMaxScore,
          ruleState.topDropBankBonusScore + RULE_CONFIG.topDropBankBonusAdd
        );

        showRuleMessage("topDropComplete", "TOP DROP COMPLETE", 90);
        playDropTargetBankMelody(group);
      } else {
        addScore(bankCompleteScore, "drop target bank complete");
        playDropTargetBankMelody(group);
        tableModeRuntime?.onDropTargetBankComplete?.(group);

        if (handleTable777DropTargetBankComplete(group)) {
          const resetDelayMs = getDropTargetGroupResetDelayMs(group);
          if (resetDelayMs > 0) {
            scheduleDropTargetGroupReset(group, resetDelayMs);
          }
          return;
        }

        if (group === "orbitValue") {
          if (usesSpinnerValueProgression()) {
            increaseSpinnerValue();
          } else {
            increaseOrbitTargetBaseScore();
          }
        } else if (group === "orbitBoost") {
          activateOrbitBoost();
          showDisplayMessage("ORBIT BOOST READY", 90);
        }

        activateKickbacksForDropTargetGroup(group);
        activateBallSavesForDropTargetGroup(group);

        const resetDelayMs = getDropTargetGroupResetDelayMs(group);
        if (resetDelayMs > 0) {
          scheduleDropTargetGroupReset(group, resetDelayMs);
        }
      }
    }
  }

  function collidePost(b, post) {
    const dx = b.x - post.x;
    const dy = b.y - post.y;
    const distSq = dx * dx + dy * dy;
    const totalR = BALL_RADIUS + post.r;

    if (distSq >= totalR * totalR) return;

    const dist = Math.sqrt(distSq);
    if (dist < 1e-6) return;
    notifyTableModeNonEnemyCollision();

    const nx = dx / dist;
    const ny = dy / dist;
    const depth = totalR - dist;

    b.x += nx * depth;
    b.y += ny * depth;

    const impactSpeed = Math.hypot(b.vx || 0, b.vy || 0);
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      const restitution = post.restitution ?? 0.55;
      b.vx -= (1 + restitution) * dot * nx;
      b.vy -= (1 + restitution) * dot * ny;

      if (
        post.id === "center_post" &&
        impactSpeed >= CENTER_POST_SFX_MIN_SPEED &&
        (post.sfxCooldown || 0) <= 0
      ) {
        window.RCPAudio?.play?.("centerPost", {
          muted: SFXmute
        });
        post.sfxCooldown = CENTER_POST_SFX_COOLDOWN_FRAMES;
      }
    }
  }

  function isBallTouchingSensorSegment(b, seg) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len2 = dx * dx + dy * dy;

    let t = 0;
    if (len2 > 0) {
      t = ((b.x - seg.x1) * dx + (b.y - seg.y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
    }

    const px = seg.x1 + t * dx;
    const py = seg.y1 + t * dy;

    const sensorR = seg.r ?? 6;
    const totalR = BALL_RADIUS + sensorR;

    const ddx = b.x - px;
    const ddy = b.y - py;

    return ddx * ddx + ddy * ddy < totalR * totalR;
  }

  function checkTopLanePass(b, lane) {
    const trigger = lane.trigger;
    if (!trigger) return;

    const inside = isBallTouchingSensorSegment(b, trigger);

    if (lane.passCooldown > 0) {
      lane.wasInside = inside;
      return;
    }

    if (inside && !lane.wasInside) {
      const becameLit = !lane.lit;

      lane.lit = becameLit;
      lane.flash = 8;
      lane.passCooldown = TOP_LANE_PASS_COOLDOWN_FRAMES;

      const completed = becameLit && areAllTopLanesLit();

      if (completed) {
        window.RCPAudio?.playMelody?.("toplane", {
          muted: SFXmute
        });
      } else {
        window.RCPAudio?.play?.(becameLit ? "laneOn" : "laneOff", {
          muted: SFXmute
        });
      }

      awardTopLane(lane);
    }

    lane.wasInside = inside;
  }

  function checkOrbitLaneTrigger(b, trigger) {
    const dx = b.x - trigger.x;
    const dy = b.y - trigger.y;
    const radius = trigger.r ?? 20;
    const inside = dx * dx + dy * dy <= radius * radius;

    if (trigger.passCooldown > 0) {
      trigger.wasInside = inside;
      return;
    }

    if (inside && !trigger.wasInside) {
      const points = trigger.score ?? 0;
      const label = trigger.label || trigger.id || "orbit lane";

      cancelLoopBonusForScoringTrigger("orbitLane");
      addScore(points, label);

      window.RCPAudio?.play?.("orbit", {
        muted: SFXmute
      });

      if (trigger.message) {
        showDisplayMessage(trigger.message, 60);
      }

      trigger.passCooldown = trigger.cooldownFrames ?? ORBIT_LANE_TRIGGER_COOLDOWN_FRAMES;
    }

    trigger.wasInside = inside;
  }

  function getTable777SlotLevel(loopCount) {
    if (loopCount >= TABLE777_SLOT_LEVEL_THRESHOLDS[2]) return 2;
    if (loopCount >= TABLE777_SLOT_LEVEL_THRESHOLDS[1]) return 1;
    if (loopCount >= TABLE777_SLOT_LEVEL_THRESHOLDS[0]) return 0;
    return 0;
  }

  function getTable777LoopCountIndicatorLitCount() {
    if (!isTable777()) return 0;

    const cfg = TABLE?.loopCountIndicator;
    const polygons = cfg?.polygons;

    if (!Array.isArray(polygons) || polygons.length <= 0) return 0;

    const max = Math.max(0, Math.min(
      polygons.length,
      Math.floor(cfg.max ?? polygons.length)
    ));

    return Math.max(0, Math.min(
      max,
      Math.floor(ruleState.loopCount || 0)
    ));
  }

  function getTable777LoopCountIndicatorLitColor() {
    const loopCount = Math.floor(ruleState.loopCount || 0);

    if (loopCount >= 8) {
      return getTableColorValue("flipper", "#b12");
    }

    if (loopCount >= 3) {
      return getTableColorValue("comboLit", "#f83");
    }

    return "#fff";
  }

  function resetTable777DelayedSlotMessage() {
    table777DelayedSlotMessageState.timerMs = 0;
    table777DelayedSlotMessageState.message = "";
    table777DelayedSlotMessageState.frames = 90;
  }

  function queueTable777DelayedSlotMessage(message, delayMs = 1200, frames = 90) {
    if (!isTable777()) return;
    if (!message) {
      resetTable777DelayedSlotMessage();
      return;
    }

    table777DelayedSlotMessageState.timerMs = delayMs;
    table777DelayedSlotMessageState.message = message;
    table777DelayedSlotMessageState.frames = frames;
  }

  function updateTable777DelayedSlotMessage(dtMs) {
    if (!isTable777()) return;
    if (table777DelayedSlotMessageState.timerMs <= 0) return;

    table777DelayedSlotMessageState.timerMs -= dtMs;

    if (table777DelayedSlotMessageState.timerMs > 0) return;

    const message = table777DelayedSlotMessageState.message;
    const frames = table777DelayedSlotMessageState.frames;
    resetTable777DelayedSlotMessage();

    if (message) {
      showDisplayMessage(message, frames);
    }
  }

  function resetTable777PendingSlotReward() {
    table777PendingSlotRewardState.timerMs = 0;
    table777PendingSlotRewardState.reward = null;
  }

  function queueTable777SlotReward(reward, delayMs = 1200) {
    if (!isTable777()) return;
    if (!reward) {
      resetTable777PendingSlotReward();
      return;
    }

    table777PendingSlotRewardState.timerMs = delayMs;
    table777PendingSlotRewardState.reward = reward;
  }

  function applyTable777SlotReward(reward) {
    if (!isTable777() || !reward) return;

    if (reward.payout > 0) {
      const slotCfg = TABLE?.slotVisual;
      const slotScale = slotCfg?.scale ?? 1;
      addScore(reward.payout, "table777 slot payout", slotCfg ? {
        particleX: slotCfg.x + (TABLE777_SLOT_VISUAL_W * slotScale) / 2,
        particleY: slotCfg.y + (TABLE777_SLOT_VISUAL_H * slotScale) / 2
      } : null);
    }

    if (reward.kickbackCount > 0) {
      activateTable777SlotKickbacks(reward.kickbackCount);
    }

    if (reward.ballSaveCount > 0) {
      activateTable777SlotBallSaves(reward.ballSaveCount);
    }

    const resultMelodyId =
      getTable777SlotResultMelodyId(
        reward.result,
        reward.kickbackCount,
        reward.ballSaveCount
      );

    if (resultMelodyId) {
      window.RCPAudio?.playMelody?.(resultMelodyId, {
        muted: SFXmute
      });
    }

    const message = getTable777SlotResultMessage({
      result: reward.result,
      payout: reward.payout,
      kickbackCount: reward.kickbackCount,
      ballSaveCount: reward.ballSaveCount
    });

    showDisplayMessage(message, 90);
  }

  function updateTable777PendingSlotReward(dtMs) {
    if (!isTable777()) return;
    if (table777PendingSlotRewardState.timerMs <= 0) return;

    table777PendingSlotRewardState.timerMs -= dtMs;
    if (table777PendingSlotRewardState.timerMs > 0) return;

    const reward = table777PendingSlotRewardState.reward;
    resetTable777PendingSlotReward();
    applyTable777SlotReward(reward);
  }

  function getComboDropTargetsForTable777Indicator() {
    return dropTargets.filter(target => getDropTargetGroup(target) === "combo");
  }

  function isTable777ComboBankCurrentlyComplete() {
    const comboTargets = getComboDropTargetsForTable777Indicator();
    return comboTargets.length > 0 && comboTargets.every(target => target.down);
  }

  function shouldLightTable777TargetComboIndicatorItem(item) {
    if (!isTable777()) return false;

    if (ruleState.guaranteedRoleReady) {
      return true;
    }

    if (isTable777ComboBankCurrentlyComplete()) {
      return false;
    }

    const target = dropTargets.find(t => t.id === item.targetId);
    return !!target?.down;
  }

  function clampTable777SlotLevel(level) {
    const n = Math.floor(Number(level) || 0);
    return Math.max(0, Math.min(2, n));
  }

  function pickTable777WeightedSymbol(weights) {
    const entries = Object.entries(weights || {});
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight || 0), 0);

    if (total <= 0) return "bar";

    let roll = Math.random() * total;

    for (const [symbol, weight] of entries) {
      roll -= Math.max(0, weight || 0);
      if (roll <= 0) return symbol;
    }

    return entries[0]?.[0] ?? "bar";
  }

  function chooseTable777SlotResult() {
    const level = clampTable777SlotLevel(ruleState.slotLevel);

    if (ruleState.guaranteedRoleReady) {
      const symbol = TABLE777_GUARANTEED_SYMBOL_BY_LEVEL[level] || "bar";
      ruleState.guaranteedRoleReady = false;
      return [symbol, symbol, symbol];
    }

    const weights = TABLE777_SLOT_LEVEL_WEIGHTS[level] || TABLE777_SLOT_LEVEL_WEIGHTS[0];

    return [
      pickTable777WeightedSymbol(weights),
      pickTable777WeightedSymbol(weights),
      pickTable777WeightedSymbol(weights)
    ];
  }

  function getTable777SlotPayout(result) {
    if (!Array.isArray(result) || result.length < 3) return 0;

    const [a, b, c] = result;

    if (a === "seven" && b === "seven" && c === "seven") return 2000;
    if (a === "bell" && b === "bell" && c === "bell") return 500;
    if (a === "bar" && b === "bar" && c === "bar") return 250;

    let points = 0;

    for (const symbol of result) {
      if (symbol === "bar") points += 50;
      if (symbol === "bell") points += 100;
      if (symbol === "seven") points += 200;
    }

    return points;
  }

  function isTable777Triple(result, symbolId) {
    return Array.isArray(result) &&
      result.length === 3 &&
      result.every(symbol => symbol === symbolId);
  }

  function getTable777SlotResultMelodyId(
    result,
    kickbackCount = 0,
    ballSaveCount = 0
  ) {
    if (isTable777Triple(result, "seven")) return "slot777";
    if (isTable777Triple(result, "bell")) return "slotBell";
    if (isTable777Triple(result, "bar")) return "slotBar";

    if (kickbackCount > 0 || ballSaveCount > 0) {
      return "slotFeature";
    }

    return null;
  }

  function getTable777SlotResultMessage({
    result,
    payout = 0,
    kickbackCount = 0,
    ballSaveCount = 0
  } = {}) {
    const hasKickback = kickbackCount > 0;
    const hasBallSave = ballSaveCount > 0;

    if (isTable777Triple(result, "seven")) {
      return "777 JACKPOT 2000";
    }

    if (isTable777Triple(result, "bell")) {
      return "BELL COMBO 500";
    }

    if (isTable777Triple(result, "bar")) {
      return "BAR COMBO 250";
    }

    if (payout > 0 && hasKickback && hasBallSave) {
      return "WIN " + payout + " + FEATURES";
    }

    if (payout > 0 && hasKickback) {
      return "WIN " + payout + " + KICKBACK";
    }

    if (payout > 0 && hasBallSave) {
      return "WIN " + payout + " + BALL SAVE";
    }

    if (payout > 0) {
      return "WIN " + payout;
    }

    if (hasKickback && hasBallSave) {
      return "WIN + FEATURES";
    }

    if (hasKickback) {
      return "WIN + KICKBACK";
    }

    if (hasBallSave) {
      return "WIN + BALL SAVE";
    }

    return "NO WIN";
  }

  function getTable777SlotResultLabel(result) {
    return result.map(symbol => {
      if (symbol === "bar") return "BAR";
      if (symbol === "bell") return "BELL";
      if (symbol === "seven") return "7";
      if (symbol === "kickback") return "KICKBACK";
      if (symbol === "ballSave") return "BALL SAVE";
      return String(symbol).toUpperCase();
    }).join(" ");
  }

  function table777SlotWrapIndex(index, count) {
    return ((index % count) + count) % count;
  }

  function table777SlotBackwardDiff(from, to, count) {
    let diff = from - to;
    while (diff < 0) diff += count;
    return diff;
  }

  function table777SlotEaseOutCubic(t) {
    const v = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - v, 3);
  }

  function findTable777SlotPrevSymbolIndex(drum, symbolId) {
    const count = drum.strip.length;
    for (let step = 0; step < count; step++) {
      const index = table777SlotWrapIndex(drum.currentIndex - step, count);
      if (drum.strip[index].id === symbolId) return index;
    }
    return drum.currentIndex;
  }

  function initTable777SlotVisualState() {
    if (table777SlotVisualState.initialized) return;

    const reelStrips = TABLE777_SLOT_REEL_STRIP_IDS.map(strip =>
      strip.map(id => TABLE777_SLOT_SYMBOL_DEFS.find(symbol => symbol.id === id))
    );

    table777SlotVisualState.drums = reelStrips.map((strip, index) => ({
      strip,
      currentIndex: index % strip.length,
      targetIndex: index % strip.length,
      startPosition: index % strip.length,
      visualPosition: index % strip.length,
      advance: 0,
      elapsedMs: 0,
      durationMs: 0,
      lastTickIndex: index % strip.length,
      stopSfxPlayed: false
    }));

    table777SlotVisualState.initialized = true;
  }

  function resetTable777SlotVisualState() {
    window.RCPAudio?.stopSlotSpin?.();

    table777SlotVisualState.spinning = false;
    table777SlotVisualState.result = null;
    table777SlotVisualState.label = "";
    table777SlotVisualState.payout = 0;
    table777SlotVisualState.message = "";
    table777SlotVisualState.wasGuaranteed = false;
    table777SlotVisualState.flashTimerMs = 0;

    if (!table777SlotVisualState.initialized) {
      initTable777SlotVisualState();
      return;
    }

    for (let i = 0; i < table777SlotVisualState.drums.length; i++) {
      const drum = table777SlotVisualState.drums[i];
      const strip = drum.strip;
      const initialIndex = i % strip.length;

      drum.currentIndex = initialIndex;
      drum.targetIndex = initialIndex;
      drum.startPosition = initialIndex;
      drum.visualPosition = initialIndex;
      drum.advance = 0;
      drum.elapsedMs = 0;
      drum.durationMs = 0;
      drum.lastTickIndex = initialIndex;
      drum.stopSfxPlayed = false;
    }
  }

  function startTable777SlotVisualSpin(result, meta) {
    if (!isTable777()) return;

    initTable777SlotVisualState();

    const state = table777SlotVisualState;

    state.result = result.slice();
    state.label = meta?.label ?? "";
    state.payout = meta?.payout ?? 0;
    state.message = meta?.message ?? "";
    state.wasGuaranteed = !!meta?.wasGuaranteed;
    state.spinning = true;
    state.flashTimerMs = 0;

    for (let i = 0; i < TABLE777_SLOT_DRUM_COUNT; i++) {
      const drum = state.drums[i];
      const count = drum.strip.length;
      const targetIndex = findTable777SlotPrevSymbolIndex(drum, result[i]);
      const baseLoops = 2 + i;
      const diff = table777SlotBackwardDiff(drum.currentIndex, targetIndex, count);

      drum.targetIndex = targetIndex;
      drum.startPosition = drum.currentIndex;
      drum.visualPosition = drum.currentIndex;
      drum.advance = baseLoops * count + diff;
      drum.elapsedMs = 0;
      drum.durationMs = 840 + i * 160 + Math.random() * 60;
      drum.lastTickIndex = drum.currentIndex;
      drum.stopSfxPlayed = false;
    }

    window.RCPAudio?.startSlotSpin?.({
      muted: SFXmute
    });
  }

  function updateTable777SlotVisual(dtMs) {
    if (!isTable777()) return;

    const state = table777SlotVisualState;

    if (state.flashTimerMs > 0) {
      state.flashTimerMs = Math.max(0, state.flashTimerMs - dtMs);
    }

    if (!state.spinning) return;

    let allStopped = true;

    for (const drum of state.drums) {
      drum.elapsedMs += dtMs;
      const t = Math.min(1, drum.elapsedMs / drum.durationMs);
      drum.visualPosition = drum.startPosition - drum.advance * table777SlotEaseOutCubic(t);

      const tickIndex = table777SlotWrapIndex(Math.floor(drum.visualPosition), drum.strip.length);
      if (tickIndex !== drum.lastTickIndex) {
        drum.lastTickIndex = tickIndex;
      }

      if (t >= 1) {
        drum.currentIndex = drum.targetIndex;
        drum.visualPosition = drum.targetIndex;

        if (!drum.stopSfxPlayed) {
          drum.stopSfxPlayed = true;

          window.RCPAudio?.play?.("slotStop", {
            muted: SFXmute
          });
        }
      } else {
        allStopped = false;
      }
    }

    if (allStopped) {
      state.spinning = false;
      state.flashTimerMs = 360;

      window.RCPAudio?.stopSlotSpin?.();
    }
  }

  function cleanupTable777SlotSymbolSpriteObjectUrls() {
    const state = table777SlotSymbolSpriteState;
    if (Array.isArray(state.objectUrls)) {
      for (const url of state.objectUrls) {
        URL.revokeObjectURL(url);
      }
    }
    state.objectUrls = [];
  }

  function buildTable777SlotSymbolSpriteSlices(spriteCfg) {
    const cellW = spriteCfg?.cellW ?? 100;
    const cellH = spriteCfg?.cellH ?? 100;
    const order = Array.isArray(spriteCfg?.order) && spriteCfg.order.length > 0
      ? spriteCfg.order
      : ["seven", "bar", "bell", "kickback", "ballSave"];

    const slices = {};
    for (let i = 0; i < order.length; i++) {
      slices[order[i]] = {
        sy: i * cellH,
        w: cellW,
        h: cellH
      };
    }
    return slices;
  }

  function extractTable777SvgDefs(sourceSvgText) {
    const defsMatches = sourceSvgText.match(/<defs[\s\S]*?<\/defs>/gi);
    return defsMatches ? defsMatches.join("\n") : "";
  }

  function stripTable777SvgOuterAndDefs(sourceSvgText) {
    return sourceSvgText
      .replace(/<\?xml[^>]*>\s*/i, "")
      .replace(/<!DOCTYPE[^>]*>\s*/i, "")
      .replace(/<svg[^>]*>/i, "")
      .replace(/<\/svg>\s*$/i, "")
      .replace(/<defs[\s\S]*?<\/defs>/gi, "");
  }

  function createTable777SlotSymbolSvgText(sourceSvgText, slice) {
    const defs = extractTable777SvgDefs(sourceSvgText);
    const body = stripTable777SvgOuterAndDefs(sourceSvgText);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${slice.w}" height="${slice.h}" viewBox="0 ${slice.sy} ${slice.w} ${slice.h}">
  ${defs}
  ${body}
</svg>`;
  }

  function loadImageFromSvgText(svgText) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => resolve({ img, url });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load slot symbol svg"));
      };

      img.src = url;
    });
  }

  function ensureTable777SlotSymbolSpriteLoaded() {
    if (!isTable777()) return;

    const spriteCfg = TABLE?.slotVisual?.symbolSprite;
    if (!spriteCfg?.src) return;

    const state = table777SlotSymbolSpriteState;

    if (state.src === spriteCfg.src && (state.ready || state.loading || state.failed)) {
      return;
    }

    cleanupTable777SlotSymbolSpriteObjectUrls();

    state.src = spriteCfg.src;
    state.images = {};
    state.ready = false;
    state.loading = true;
    state.failed = false;

    fetch(spriteCfg.src)
      .then(response => {
        if (!response.ok) throw new Error("Failed to load slot symbol sprite");
        return response.text();
      })
      .then(svgText => {
        const slices = buildTable777SlotSymbolSpriteSlices(spriteCfg);
        return Promise.all(
          Object.entries(slices).map(([id, slice]) => {
            const symbolSvgText = createTable777SlotSymbolSvgText(svgText, slice);
            return loadImageFromSvgText(symbolSvgText).then(({ img, url }) => ({ id, img, url }));
          })
        );
      })
      .then(results => {
        const images = {};
        const urls = [];
        for (const item of results) {
          images[item.id] = item.img;
          urls.push(item.url);
        }
        state.images = images;
        state.objectUrls = urls;
        state.ready = true;
        state.loading = false;
        state.failed = false;
      })
      .catch(() => {
        cleanupTable777SlotSymbolSpriteObjectUrls();
        state.images = {};
        state.ready = false;
        state.loading = false;
        state.failed = true;
      });
  }

  let table777SlotSymbolDrawDebugCount = 0;

  function drawTable777SlotSymbolSprite(drawCtx, symbol, cx, cy, alpha = 1) {
    const state = table777SlotSymbolSpriteState;
    const img = state.images?.[symbol.id];

    if (!state.ready || !img) {
      return false;
    }

    if (SCORE_LOG_DEBUG && table777SlotSymbolDrawDebugCount < 5) {
      table777SlotSymbolDrawDebugCount++;
    }

    const size = TABLE?.slotVisual?.symbolSize ?? 96;

    drawCtx.save();
    drawCtx.globalAlpha = alpha;
    drawCtx.drawImage(
      img,
      cx - size / 2,
      cy - size / 2,
      size,
      size
    );
    drawCtx.restore();

    return true;
  }

  function drawTable777SlotRoundedRect(drawCtx, x, y, w, h, r) {
    drawCtx.beginPath();
    drawCtx.moveTo(x + r, y);
    drawCtx.arcTo(x + w, y, x + w, y + h, r);
    drawCtx.arcTo(x + w, y + h, x, y + h, r);
    drawCtx.arcTo(x, y + h, x, y, r);
    drawCtx.arcTo(x, y, x + r, y, r);
    drawCtx.closePath();
  }

  function drawTable777SlotSymbol(drawCtx, symbol, cx, cy, alpha = 1) {
    if (drawTable777SlotSymbolSprite(drawCtx, symbol, cx, cy, alpha)) {
      return;
    }

    drawCtx.save();
    drawCtx.globalAlpha = alpha;
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.fillStyle = symbol.color;

    if (symbol.id === "seven") {
      drawCtx.font = "900 100px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      drawCtx.fillText("7", cx, cy + 7);
    } else if (symbol.id === "bar") {
      drawCtx.font = "900 48px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      drawCtx.fillText("BAR", cx, cy + 4);
    } else if (symbol.id === "bell") {
      drawCtx.font = "900 42px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      drawCtx.fillText("BELL", cx, cy + 4);
    } else if (symbol.id === "kickback") {
      drawCtx.font = "900 28px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      drawCtx.fillText("KICK", cx, cy - 12);
      drawCtx.fillText("BACK", cx, cy + 20);
    } else if (symbol.id === "ballSave") {
      drawCtx.font = "900 28px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      drawCtx.fillText("BALL", cx, cy - 12);
      drawCtx.fillText("SAVE", cx, cy + 20);
    }

    drawCtx.restore();
  }

  function drawTable777SlotDrumCellDivider(drawCtx, x, topY, width, alpha, dividerColor) {
    const inset = 15.5;

    drawCtx.save();
    drawCtx.globalAlpha = alpha;
    drawCtx.strokeStyle = dividerColor;
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.moveTo(x + inset, topY + 0.5);
    drawCtx.lineTo(x + width - inset, topY + 0.5);
    drawCtx.stroke();
    drawCtx.restore();
  }

  function drawTable777SlotDrum(drawCtx, drum, drumIndex, dividerColor) {
    const x = drumIndex * TABLE777_SLOT_DRUM_W;
    const centerX = x + TABLE777_SLOT_DRUM_W / 2;
    const centerY = TABLE777_SLOT_VISUAL_H / 2;
    const count = drum.strip.length;
    const pos = ((drum.visualPosition % count) + count) % count;
    const baseIndex = Math.floor(pos);
    const frac = pos - baseIndex;

    for (let row = -1; row <= 1; row++) {
      const symbolIndex = table777SlotWrapIndex(baseIndex + row, count);
      const symbol = drum.strip[symbolIndex];
      const cy = centerY + (row - frac) * TABLE777_SLOT_SYMBOL_H;
      const distance = Math.abs(cy - centerY) / TABLE777_SLOT_SYMBOL_H;
      const alpha = Math.max(0.30, 1 - distance * 0.55);
      const cellTop = cy - TABLE777_SLOT_SYMBOL_H / 2;
      const cellBottom = cy + TABLE777_SLOT_SYMBOL_H / 2;

      drawTable777SlotDrumCellDivider(drawCtx, x, cellTop, TABLE777_SLOT_DRUM_W, alpha * 0.9, dividerColor);
      drawTable777SlotDrumCellDivider(drawCtx, x, cellBottom, TABLE777_SLOT_DRUM_W, alpha * 0.9, dividerColor);
      drawTable777SlotSymbol(drawCtx, symbol, centerX, cy, alpha);
    }
  }

  function drawTable777SlotBackFrame(drawCtx, cfg) {
    drawCtx.fillStyle = cfg.backColor ?? "#111";
    drawCtx.fillRect(0, 0, TABLE777_SLOT_VISUAL_W, TABLE777_SLOT_VISUAL_H);

    drawCtx.fillStyle = cfg.panelColor ?? "#222";
    drawTable777SlotRoundedRect(drawCtx, 2, 2, TABLE777_SLOT_VISUAL_W - 4, TABLE777_SLOT_VISUAL_H - 4, 14);
    drawCtx.fill();
  }

  function drawTable777SlotFrontFrame(drawCtx, cfg) {
    const dividerColor = cfg.dividerColor ?? "#444";
    const frameColor = table777SlotVisualState.flashTimerMs > 0
      ? (cfg.flashColor ?? "#fff")
      : (cfg.frameColor ?? "#f7f7f7");
    const frameWidth = table777SlotVisualState.flashTimerMs > 0 ? 5 : 4;

    drawCtx.strokeStyle = dividerColor;
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.moveTo(TABLE777_SLOT_DRUM_W, 8);
    drawCtx.lineTo(TABLE777_SLOT_DRUM_W, TABLE777_SLOT_VISUAL_H - 8);
    drawCtx.moveTo(TABLE777_SLOT_DRUM_W * 2, 8);
    drawCtx.lineTo(TABLE777_SLOT_DRUM_W * 2, TABLE777_SLOT_VISUAL_H - 8);
    drawCtx.stroke();

    drawCtx.strokeStyle = frameColor;
    drawCtx.lineWidth = frameWidth;
    drawTable777SlotRoundedRect(drawCtx, 2, 2, TABLE777_SLOT_VISUAL_W - 4, TABLE777_SLOT_VISUAL_H - 4, 14);
    drawCtx.stroke();
  }

  function drawTable777SlotVisual(drawCtx) {
    if (!isTable777()) return;

    const cfg = TABLE?.slotVisual;
    if (!cfg) return;

    initTable777SlotVisualState();
    ensureTable777SlotSymbolSpriteLoaded();

    const dividerColor = cfg.dividerColor ?? "#444";

    drawCtx.save();
    drawCtx.translate(cfg.x, cfg.y);
    drawCtx.scale(cfg.scale ?? 1, cfg.scale ?? 1);

    drawTable777SlotBackFrame(drawCtx, cfg);

    drawCtx.save();
    drawTable777SlotRoundedRect(drawCtx, 4, 4, TABLE777_SLOT_VISUAL_W - 8, TABLE777_SLOT_VISUAL_H - 8, 11);
    drawCtx.clip();

    for (let i = 0; i < TABLE777_SLOT_DRUM_COUNT; i++) {
      drawTable777SlotDrum(drawCtx, table777SlotVisualState.drums[i], i, dividerColor);
    }

    drawCtx.restore();
    drawTable777SlotFrontFrame(drawCtx, cfg);
    drawCtx.restore();
  }

  function countTable777SlotSymbols(result, symbolId) {
    if (!Array.isArray(result)) return 0;
    return result.filter(symbol => symbol === symbolId).length;
  }

  function activateTable777SlotKickbacks(symbolCount = 1) {
    let activated = false;
    const durationMs = TABLE777_SLOT_FEATURE_DURATION_MS * Math.max(1, symbolCount);

    for (let i = 0; i < kickbacks.length; i++) {
      const kb = kickbacks[i];
      kb.active = true;
      kb.timerMs = durationMs;
      kb.flash = 8;
      activated = true;
    }

    return activated;
  }

  function activateTable777SlotBallSaves(symbolCount = 1) {
    let activated = false;
    const durationMs = TABLE777_SLOT_FEATURE_DURATION_MS * Math.max(1, symbolCount);

    for (let i = 0; i < ballSaves.length; i++) {
      const bs = ballSaves[i];
      bs.active = true;
      bs.timerMs = durationMs;
      bs.flash = 8;
      activated = true;
    }

    return activated;
  }

  function spinTable777Slot() {
    if (!isTable777()) return null;

    const wasGuaranteed = ruleState.guaranteedRoleReady;
    const result = chooseTable777SlotResult();
    const payout = getTable777SlotPayout(result);

    const kickbackCount = countTable777SlotSymbols(result, "kickback");
    const ballSaveCount = countTable777SlotSymbols(result, "ballSave");

    const hasKickback = kickbackCount > 0;
    const hasBallSave = ballSaveCount > 0;

    const message = getTable777SlotResultMessage({
      result,
      payout,
      kickbackCount,
      ballSaveCount
    });

    if (SCORE_LOG_DEBUG) {
      console.log("[table777 slot]", {
        result,
        label: getTable777SlotResultLabel(result),
        payout,
        slotLevel: ruleState.slotLevel,
        wasGuaranteed
      });
    }

    startTable777SlotVisualSpin(result, {
      label: getTable777SlotResultLabel(result),
      payout,
      message,
      wasGuaranteed
    });

    return {
      result,
      payout,
      message,
      label: getTable777SlotResultLabel(result),
      hasKickback,
      hasBallSave,
      kickbackCount,
      ballSaveCount
    };
  }

  function awardTable777LoopTriggerComplete() {
    cancelLoopBonusForScoringTrigger("table777Loop");
    addScore(ruleState.loopValue, "table777 loop value");

    window.RCPAudio?.play?.("orbit", {
      muted: SFXmute
    });

    const prevSlotLevel = ruleState.slotLevel;
    ruleState.loopCount += 1;
    ruleState.slotLevel = getTable777SlotLevel(ruleState.loopCount);

    const slotLevelIncreased = ruleState.slotLevel > prevSlotLevel;

    if (slotLevelIncreased) {
      addScore(
        TABLE777_SLOT_LEVEL_UP_SCORES[ruleState.slotLevel] ?? 0,
        "table777 slot level up"
      );

      window.RCPAudio?.playMelody?.("levelUp", {
        muted: SFXmute
      });
    }

    if (ruleState.slotLevel === 1 && prevSlotLevel < 1) {
      showDisplayMessage("SLOT LEVEL UP", 90);
    } else if (ruleState.slotLevel === 2 && prevSlotLevel < 2) {
      showDisplayMessage("SLOT LEVEL MAX", 90);
    }
  }

  function handleTable777LoopTriggerEnter(trigger) {
    const state = table777LoopTriggerPairState;
    const timeoutMs = TABLE?.loopTriggerPair?.timeoutMs ?? TABLE777_LOOP_TRIGGER_TIMEOUT_MS;

    if (
      state.firstTriggerId &&
      state.firstTriggerId !== trigger.id &&
      state.timerMs > 0
    ) {
      awardTable777LoopTriggerComplete();
      resetTable777LoopTriggerPairState();
      return;
    }

    state.firstTriggerId = trigger.id;
    state.timerMs = timeoutMs;
  }

  function checkTable777LoopTrigger(b, trigger) {
    if (!isTable777()) return;

    const dx = b.x - trigger.x;
    const dy = b.y - trigger.y;
    const radius = trigger.r ?? 20;
    const inside = dx * dx + dy * dy <= radius * radius;

    if (trigger.passCooldown > 0) {
      trigger.wasInside = inside;
      return;
    }

    if (inside && !trigger.wasInside) {
      handleTable777LoopTriggerEnter(trigger);
      trigger.passCooldown = trigger.cooldownFrames ?? ORBIT_LANE_TRIGGER_COOLDOWN_FRAMES;
    }

    trigger.wasInside = inside;
  }

  function handleSaucerEnter(saucer, isReady) {
    if (isTable777() && saucer.onEnter === "table777Slot") {
      const saucerPoints = ruleState.saucerValue;
      addScore(saucerPoints, "table777 saucer value");

      const slot = spinTable777Slot();

      queueTable777SlotReward(slot, 1200);
    }

    if (!isReady) {
      const unreadyScore = Math.max(0, Math.floor(saucer.unreadyScore || 0));
      addScore(unreadyScore, "unready saucer");

      if (TABLE?.id === "table4") {
        window.RCPAudio?.playMelody?.("inactive", {
          muted: SFXmute
        });
      }
      return;
    }

    const multiplier = saucer.bonusCollectMultiplier;
    if (!Number.isFinite(multiplier) || multiplier <= 0) return;

    const levels = getSaucerBonusLevels();
    const level = getSaucerBonusLevel(saucer);
    if (levels.length > 0 && !level) return;

    const bonusPoints = level
      ? Math.round(level.baseScore * getBonusPowerMultiplier() * multiplier)
      : Math.max(0, ruleState.bonusValue) * multiplier;

    if (bonusPoints > 0) {
      addScore(bonusPoints, "saucer bonus collect");
    }

    showDisplayMessage("BONUS " + bonusPoints, 90);

    if (TABLE?.id === "table4" && level) {
      const lowerMelodyIds = {
        1: "slotBar",
        2: "slotBell",
        3: "slot777"
      };
      const upperMelodyIds = {
        1: "upperSlotBar",
        2: "upperSlotBell",
        3: "upperSlot777"
      };
      const melodyIds = saucer.id === "upper_saucer"
        ? upperMelodyIds
        : lowerMelodyIds;
      const melodyId = melodyIds[level.level];

      if (melodyId) {
        window.RCPAudio?.playMelody?.(melodyId, {
          muted: SFXmute
        });
      }
    } else {
      window.RCPAudio?.play?.("featureConsumed", {
        muted: SFXmute
      });
    }

    if (saucer.requiredDropTargetGroup) {
      resetDropTargetGroup(saucer.requiredDropTargetGroup);
    }
  }

  function captureSaucer(b, saucer) {
    const isReady = isSaucerReady(saucer);

    saucerHoldState.active = true;
    saucerHoldState.saucer = saucer;
    saucerHoldState.timerMs = isReady
      ? (saucer.holdMs ?? 1200)
      : (saucer.unreadyHoldMs ?? 0);

    b.x = saucer.x;
    b.y = saucer.y;
    b.vx = 0;
    b.vy = 0;

    saucer.flash = 10;

    handleSaucerEnter(saucer, isReady);
  }

  function checkSaucerEnter(b, saucer) {
    if (saucerHoldState.active) return;

    const dx = b.x - saucer.x;
    const dy = b.y - saucer.y;
    const radius = saucer.r ?? 30;
    const inside = dx * dx + dy * dy <= radius * radius;

    if (inside && !saucer.wasInside) {
      captureSaucer(b, saucer);
    }

    saucer.wasInside = inside;
  }

  function updateSaucerHold(dtMs) {
    if (!saucerHoldState.active) return;

    const saucer = saucerHoldState.saucer;
    if (!saucer) {
      resetSaucerHoldState();
      return;
    }

    ball.x = saucer.x;
    ball.y = saucer.y;
    ball.vx = 0;
    ball.vy = 0;

    saucerHoldState.timerMs -= dtMs;

    if (saucerHoldState.timerMs > 0) return;

    ball.x = saucer.x;
    ball.y = saucer.y;
    const releaseVx = saucer.releaseVx ?? 0;
    ball.vx = saucer.releaseRandomDirection && releaseVx !== 0
      ? (Math.random() < 0.5 ? -1 : 1) * Math.abs(releaseVx)
      : releaseVx;
    ball.vy = saucer.releaseVy ?? 0;

    saucer.wasInside = true;
    saucerHoldState.active = false;
    saucerHoldState.saucer = null;
    saucerHoldState.timerMs = 0;
  }

  function getLoopRouteSequences(cfg) {
    const triggers = cfg?.triggers;
    if (!Array.isArray(triggers) || triggers.length < 2) return [];

    if (Array.isArray(cfg.sequences) && cfg.sequences.length > 0) {
      return cfg.sequences.filter(seq =>
        Array.isArray(seq) &&
        seq.length >= 2 &&
        seq.every(index => Number.isInteger(index) && index >= 0 && index < triggers.length)
      );
    }

    return [triggers.map((_, index) => index)];
  }

  function checkLoopRouteTrigger(b) {
    const cfg = TABLE?.loopRoute;
    const triggers = cfg?.triggers;

    if (!Array.isArray(triggers) || triggers.length < 2) return;

    while (loopRouteState.triggerWasInside.length < triggers.length) {
      loopRouteState.triggerWasInside.push(false);
    }

    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      const dx = b.x - trigger.x;
      const dy = b.y - trigger.y;
      const r = trigger.r ?? 30;
      const inside = dx * dx + dy * dy <= r * r;
      const entered = inside && !loopRouteState.triggerWasInside[i];

      if (entered) {
        handleLoopRouteTriggerEnter(i);
      }

      loopRouteState.triggerWasInside[i] = inside;
    }
  }

  function handleLoopRouteTriggerEnter(triggerIndex) {
    const cfg = TABLE?.loopRoute;
    if (!cfg) return;

    const sequences = getLoopRouteSequences(cfg);
    if (!sequences.length) return;

    if (!loopRouteState.active) {
      const sequence = sequences.find(seq => seq[0] === triggerIndex);
      if (!sequence) return;

      loopRouteState.active = true;
      loopRouteState.sequence = sequence;
      loopRouteState.stepIndex = 1;
      loopRouteState.timerMs = cfg.timeoutMs ?? 1300;
      return;
    }

    const sequence = loopRouteState.sequence;
    if (!Array.isArray(sequence)) {
      resetLoopRouteState();
      return;
    }

    if (triggerIndex !== sequence[loopRouteState.stepIndex]) {
      resetLoopRouteState();
      return;
    }

    loopRouteState.stepIndex++;

    if (loopRouteState.stepIndex >= sequence.length) {
      awardLoopRouteBonus();
      resetLoopRouteState();
    }
  }

  function awardLoopRouteBonus() {
    const points = TABLE?.loopRoute?.score ?? 100;
    addScore(points, "loop route");

    window.RCPAudio?.play?.("orbit", {
      muted: SFXmute
    });

    showDisplayMessage("LOOP BONUS " + points, 90);
  }

  function updateLoopRouteTimer(dtMs) {
    if (!loopRouteState.active) return;

    loopRouteState.timerMs -= dtMs;

    if (loopRouteState.timerMs <= 0) {
      resetLoopRouteState();
    }
  }

  function playSpinnerPulseSfx(spinner) {
    if (SFXmute) return;
    if (!spinner?.sfxStepQueue?.length) return;

    const step = spinner.sfxStepQueue.shift();
    window.RCPAudio?.playSpinnerStep?.(step, { muted: SFXmute });
  }

  function getSpinnerSpinAmount(b) {
    const speed = Math.hypot(b.vx || 0, b.vy || 0);
    if (speed >= 32) return 6;
    if (speed >= 26) return 5;
    if (speed >= 20) return 4;
    if (speed >= 14) return 3;
    if (speed >= 8) return 2;
    return 1;
  }

  function checkSpinnerPass(b, spinner) {
    const rect = spinner.rect;
    if (!rect) return;

    const pad = BALL_RADIUS * 0.5;
    const minX = rect.x - pad;
    const maxX = rect.x + rect.w + pad;
    const minY = rect.y - pad;
    const maxY = rect.y + rect.h + pad;

    const inside = b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY;

    if (inside && !spinner.wasInside) {
      const spins = getSpinnerSpinAmount(b);
      spinner.spinCount += spins;
      spinner.pendingScoreSpins += spins;
      spinner.pulseRemaining += spins * 2;
      spinner.pulseTimer = 0;
      spinner.pulseOn = false;
      spinner.sfxStepQueue = window.RCPAudio?.getSpinnerSfxStepsForSpinCount?.(spins) ?? [];
      handleLoopSpinnerPass(spinner.id);
    }

    spinner.wasInside = inside;
  }

  function updateSpinnerPulse(spinner) {
    if (spinner.pulseRemaining <= 0) {
      spinner.pulseOn = false;
      spinner.pulseTimer = 0;
      return;
    }

    spinner.pulseTimer++;
    if (spinner.pulseTimer < SPINNER_PULSE_FRAMES) return;

    spinner.pulseTimer = 0;
    spinner.pulseOn = !spinner.pulseOn;
    spinner.pulseRemaining--;

    if (spinner.pulseOn) {
      if (spinner.pendingScoreSpins > 0) {
        spinner.pendingScoreSpins--;
        playSpinnerPulseSfx(spinner);
        awardSpinnerSpin();
      }
    }

    if (spinner.pulseRemaining <= 0) {
      spinner.pulseOn = false;
    }
  }

  function collideSlingBody(b, sling) {
    if (sling.bodyCollisionSegments && sling.bodyCollisionSegments.length) {
      for (let i = 0; i < sling.bodyCollisionSegments.length; i++) {
        const seg = sling.bodyCollisionSegments[i];
        if (!seg.bounds || isBallNearBounds(b, seg.bounds)) {
          collideSegment(b, seg.x1, seg.y1, seg.x2, seg.y2, seg.r, false, 0, 0, 0);
        }
      }
      return;
    }

    const body = sling.body;
    if (!body || body.length < 3) return;

    for (let i = 0; i < body.length; i++) {
      if (i === 2) continue;
      const a = body[i];
      const c = body[(i + 1) % body.length];
      collideSegment(b, a.x, a.y, c.x, c.y, sling.bodyCollisionR, false, 0, 0, 0);
    }
  }

  function collideSlingshot(b, sling) {
    const edge = sling.activeSegment;
    const x1 = edge.x1;
    const y1 = edge.y1;
    const x2 = edge.x2;
    const y2 = edge.y2;
    const r = edge.hitWidth;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    if (len2 <= 0) return;

    const rawT = ((b.x - x1) * dx + (b.y - y1) * dy) / len2;
    const t = Math.max(0, Math.min(1, rawT));
    const px = x1 + t * dx;
    const py = y1 + t * dy;

    const dist2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
    const totalR = BALL_RADIUS + r;
    if (dist2 >= totalR * totalR) return;

    const dist = Math.sqrt(dist2);
    if (dist === 0) return;
    notifyTableModeNonEnemyCollision();

    const pushNx = (b.x - px) / dist;
    const pushNy = (b.y - py) / dist;

    const depth = totalR - dist;
    b.x += pushNx * depth;
    b.y += pushNy * depth;

    const sideX = b.x - px;
    const sideY = b.y - py;
    const sideDot = sideX * edge.nx + sideY * edge.ny;
    if (sideDot <= 0) return;

    const approach = b.vx * edge.nx + b.vy * edge.ny;
    if (approach >= 0) return;

    const nx = edge.nx;
    const ny = edge.ny;
    const dot = b.vx * nx + b.vy * ny;
    if (dot < 0) {
      const restitution = 0.65;
      b.vx -= (1 + restitution) * dot * nx;
      b.vy -= (1 + restitution) * dot * ny;
      b.vx += sling.powerX;
      b.vy += sling.powerY;

      window.RCPAudio?.play?.("slingshot", {
        muted: SFXmute
      });

      cancelLoopBonusForScoringTrigger("slingshot");
      cancelTable777OrbitBonus();
      addScore(sling.score, "slingshot");
      sling.flash = 6;
    }
  }

  function pinballFixedUpdate(dt) {
    updateSecondChance(dt * 1000);
    tableModeRuntime?.update?.(dt * 1000);

    if (isTable777()) {
      const dtMs = dt * 1000;
      updateTable777SlotVisual(dtMs);
      updateTable777PendingSlotReward(dtMs);
    }

    const tick = dt * 60;
    const h = tick / SUBSTEPS;

    if (!ballInPlay) {
      for (const flipper of flippers) flipper.update(tick);
      return;
    }

    const wasHoldingSaucer = saucerHoldState.active;
    if (wasHoldingSaucer) {
      for (const flipper of flippers) flipper.update(tick);
      updateSaucerHold(dt * 1000);
    }

    for (let s = 0; !wasHoldingSaucer && !saucerHoldState.active && s < SUBSTEPS; s++) {
      ball.vy += GRAVITY * h;
      let speed = Math.hypot(ball.vx, ball.vy);
      if (speed > MAX_SPEED) {
        ball.vx = (ball.vx / speed) * MAX_SPEED;
        ball.vy = (ball.vy / speed) * MAX_SPEED;
      }
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      for (const flipper of flippers) flipper.update(h);
      for (let w = 0; w < walls.length; w++) {
        const wall = walls[w];
        if (!wall.bounds || isBallNearBounds(ball, wall.bounds)) {
          collideSegment(ball, wall.x1, wall.y1, wall.x2, wall.y2, wall.r, false, 0, 0, 0, wall.restitution);
        }
      }
      for (let wbi = 0; wbi < wallBumps.length; wbi++) {
        const wb = wallBumps[wbi];
        let hit = false;

        for (let si = 0; si < wb.segments.length; si++) {
          const seg = wb.segments[si];
          if (!seg.bounds || isBallNearBounds(ball, seg.bounds)) {
            if (collideSegment(ball, seg.x1, seg.y1, seg.x2, seg.y2, seg.r, false, 0, 0, 0)) {
              hit = true;
            }
          }
        }

        if (hit && wb.hitCooldown <= 0) {
          awardWallBump(wb);
        }
      }
      for (let dw = 0; dw < drainWalls.length; dw++) {
        const drainWall = drainWalls[dw];
        for (let si = 0; si < drainWall.collisionSegments.length; si++) {
          const seg = drainWall.collisionSegments[si];
          if (!seg.bounds || isBallNearBounds(ball, seg.bounds)) {
            collideSegment(ball, seg.x1, seg.y1, seg.x2, seg.y2, seg.r, false, 0, 0, 0);
          }
        }
      }
      for (let oi = 0; oi < orbitCollisionSegments.length; oi++) {
        const wall = orbitCollisionSegments[oi];
        if (!wall.bounds || isBallNearBounds(ball, wall.bounds)) {
          collideSegment(ball, wall.x1, wall.y1, wall.x2, wall.y2, wall.r, false, 0, 0, 0);
        }
      }
      for (let owi = 0; owi < oneWayWallCollisionSegments.length; owi++) {
        const seg = oneWayWallCollisionSegments[owi];
        if (!seg.bounds || isBallNearBounds(ball, seg.bounds)) {
          collideOneWaySegment(ball, seg);
        }
      }
      for (let di = 0; di < topLaneDividers.length; di++) {
        const d = topLaneDividers[di];
        if (!d.bounds || isBallNearBounds(ball, d.bounds)) {
          collideSegment(ball, d.x1, d.y1, d.x2, d.y2, d.r, false, 0, 0, 0);
        }
      }
      for (let li = 0; li < topLanes.length; li++) {
        checkTopLanePass(ball, topLanes[li]);
      }
      for (let oi = 0; oi < orbitLaneTriggers.length; oi++) {
        checkOrbitLaneTrigger(ball, orbitLaneTriggers[oi]);
      }
      for (let li = 0; li < loopTriggers.length; li++) {
        checkTable777LoopTrigger(ball, loopTriggers[li]);
      }
      checkTable777OrbitBonusTriggers(ball);
      for (let si = 0; si < saucers.length; si++) {
        checkSaucerEnter(ball, saucers[si]);
      }
      if (saucerHoldState.active) break;
      checkLoopRouteTrigger(ball);
      checkLoopCenterPass(ball);
      checkOrbitSoundTrigger(ball);
      for (let spi = 0; spi < spinners.length; spi++) {
        checkSpinnerPass(ball, spinners[spi]);
      }
      for (let tbi = 0; tbi < timedBlockers.length; tbi++) {
        const blocker = timedBlockers[tbi];
        if (blocker.open) continue;
        if (!blocker.bounds || isBallNearBounds(ball, blocker.bounds)) {
          collideSegment(
            ball,
            blocker.x1,
            blocker.y1,
            blocker.x2,
            blocker.y2,
            blocker.r ?? 5,
            false,
            0,
            0,
            0
          );
        }
      }
      for (let ti = 0; ti < targets.length; ti++) {
        const target = targets[ti];

        if (target.wall) {
          if (!target.wall.bounds || isBallNearBounds(ball, target.wall.bounds)) {
            collideSegment(
              ball,
              target.wall.x1,
              target.wall.y1,
              target.wall.x2,
              target.wall.y2,
              target.wall.r,
              false,
              0,
              0,
              0
            );
          }
        }
        if (target.wallBottom) {
          if (!target.wallBottom.bounds || isBallNearBounds(ball, target.wallBottom.bounds)) {
            collideSegment(
              ball,
              target.wallBottom.x1,
              target.wallBottom.y1,
              target.wallBottom.x2,
              target.wallBottom.y2,
              target.wallBottom.r,
              false,
              0,
              0,
              0
            );
          }
        }

        if (!target.bounds || isBallNearBounds(ball, target.bounds)) {
          collideTarget(ball, target);
        }
      }
      for (let di = 0; di < dropTargets.length; di++) {
        const dropTarget = dropTargets[di];
        if (!dropTarget.bounds || isBallNearBounds(ball, dropTarget.bounds)) {
          collideDropTarget(ball, dropTarget);
        }
      }
      for (let bi = 0; bi < bumpers.length; bi++) {
        const bumper = bumpers[bi];
        if (!bumper.bounds || isBallNearBounds(ball, bumper.bounds)) {
          collideBumper(ball, bumper);
        }
      }
      for (let si = 0; si < slingshots.length; si++) {
        const sling = slingshots[si];

        if (!sling.activeSegment?.bounds || isBallNearBounds(ball, sling.activeSegment.bounds)) {
          collideSlingshot(ball, sling);
        }

        collideSlingBody(ball, sling);
      }
      for (let pi = 0; pi < posts.length; pi++) {
        const post = posts[pi];
        if (!post.bounds || isBallNearBounds(ball, post.bounds)) {
          collidePost(ball, post);
        }
      }
      tableModeRuntime?.fixedUpdate?.(h);
      if (shotMapState.skipFlipperCollisionSubsteps > 0) {
        shotMapState.skipFlipperCollisionSubsteps--;
      } else {
        for (const flipper of flippers) {
          const p2 = flipper.getP2();
          collideSegment(
            ball,
            flipper.x,
            flipper.y,
            p2.x,
            p2.y,
            flipper.thickness,
            true,
            flipper.currentOmega,
            flipper.x,
            flipper.y
          );
        }
      }
      checkKickbackSensors(ball);
      checkBallSaveSensors(ball);
    }
    for (let bi = 0; bi < bumpers.length; bi++) {
      const bu = bumpers[bi];
      if (bu.flash > 0) bu.flash--;
    }
    for (let si = 0; si < slingshots.length; si++) {
      const sling = slingshots[si];
      if (sling.flash > 0) sling.flash--;
    }
    for (let ti = 0; ti < targets.length; ti++) {
      const target = targets[ti];
      if (target.flash > 0) target.flash--;
      if (target.hitCooldown > 0) target.hitCooldown--;
    }
    for (let di = 0; di < dropTargets.length; di++) {
      const dropTarget = dropTargets[di];
      if (dropTarget.flash > 0) dropTarget.flash--;
      if (dropTarget.hitCooldown > 0) dropTarget.hitCooldown--;
    }
    const dtMs = dt * 1000;
    updateTimedBlockers(dtMs);
    updateCenterValueDoubler(dtMs);
    updateLoopBonusTimer(dtMs);
    updateLoopRouteTimer(dtMs);
    updateTable777LoopTriggerPairState(dtMs);
    updateTable777OrbitBonusState(dtMs);
    updateOrbitSoundCooldown(dtMs);
    if (ruleState.orbitBoostActive) {
      ruleState.orbitBoostTimerMs -= dtMs;

      if (ruleState.orbitBoostTimerMs <= 0) {
        ruleState.orbitBoostTimerMs = 0;
        ruleState.orbitBoostActive = false;
        window.RCPAudio?.stopBoostedMelody?.();
      }
    }
    updateDropTargetGroupResetTimers(dtMs);
    updateKickbacks(dtMs);
    updateBallSaves(dtMs);
    if (nudgeCooldownMs > 0) {
      nudgeCooldownMs -= dtMs;
      if (nudgeCooldownMs < 0) nudgeCooldownMs = 0;
    }
    for (let wbi = 0; wbi < wallBumps.length; wbi++) {
      const wb = wallBumps[wbi];
      if (wb.flash > 0) wb.flash--;
      if (wb.hitCooldown > 0) wb.hitCooldown--;
    }
    for (let pi = 0; pi < posts.length; pi++) {
      if (posts[pi].sfxCooldown > 0) posts[pi].sfxCooldown--;
    }
    for (let li = 0; li < topLanes.length; li++) {
      const lane = topLanes[li];
      if (lane.flash > 0) lane.flash--;
      if (lane.passCooldown > 0) lane.passCooldown--;
    }
    for (let oi = 0; oi < orbitLaneTriggers.length; oi++) {
      const trigger = orbitLaneTriggers[oi];
      if (trigger.passCooldown > 0) trigger.passCooldown--;
    }
    for (let li = 0; li < loopTriggers.length; li++) {
      const trigger = loopTriggers[li];
      if (trigger.passCooldown > 0) trigger.passCooldown--;
    }
    for (let si = 0; si < saucers.length; si++) {
      if (saucers[si].flash > 0) saucers[si].flash--;
    }
    for (let spi = 0; spi < spinners.length; spi++) {
      updateSpinnerPulse(spinners[spi]);
    }
    if (ball.y > CANVAS_H + 50) {
      const handledByTableMode = tableModeRuntime?.handleOutHole?.() === true;
      if (!handledByTableMode) handleBallLost();
    }
  }

  function isBallRollAudioActive() {
    if (!ballInPlay) return false;
    if (waitingForLaunch) return false;
    if (stuckRelaunchAvailable) return false;
    if (paused) return false;
    if (titleState.active) return false;
    if (gameState.status !== "playing") return false;
    if (ball.y > CANVAS_H + 50) return false;
    return true;
  }

  function updateBallRollAudio(dt) {
    const speed = Math.hypot(ball.vx || 0, ball.vy || 0);
    const speedRatio = Math.min(1, speed / BALL_ROLL_AUDIO_MAX_SPEED);
    const active = isBallRollAudioActive();

    if (BALL_ROLL_AUDIO_DEBUG) {
      console.log("[ballRoll]", { speed, speedRatio, active });
    }

    window.RCPAudio?.updateBallRoll?.({
      dt,
      speed,
      speedRatio,
      active,
      muted: SFXmute
    });
  }

  function syncFlipperInput(input) {
    const leftUp = !!(input && input.leftFlipper);
    const rightUp = !!(input && input.rightFlipper);

    let playLeftSfx = false;
    let playRightSfx = false;

    for (const flipper of flippers) {
      const isUp = flipper.isLeft ? leftUp : rightUp;
      if (isUp && !flipper.isUp) {
        tryFireMappedFlipperShot(flipper);
        if (flipper.isLeft) playLeftSfx = true;
        else playRightSfx = true;
      }
      flipper.isUp = isUp;
    }

    if (playLeftSfx) window.RCPAudio?.play?.("flipper", { muted: SFXmute });
    if (playRightSfx) window.RCPAudio?.play?.("flipper", { muted: SFXmute });
  }

  function tryNudge() {
    if (!ballInPlay || waitingForLaunch || paused) return;
    if (nudgeCooldownMs > 0) return;
    if (ball.y < NUDGE_MIN_Y) return;

    ball.vy += NUDGE_POWER_Y;
    nudgeCooldownMs = NUDGE_COOLDOWN_MS;
    nudgeCountThisGame++;

    window.RCPAudio?.play?.("nudge", { muted: SFXmute });
  }

  function drawBumperBase(drawCtx, bu, flashing) {
    const visualR = bu.visualR ?? bu.r;
    drawCtx.beginPath();
    drawCtx.arc(bu.x, bu.y, visualR * 0.92, 0, Math.PI * 2);
    drawCtx.fillStyle = flashing ? getBumperFlashFill() : COLORS.black;
    drawCtx.fill();
  }

  function drawBumperOverlay(drawCtx, bu, flashing) {
    const visualR = bu.visualR ?? bu.r;
    drawCtx.beginPath();
    drawCtx.arc(bu.x, bu.y, visualR * 0.52, 0, Math.PI * 2);
    drawCtx.fillStyle = COLORS.white;
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(bu.x, bu.y, visualR, 0, Math.PI * 2);
    drawCtx.lineWidth = 4;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.stroke();
  }

  function drawTopLaneDivider(drawCtx, divider) {
    drawCtx.beginPath();
    drawCtx.moveTo(divider.x1, divider.y1);
    drawCtx.lineTo(divider.x2, divider.y2);
    drawCtx.lineWidth = divider.r * 2;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.stroke();
  }

  function drawTopLane(drawCtx, lane) {
    if (!lane.indicator) return;

    const flashing = lane.flash > 0;

    drawCtx.beginPath();
    drawCtx.arc(lane.indicator.x, lane.indicator.y, lane.indicator.r, 0, Math.PI * 2);

    if (flashing) {
      drawCtx.fillStyle = getTableColor("scoreFlash", "scoreFlash");
      drawCtx.fill();
      return;
    }

    if (lane.lit) {
      drawCtx.fillStyle = COLORS.white;
      drawCtx.fill();
    } else {
      drawCtx.lineWidth = 2;
      drawCtx.strokeStyle = "#333";
      drawCtx.stroke();
    }
  }

  function drawOrbitVisual(drawCtx) {
    if (!TABLE?.orbit || !orbitVisualPaths.length) return;
    drawCtx.save();
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.lineWidth = TABLE.orbit.draw?.lineWidth ?? 2;
    for (const p of orbitVisualPaths) {
      drawCtx.stroke(p);
    }
    drawCtx.restore();
  }

  const INDICATOR_SHAPES = {
    triangle3: {
      w: 125.4,
      h: 42,
      polygons: [
        [
          { x: 24.2, y: 0 },
          { x: 48.4, y: 42 },
          { x: 0, y: 42 }
        ],
        [
          { x: 62.2, y: 42 },
          { x: 38, y: 0 },
          { x: 86.4, y: 0 }
        ],
        [
          { x: 101.2, y: 0 },
          { x: 125.4, y: 42 },
          { x: 77, y: 42 }
        ]
      ]
    },
    indicator7: {
      w: 103.4,
      h: 45,
      polygons: [
        [
          { x: 0, y: 0 },
          { x: 23.1, y: 0 },
          { x: 11.5, y: 20 }
        ],
        [
          { x: 43, y: 20 },
          { x: 19.9, y: 20 },
          { x: 31.5, y: 0 }
        ],
        [
          { x: 40.3, y: 0 },
          { x: 63.4, y: 0 },
          { x: 51.9, y: 20 }
        ],
        [
          { x: 83, y: 20 },
          { x: 59.9, y: 20 },
          { x: 71.5, y: 0 }
        ],
        [
          { x: 80.3, y: 0 },
          { x: 103.4, y: 0 },
          { x: 91.9, y: 20 }
        ],
        [
          { x: 53, y: 45 },
          { x: 30, y: 45 },
          { x: 41.5, y: 25 }
        ],
        [
          { x: 50.4, y: 25 },
          { x: 73.4, y: 25 },
          { x: 61.9, y: 45 }
        ]
      ]
    }
  };

  const ORBIT_VALUE_INDICATOR_LINE_WIDTHS = [2, 4, 6, 8, 10, 12, 16, 20, 24];

  function drawIndicatorPolygon(drawCtx, polygon) {
    if (!polygon || polygon.length < 3) return;

    drawCtx.beginPath();
    drawCtx.moveTo(polygon[0].x, polygon[0].y);

    for (let i = 1; i < polygon.length; i++) {
      drawCtx.lineTo(polygon[i].x, polygon[i].y);
    }

    drawCtx.closePath();
    drawCtx.fill();
  }

  function drawTriangleIndicator(drawCtx, cfg, litCount) {
    if (!cfg) return;

    const shapeName = cfg.shape || "triangle3";
    const shape = INDICATOR_SHAPES[shapeName];
    if (!shape?.polygons?.length) return;

    drawCtx.save();
    drawCtx.translate(cfg.x ?? 0, cfg.y ?? 0);
    drawCtx.rotate(((cfg.angleDeg ?? 0) * Math.PI) / 180);
    drawCtx.scale(cfg.scale ?? 1, cfg.scale ?? 1);

    for (let i = 0; i < shape.polygons.length; i++) {
      drawCtx.fillStyle = i < litCount
        ? (cfg.color ?? COLORS.rcpRed)
        : (cfg.unlitColor ?? "#171717");
      drawIndicatorPolygon(drawCtx, shape.polygons[i]);
    }

    drawCtx.restore();
  }

  function drawOrbitValueIndicators(drawCtx) {
    const cfg = TABLE?.orbitValueIndicator;

    if (Array.isArray(cfg?.polygons) && cfg.polygons.length) {
      const litCount = getOrbitValueIndicatorLitCount();

      drawCtx.save();
      for (let i = 0; i < cfg.polygons.length; i++) {
        drawCtx.fillStyle = i < litCount
          ? (cfg.color ?? COLORS.rcpRed)
          : (cfg.unlitColor ?? "#171717");
        drawIndicatorPolygon(drawCtx, cfg.polygons[i]);
      }
      drawCtx.restore();
      return;
    }

    if (cfg?.shape) {
      drawTriangleIndicator(drawCtx, cfg, getOrbitValueIndicatorLitCount());
      return;
    }

    const indicators = TABLE?.orbitValueIndicators;
    if (!indicators?.length) return;

    const litCount = getOrbitValueIndicatorLitCount();

    drawCtx.save();
    drawCtx.lineCap = "butt";

    for (let i = 0; i < indicators.length; i++) {
      const ind = indicators[i];
      const lit = i < litCount;

      drawCtx.beginPath();
      drawCtx.moveTo(ind.x1, ind.y1);
      drawCtx.lineTo(ind.x2, ind.y2);
      drawCtx.lineWidth = ORBIT_VALUE_INDICATOR_LINE_WIDTHS[i] ?? 2;
      drawCtx.strokeStyle = lit ? COLORS.rcpRed : "#171717";
      drawCtx.stroke();
    }

    drawCtx.restore();
  }

  function drawTopDropValueIndicator(drawCtx) {
    const cfg = TABLE?.topDropValueIndicator;
    if (!cfg) return;

    drawTriangleIndicator(drawCtx, cfg, getTopDropValueIndicatorLitCount());
  }

  function drawCenterValueIndicator(drawCtx) {
    const cfg = TABLE?.centerValueIndicator;
    if (!cfg) return;

    drawTriangleIndicator(drawCtx, cfg, getCenterValueIndicatorLitCount());
  }

  function drawTable777LoopCountIndicator(drawCtx) {
    if (!isTable777()) return;

    const cfg = TABLE?.loopCountIndicator;
    const polygons = cfg?.polygons;

    if (!Array.isArray(polygons) || polygons.length <= 0) return;

    const litCount = getTable777LoopCountIndicatorLitCount();
    const litColor = getTable777LoopCountIndicatorLitColor();
    const unlitColor = cfg.unlitColor ?? "#171717";

    drawCtx.save();

    for (let i = 0; i < polygons.length; i++) {
      const polygon = polygons[i];
      if (!Array.isArray(polygon) || polygon.length < 3) continue;

      drawCtx.fillStyle = i < litCount ? litColor : unlitColor;
      drawIndicatorPolygon(drawCtx, polygon);
    }

    drawCtx.restore();
  }

  function drawTable777TargetComboIndicator(drawCtx) {
    if (!isTable777()) return;

    const cfg = TABLE?.targetComboIndicator;
    const items = cfg?.items;

    if (!Array.isArray(items) || items.length <= 0) return;

    const litColorName = cfg.litColor || "scoreFlash";
    const litColor = getTableColor(litColorName, "scoreFlash");
    const unlitColor = cfg.unlitColor ?? "#171717";

    drawCtx.save();

    for (const item of items) {
      const lit = shouldLightTable777TargetComboIndicatorItem(item);
      drawCtx.fillStyle = lit ? litColor : unlitColor;

      if (item.d) {
        if (!item.path2D) item.path2D = new Path2D(item.d);
        drawCtx.fill(item.path2D);
        continue;
      }

      if (Array.isArray(item.points)) {
        drawIndicatorPolygon(drawCtx, item.points);
      }
    }

    drawCtx.restore();
  }

  function drawOrbitBoostIndicator(drawCtx) {
    if (!ruleState.orbitBoostActive) return;

    const cfg = TABLE?.orbitBoostIndicator;
    if (!cfg) return;

    drawCtx.save();

    if (cfg.orbitPath) {
      if (!cfg.path2D) {
        cfg.path2D = new Path2D(cfg.orbitPath);
      }
      drawCtx.fillStyle = cfg.color ?? COLORS.cyan;
      drawCtx.fill(cfg.path2D);
    }

    if (Array.isArray(cfg.bodyPolygon) && cfg.bodyPolygon.length >= 3) {
      drawCtx.fillStyle = cfg.color ?? COLORS.cyan;
      drawIndicatorPolygon(drawCtx, cfg.bodyPolygon);
    }

    if (Array.isArray(cfg.borderLines) && cfg.borderLines.length) {
      drawCtx.strokeStyle = cfg.cutoutColor ?? "#171717";
      drawCtx.lineWidth = cfg.borderWidth ?? 8;
      drawCtx.lineCap = "butt";
      drawCtx.lineJoin = "miter";

      for (const line of cfg.borderLines) {
        drawCtx.beginPath();
        drawCtx.moveTo(line.x1, line.y1);
        drawCtx.lineTo(line.x2, line.y2);
        drawCtx.stroke();
      }
    }

    drawCtx.restore();
  }

  function drawSpinner(drawCtx, spinner) {
    const rect = spinner.rect;
    if (!rect) return;

    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    drawCtx.save();
    drawCtx.translate(cx, cy);
    drawCtx.rotate((rect.angleDeg * Math.PI) / 180);
    drawCtx.beginPath();
    drawCtx.rect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    drawCtx.fillStyle = spinner.pulseOn ? getSpinnerPulseFill() : COLORS.black;
    drawCtx.fill();
    drawCtx.lineWidth = 3;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.stroke();
    drawCtx.restore();
  }

  function drawSaucerLight(drawCtx, saucer) {
    const level = getSaucerBonusLevel(saucer);
    if (!level) return;

    drawCtx.save();
    drawCtx.globalAlpha = saucer.lightAlpha ?? 1;
    drawCtx.beginPath();
    drawCtx.arc(
      saucer.x,
      saucer.y,
      saucer.lightR ?? Math.max(4, (saucer.r ?? 30) - 8),
      0,
      Math.PI * 2
    );
    drawCtx.fillStyle = level.color ?? getTableColor("scoreFlash", "scoreFlash");
    drawCtx.fill();
    drawCtx.restore();
  }

  function drawPost(drawCtx, post) {
    const visualR = post.visualR ?? post.r;
    if (visualR <= 0) return;

    drawCtx.beginPath();
    drawCtx.arc(post.x, post.y, visualR, 0, Math.PI * 2);
    drawCtx.fillStyle = COLORS.white;
    drawCtx.fill();
  }

  function drawTarget(drawCtx, target) {
    const flashing = target.flash > 0;
    const runtimeLit = Boolean(tableModeRuntime?.isTargetLit?.(target.id));

    if (target.wall) {
      drawCtx.beginPath();
      drawCtx.moveTo(target.wall.x1, target.wall.y1);
      drawCtx.lineTo(target.wall.x2, target.wall.y2);
      drawCtx.lineWidth = target.wall.r * 1;
      drawCtx.strokeStyle = COLORS.white;
      drawCtx.stroke();
    }

    if (target.wallBottom) {
      drawCtx.beginPath();
      drawCtx.moveTo(target.wallBottom.x1, target.wallBottom.y1);
      drawCtx.lineTo(target.wallBottom.x2, target.wallBottom.y2);
      drawCtx.lineWidth = target.wallBottom.r * 1;
      drawCtx.strokeStyle = COLORS.white;
      drawCtx.stroke();
    }

    drawCtx.beginPath();
    drawCtx.moveTo(target.x1, target.y1);
    drawCtx.lineTo(target.x2, target.y2);
    drawCtx.lineWidth = 5;
    drawCtx.strokeStyle = flashing
      ? getTableColor("scoreFlash", "scoreFlash")
      : runtimeLit
        ? getTableColor("targetLit", "cyan")
      : target.type === "centerValue" && ruleState.centerValueDoublerActive
        ? getTableColor("flipper", "rcpRed")
        : ruleState.orbitBoostActive
          ? COLORS.cyan
          : COLORS.white;
    drawCtx.stroke();
  }

  function drawBallSave(drawCtx, ballSave) {
    const flashing = ballSave.flash > 0;
    const active = ballSave.active;

    let color;
    if (flashing) {
      color = getTableColor("scoreFlash", "scoreFlash");
    } else if (active) {
      color = ballSave.activeColor ?? ballSave.color ?? "#88e";
    } else {
      color = "#171717";
    }

    drawCtx.beginPath();
    drawCtx.moveTo(ballSave.x1, ballSave.y1);
    drawCtx.lineTo(ballSave.x2, ballSave.y2);
    drawCtx.lineCap = "round";
    drawCtx.lineWidth = flashing ? 7 : 5;
    drawCtx.strokeStyle = color;
    drawCtx.stroke();
  }

  function drawKickback(drawCtx, kickback) {
    const flashing = kickback.flash > 0;
    const active = kickback.active;

    let color;
    if (flashing) {
      color = getTableColor("scoreFlash", "scoreFlash");
    } else if (active) {
      color = kickback.activeColor ?? kickback.color ?? "#88e";
    } else {
      color = "#171717";
    }

    drawCtx.beginPath();
    drawCtx.moveTo(kickback.x1, kickback.y1);
    drawCtx.lineTo(kickback.x2, kickback.y2);
    drawCtx.lineCap = "round";
    drawCtx.lineWidth = flashing ? 7 : 6;
    drawCtx.strokeStyle = color;
    drawCtx.stroke();
  }

  function drawDropTarget(drawCtx, target) {
    if (target.down) return;

    const flashing = target.flash > 0;

    drawCtx.beginPath();
    drawCtx.moveTo(target.x1, target.y1);
    drawCtx.lineTo(target.x2, target.y2);
    drawCtx.lineCap = "round";
    drawCtx.lineWidth = flashing ? 7 : 5;
    drawCtx.strokeStyle = flashing ? getTableColor("scoreFlash", "scoreFlash") : COLORS.white;
    drawCtx.stroke();
  }

  function drawSlingshotBody(drawCtx, sling, flashing) {
    if (sling.bodyPath2D) {
      drawCtx.fillStyle = flashing ? getTableColor("scoreFlash", "scoreFlash") : COLORS.black;
      drawCtx.fill(sling.bodyPath2D);
      drawCtx.lineWidth = 4;
      drawCtx.strokeStyle = COLORS.white;
      drawCtx.stroke(sling.bodyPath2D);
      return;
    }
    const p = sling.body;
    if (!p || p.length < 3) return;
    drawCtx.beginPath();
    drawCtx.moveTo(p[0].x, p[0].y);
    drawCtx.lineTo(p[1].x, p[1].y);
    drawCtx.lineTo(p[2].x, p[2].y);
    drawCtx.closePath();
    drawCtx.fillStyle = flashing ? getTableColor("scoreFlash", "scoreFlash") : COLORS.black;
    drawCtx.fill();
    drawCtx.lineWidth = 2;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.stroke();
  }

  function rebuildDrainWallVisualCaches() {
    const nextCaches = [];
    const scale = DRAIN_WALL_VISUAL_SUPERSAMPLE;
    const pad = DRAIN_WALL_VISUAL_PADDING;

    for (let i = 0; i < drainWalls.length; i++) {
      const drainWall = drainWalls[i];
      const points = drainWall?.points;
      if (!points || points.length < 3) {
        nextCaches[i] = null;
        continue;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let pointsValid = true;

      for (let pi = 0; pi < points.length; pi++) {
        const pt = points[pi];
        if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") {
          pointsValid = false;
          break;
        }
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }

      if (
        !pointsValid ||
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(maxX) ||
        !Number.isFinite(maxY)
      ) {
        nextCaches[i] = null;
        continue;
      }

      const x = minX - pad;
      const y = minY - pad;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;

      if (!(w > 0) || !(h > 0)) {
        nextCaches[i] = null;
        continue;
      }

      try {
        const offscreen = document.createElement("canvas");
        offscreen.width = Math.ceil(w * scale);
        offscreen.height = Math.ceil(h * scale);
        const offscreenCtx = offscreen.getContext("2d");
        if (!offscreenCtx) {
          nextCaches[i] = null;
          continue;
        }

        offscreenCtx.setTransform(scale, 0, 0, scale, 0, 0);
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(points[0].x - x, points[0].y - y);
        for (let pi = 1; pi < points.length; pi++) {
          offscreenCtx.lineTo(points[pi].x - x, points[pi].y - y);
        }
        offscreenCtx.closePath();

        offscreenCtx.fillStyle = drainWall.fillStyle ?? COLORS.white;
        offscreenCtx.fill();

        if (drainWall.strokeStyle) {
          offscreenCtx.lineWidth = drainWall.strokeWidth ?? 2;
          offscreenCtx.strokeStyle = drainWall.strokeStyle;
          offscreenCtx.stroke();
        }

        nextCaches[i] = { canvas: offscreen, x, y, w, h };
      } catch (err) {
        nextCaches[i] = null;
      }
    }

    drainWallVisualCaches = nextCaches;
  }

  function drawDrainWallPolygon(drawCtx, drainWall) {
    const points = drainWall.points;
    if (!points || points.length < 3) return;

    drawCtx.beginPath();
    drawCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      drawCtx.lineTo(points[i].x, points[i].y);
    }
    drawCtx.closePath();

    drawCtx.fillStyle = drainWall.fillStyle ?? COLORS.white;
    drawCtx.fill();

    if (drainWall.strokeStyle) {
      drawCtx.lineWidth = drainWall.strokeWidth ?? 2;
      drawCtx.strokeStyle = drainWall.strokeStyle;
      drawCtx.stroke();
    }
  }

  function drawDrainWall(drawCtx, drainWall, cache) {
    if (
      cache &&
      cache.canvas &&
      Number.isFinite(cache.x) &&
      Number.isFinite(cache.y) &&
      Number.isFinite(cache.w) &&
      Number.isFinite(cache.h) &&
      cache.w > 0 &&
      cache.h > 0
    ) {
      drawCtx.save();
      drawCtx.imageSmoothingEnabled = true;

      if ("imageSmoothingQuality" in drawCtx) {
        drawCtx.imageSmoothingQuality = "high";
      }

      drawCtx.drawImage(
        cache.canvas,
        cache.x,
        cache.y,
        cache.w,
        cache.h
      );

      drawCtx.restore();
      return;
    }

    drawDrainWallPolygon(drawCtx, drainWall);
  }



  function formatScore(value) {
    return String(Math.max(0, Math.floor(value)));
  }

  function getLaunchPromptText() {
    const customText = tableModeRuntime?.getLaunchPromptText?.();
    if (typeof customText === "string" && customText.length > 0) {
      return customText;
    }

    if (gameState.status === "ready") {
      return "START GAME";
    }
    if (gameState.status === "ballLost") {
      return "LAUNCH BALL " + gameState.currentBall;
    }
    if (gameState.status === "gameOver") {
      return "GAME OVER";
    }
    return "PRESS LAUNCH";
  }

  function drawPromptText(drawCtx, text, x, y) {
    drawCtx.save();
    drawCtx.lineWidth = 7;
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = "#171717";
    drawCtx.strokeText(text, x, y);
    drawCtx.fillText(text, x, y);
    drawCtx.restore();
  }

  function drawLaunchRestartPrompt(drawCtx) {
    drawCtx.save();
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.font = "700 24px system-ui, sans-serif";
    drawCtx.fillStyle = "#fff";
    drawPromptText(
      drawCtx,
      "LAUNCH TO RESTART GAME",
      CANVAS_W / 2,
      getPlayfieldUiLayout().secondaryPromptY
    );
    drawCtx.restore();
  }

  function drawPauseGuidePrompt(drawCtx) {
    drawCtx.save();
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.font = "700 24px system-ui, sans-serif";
    drawCtx.fillStyle = "#fff";
    drawPromptText(
      drawCtx,
      "↓ TABLE GUIDE   ↑ RECORDS",
      CANVAS_W / 2,
      getPlayfieldUiLayout().secondaryPromptY
    );
    drawCtx.restore();
  }

  function drawBallStatus(drawCtx) {
    if (TABLE?.ui?.showBallStatus === false) return;

    drawCtx.save();
    drawCtx.textAlign = "right";
    drawCtx.textBaseline = "top";
    drawCtx.font = "700 28px system-ui, sans-serif";
    drawCtx.fillStyle = "#bbb";
    drawCtx.fillText(
      "BALL " + gameState.currentBall + "/" + getBallsPerGame(),
      CANVAS_W - 20,
      20
    );
    drawCtx.restore();
  }

  function shouldShowBonusHint() {
    return displayState.mode === "normal"
      && (displayState.awaitingFirstLaunchMessage
        || (ruleState.bonusValue === 0 && ruleState.bonusMult === 1));
  }

  function getCenterValueDisplayText() {
    const value = Math.min(
      RULE_CONFIG.centerValueMaxScore,
      ruleState.centerValueScore
    );
    return "CENTER VALUE " + value;
  }

  function getDisplayBonusText() {
    if (
      TABLE?.ui?.centerValueDisplayAfterFirstMessage &&
      displayState.centerValueDisplayUnlocked
    ) {
      return getCenterValueDisplayText();
    }

    if (shouldShowBonusHint()) {
      const hints = getDisplayHints();
      return hints[displayState.hintIndex] ?? hints[0] ?? "";
    }

    if (TABLE?.saucerBonusLevels) {
      return "BONUS POWER x" + formatBonusPowerMultiplier();
    }

    return "BONUS " + ruleState.bonusValue + " x" + ruleState.bonusMult;
  }

  function getDisplayLine1Overlay() {
    if (displayState.messageTimer > 0) {
      return displayState.message;
    }

    if (ruleState.centerValueDoublerActive) {
      return getCenterValueDisplayText() + " x" + RULE_CONFIG.centerValueDoublerMultiplier;
    }

    if (ruleState.orbitBoostActive) {
      return "ORBIT TARGET " + getCurrentOrbitTargetScore();
    }

    return null;
  }

  function getDisplayLines() {
    if (displayState.mode === "secondChance") {
      return {
        line1: "Relaunching...",
        line2: "SCORE " + formatScore(score)
      };
    }
    if (displayState.mode === "ballLost") {
      if (TABLE?.ui?.ballLostDisplay === "ballLostScore") {
        return {
          line1: "BALL " + displayState.lastLostBall + " RESULT",
          line2: "SCORE " + formatScore(displayState.lastTotalScore)
        };
      }
    }

    if (displayState.mode === "gameOver") {
      if (TABLE?.ui?.gameOverDisplay === "finalScoreOnly") {
        return {
          line1: "FINAL SCORE",
          line2: formatScore(displayState.lastTotalScore)
        };
      }
    }

    if (displayState.mode === "ballLost" || displayState.mode === "gameOver") {
      const scoreLabel = displayState.mode === "gameOver" ? "FINAL SCORE" : "TOTAL SCORE";
      return {
        line1: "BONUS TOTAL " + displayState.lastBonusTotal,
        line2: scoreLabel + " " + formatScore(displayState.lastTotalScore)
      };
    }

    const line1Overlay = getDisplayLine1Overlay();
    return {
      line1: line1Overlay ?? getDisplayBonusText(),
      line2: "SCORE " + formatScore(score)
    };
  }

  function getRuleMessage(key, fallbackText) {
    const override = TABLE?.ui?.displayMessages?.[key];
    return typeof override === "string" && override.length > 0
      ? override
      : fallbackText;
  }

  function shouldSuppressRuleMessage(key) {
    return TABLE?.ui?.suppressRuleMessages?.[key] === true;
  }

  function showRuleMessage(key, fallbackText, frames = 90) {
    if (shouldSuppressRuleMessage(key)) return;
    showDisplayMessage(getRuleMessage(key, fallbackText), frames);
  }

  function showDisplayMessage(text, frames = 90) {
    displayState.awaitingFirstLaunchMessage = false;
    if (TABLE?.ui?.centerValueDisplayAfterFirstMessage) {
      displayState.centerValueDisplayUnlocked = true;
    }
    displayState.message = text;
    displayState.messageTimer = frames;
  }

  function updateDisplayState() {
    if (displayState.messageTimer > 0) {
      displayState.messageTimer--;
      if (displayState.messageTimer <= 0) {
        displayState.messageTimer = 0;
        displayState.message = "";
      }
    }
  }

  function getPlayfieldUiLayout() {
    const configured = TABLE?.ui?.playfieldLayout || {};
    const defaultDisplay = {
      x: 141.5,
      y: 635,
      w: 457,
      h: 152.5
    };
    const display = {
      ...defaultDisplay,
      ...(configured.display || {})
    };

    return {
      display,
      launchPromptY: configured.launchPromptY ?? CANVAS_H * 0.455,
      pausedPromptY: configured.pausedPromptY ?? CANVAS_H / 2.2,
      relaunchPromptY: configured.relaunchPromptY ?? CANVAS_H * 0.35,
      secondaryPromptY: configured.secondaryPromptY ?? display.y + display.h + 40
    };
  }

  function drawDisplayLabelValue(drawCtx, label, value, y, displayLayout) {
    const x = displayLayout.x - 14;
    const w = displayLayout.w + 28;
    const padX = 108;

    drawCtx.textBaseline = "middle";
    drawCtx.fillStyle = "#bbb";
    drawCtx.font = "700 36px system-ui, sans-serif";

    drawCtx.textAlign = "left";
    drawCtx.fillText(label, x + padX, y);

    drawCtx.textAlign = "right";
    drawCtx.fillText(value, x + w - padX, y);
  }

  function drawPlayfieldDisplay(drawCtx) {
    const lines = getDisplayLines();
    const layout = getPlayfieldUiLayout().display;
    const { x, y, w, h } = layout;
    const customLines = tableModeRuntime?.getDisplayLines?.() ?? null;

    drawCtx.save();

    drawCtx.fillStyle = "#111";
    drawCtx.strokeStyle = "#222";
    drawCtx.lineWidth = 2;

    drawCtx.beginPath();
    if (typeof drawCtx.roundRect === "function") {
      drawCtx.roundRect(x, y, w, h, 20);
    } else {
      drawCtx.rect(x, y, w, h);
    }
    drawCtx.fill();
    drawCtx.stroke();

    drawCtx.textBaseline = "middle";
    const resultColor = displayState.mode === "gameOver" ? "#fff" : "#bbb";
    drawCtx.fillStyle = resultColor;

    if (customLines && displayState.mode === "normal") {
      drawCtx.textAlign = "center";
      drawCtx.font = "500 28px system-ui, sans-serif";
      drawCtx.fillText(customLines.line1, x + w / 2, y + 52);

      if (customLines.line2Label != null && customLines.line2Value != null) {
        drawDisplayLabelValue(drawCtx, customLines.line2Label, customLines.line2Value, y + 102, layout);
      } else {
        drawCtx.font = "700 36px system-ui, sans-serif";
        drawCtx.fillText(customLines.line2, x + w / 2, y + 102);
      }
    } else if (displayState.mode === "normal") {
      const line1Overlay = getDisplayLine1Overlay();
      const line1Text = line1Overlay ?? getDisplayBonusText();

      drawCtx.textAlign = "center";
      drawCtx.font = "500 28px system-ui, sans-serif";
      drawCtx.fillText(line1Text, x + w / 2, y + 52);

      drawDisplayLabelValue(drawCtx, "SCORE", formatScore(score), y + 102, layout);
    } else if (displayState.mode === "secondChance") {
      drawCtx.fillStyle = resultColor;
      drawCtx.textAlign = "center";
      drawCtx.font = "500 28px system-ui, sans-serif";
      drawCtx.fillText(lines.line1, x + w / 2, y + 52);

      drawDisplayLabelValue(drawCtx, "SCORE", formatScore(score), y + 102, layout);
    } else {
      drawCtx.fillStyle = resultColor;
      drawCtx.textAlign = "center";
      drawCtx.font = "500 28px system-ui, sans-serif";
      drawCtx.fillText(lines.line1, x + w / 2, y + 52);

      drawCtx.fillStyle = resultColor;
      drawCtx.textAlign = "center";
      drawCtx.font = "700 36px system-ui, sans-serif";
      drawCtx.fillText(lines.line2, x + w / 2, y + 102);
    }

    drawCtx.restore();
  }

  function loadTitleLogo() {
    const cfg = getAssetConfig("titleLogo");
    if (!cfg) return;

    const cacheKey = getImageCacheKey("title", cfg);
    const cached = imageCacheBySrc.get(cacheKey);
    if (cached) {
      titleLogoImage = cached;
      titleLogoReady = true;
      titleLogoLoadStarted = true;
      return;
    }

    if (titleLogoLoadStarted) return;
    titleLogoLoadStarted = true;
    if (typeof fetch !== "function") return;

    fetch(cfg.src)
      .then(response => {
        if (!response.ok) throw new Error("Failed to load title logo");
        return response.text();
      })
      .then(svgText => {
        const blob = new Blob([svgText], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          titleLogoImage = img;
          titleLogoReady = true;
          imageCacheBySrc.set(cacheKey, img);
          URL.revokeObjectURL(url);
        };
        img.onerror = () => {
          titleLogoReady = false;
          URL.revokeObjectURL(url);
        };
        img.src = url;
      })
      .catch(() => {
        titleLogoReady = false;
      });
  }

  function drawTitleOverlay(drawCtx) {
    const panel = TITLE_PANEL;

    drawCtx.save();
    drawCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
    drawCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawCtx.fillStyle = COLORS.black;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.lineWidth = 2;
    drawCtx.beginPath();
    drawCtx.rect(panel.x, panel.y, panel.w, panel.h);
    drawCtx.fill();
    drawCtx.stroke();

    const titleCfg = getAssetConfig("titleLogo");
    if (titleCfg && titleLogoReady && titleLogoImage) {
      const cfg = titleCfg;
      const size = 600 * cfg.scale;
      const panelCx = panel.x + panel.w / 2;
      const panelCy = panel.y + panel.h / 2 + (cfg.offsetY ?? 0);

      drawCtx.globalAlpha = cfg.opacity;
      drawCtx.drawImage(
        titleLogoImage,
        panelCx - size / 2,
        panelCy - size / 2,
        size,
        size
      );
      drawCtx.globalAlpha = 1;
    }

    drawCtx.fillStyle = COLORS.white;
    drawCtx.textBaseline = "alphabetic";

    drawCtx.textAlign = "left";
    drawCtx.font = "700 28px system-ui, sans-serif";
    drawCtx.fillText("A Ryo Sato Game", 58, 353);

    drawCtx.textAlign = "right";
    drawCtx.fillText("Made with ChatGPT", 680, 353);

    drawCtx.textAlign = "left";
    drawCtx.font = "700 20px system-ui, sans-serif";
    drawCtx.fillText("2026", 58, 949);

    drawCtx.textAlign = "right";
    drawCtx.fillText("version 1.1.0", 680, 949);

    const selectedItem = TABLE_SELECT_ITEMS[titleState.selectedTableIndex] ?? TABLE_SELECT_ITEMS[0];
    drawCtx.textAlign = "center";
    drawCtx.font = "700 40px system-ui, sans-serif";
    drawCtx.fillText("◀  " + selectedItem.label + "  ▶", panel.x + panel.w / 2, 881);

    const controlsHint = "← → : Flipper | ↓ / Enter : Launch | ↑ : Nudge | Space : Pause | R : Reset | Esc : Title";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    let controlsFontSize = 18;
    drawCtx.font = controlsFontSize + "px system-ui, sans-serif";
    while (controlsFontSize > 16 && drawCtx.measureText(controlsHint).width > CANVAS_W - 16) {
      controlsFontSize -= 1;
      drawCtx.font = controlsFontSize + "px system-ui, sans-serif";
    }
    const controlsX = CANVAS_W / 2;
    const controlsY = 995;

    drawCtx.lineWidth = 6;
    drawCtx.lineJoin = "round";
    drawCtx.strokeStyle = "#171717";
    drawCtx.strokeText(controlsHint, controlsX, controlsY);

    drawCtx.fillStyle = "#fff";
    drawCtx.fillText(controlsHint, controlsX, controlsY);

    drawCtx.restore();
  }

  function drawInfoOverlay(drawCtx, label) {
    const panel = TITLE_PANEL;

    drawCtx.save();
    drawCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
    drawCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawCtx.fillStyle = COLORS.black;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.lineWidth = 4;
    drawCtx.beginPath();
    drawCtx.rect(panel.x, panel.y, panel.w, panel.h);
    drawCtx.fill();
    drawCtx.stroke();

    drawCtx.fillStyle = COLORS.white;
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.font = "900 72px system-ui, sans-serif";
    drawCtx.fillText(label, panel.x + panel.w / 2, panel.y + panel.h / 2);
    drawCtx.restore();
  }

  function drawHowToOverlay(drawCtx) {
    const cfg = getAssetConfig("howToOverlay");
    if (!cfg || !howToOverlayReady || !howToOverlayImage) {
      drawInfoOverlay(drawCtx, "HOW TO");
      return;
    }

    drawCtx.save();
    drawCtx.globalAlpha = cfg.opacity;
    drawCtx.drawImage(howToOverlayImage, 0, 0, CANVAS_W, CANVAS_H);
    drawCtx.restore();
  }

  function drawRecordsOverlay(drawCtx) {
    const panel = TITLE_PANEL;
    const contentX = panel.x + 80;
    const contentW = panel.w - 160;
    const rowStartY = panel.y + 220;
    const rowHeight = 72;

    drawCtx.save();
    drawCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
    drawCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawCtx.fillStyle = COLORS.black;
    drawCtx.strokeStyle = COLORS.white;
    drawCtx.lineWidth = 4;
    drawCtx.beginPath();
    drawCtx.rect(panel.x, panel.y, panel.w, panel.h);
    drawCtx.fill();
    drawCtx.stroke();

    drawCtx.textBaseline = "middle";
    drawCtx.fillStyle = COLORS.white;
    drawCtx.textAlign = "center";
    drawCtx.font = "900 72px system-ui, sans-serif";
    drawCtx.fillText("RECORDS", panel.x + panel.w / 2, panel.y + 110);

    drawCtx.font = "700 40px system-ui, sans-serif";

    for (let rank = 1; rank <= MAX_RECORDS; rank++) {
      const index = rank - 1;
      const entry = recordsState.entries[index];
      const y = rowStartY + (rank - 1) * rowHeight;
      const highlight = index === recordsState.lastInsertedIndex;

      drawCtx.fillStyle = highlight ? COLORS.cyan : COLORS.white;

      drawCtx.textAlign = "left";
      drawCtx.fillText(String(rank), contentX, y);

      drawCtx.textAlign = "right";
      drawCtx.fillText(
        entry ? formatScore(entry.score) : "-",
        contentX + contentW,
        y
      );
    }

    drawCtx.restore();
  }

  function loadPlayfieldLogo() {
    const cfg = getAssetConfig("playfieldLogo");
    if (!cfg) return;

    const cacheKey = getImageCacheKey("playfield", cfg);
    const cached = imageCacheBySrc.get(cacheKey);
    if (cached) {
      playfieldLogoImage = cached;
      playfieldLogoReady = true;
      playfieldLogoLoadStarted = true;
      invalidateStaticPlayfieldCache();
      return;
    }

    if (playfieldLogoLoadStarted) return;
    playfieldLogoLoadStarted = true;
    if (typeof fetch !== "function") return;

    fetch(cfg.src)
      .then(response => {
        if (!response.ok) throw new Error("Failed to load playfield logo");
        return response.text();
      })
      .then(svgText => {
        const patchedSvg = svgText
          .replace(/fill:\s*#fff/gi, "fill: #333")
          .replace(/fill:\s*#b12/gi, "fill: none; stroke: #333; stroke-width: 6; stroke-linejoin: round; stroke-miterlimit: 10");

        const blob = new Blob([patchedSvg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          playfieldLogoImage = img;
          playfieldLogoReady = true;
          imageCacheBySrc.set(cacheKey, img);
          URL.revokeObjectURL(url);
          invalidateStaticPlayfieldCache();
        };
        img.onerror = () => {
          playfieldLogoReady = false;
          URL.revokeObjectURL(url);
        };
        img.src = url;
      })
      .catch(() => {
        playfieldLogoReady = false;
      });
  }

  function drawPlayfieldLogo(drawCtx) {
    const cfg = getAssetConfig("playfieldLogo");
    if (!cfg || !playfieldLogoReady || !playfieldLogoImage) return;
    const size = 600 * cfg.scale;

    drawCtx.save();
    drawCtx.globalAlpha = cfg.opacity;
    drawCtx.drawImage(playfieldLogoImage, cfg.x, cfg.y, size, size);
    drawCtx.restore();
  }

  function loadPlayfieldMask() {
    if (playfieldMaskLoadStarted) return;
    playfieldMaskLoadStarted = true;

    const cfg = getAssetConfig("playfieldMask");
    if (!cfg) return;

    const img = new Image();
    img.onload = () => {
      playfieldMaskImage = img;
      playfieldMaskReady = true;
    };
    img.onerror = () => {
      playfieldMaskReady = false;
    };
    img.src = cfg.src;
  }

  function loadCenterValueDoublerIndicator() {
    if (centerValueDoublerIndicatorLoadStarted) return;
    centerValueDoublerIndicatorLoadStarted = true;

    const cfg = getAssetConfig("centerValueDoublerIndicator");
    if (!cfg) return;

    const img = new Image();
    img.onload = () => {
      centerValueDoublerIndicatorImage = img;
      centerValueDoublerIndicatorReady = true;
    };
    img.onerror = () => {
      centerValueDoublerIndicatorReady = false;
    };
    img.src = cfg.src;
  }

  function loadHowToOverlay() {
    if (howToOverlayLoadStarted) return;
    howToOverlayLoadStarted = true;

    const cfg = getAssetConfig("howToOverlay");
    if (!cfg) return;

    const img = new Image();

    img.onload = () => {
      howToOverlayImage = img;
      howToOverlayReady = true;
    };

    img.onerror = () => {
      howToOverlayReady = false;
    };

    img.src = cfg.src;
  }

  function resetAssetCache() {
    invalidateStaticPlayfieldCache();
    playfieldLogoImage = null;
    playfieldLogoReady = false;
    playfieldLogoLoadStarted = false;

    playfieldMaskImage = null;
    playfieldMaskReady = false;
    playfieldMaskLoadStarted = false;

    centerValueDoublerIndicatorImage = null;
    centerValueDoublerIndicatorReady = false;
    centerValueDoublerIndicatorLoadStarted = false;

    titleLogoImage = null;
    titleLogoReady = false;
    titleLogoLoadStarted = false;

    howToOverlayImage = null;
    howToOverlayReady = false;
    howToOverlayLoadStarted = false;
  }

  function loadTableAssets() {
    loadPlayfieldLogo();
    loadTitleLogo();
    loadPlayfieldMask();
    loadCenterValueDoublerIndicator();
    loadHowToOverlay();
  }

  function drawPlayfieldMask(drawCtx) {
    const cfg = getAssetConfig("playfieldMask");
    if (!cfg || !playfieldMaskReady || !playfieldMaskImage) return;

    drawCtx.save();
    drawCtx.globalAlpha = cfg.opacity;
    drawCtx.drawImage(playfieldMaskImage, 0, 0, CANVAS_W, CANVAS_H);
    drawCtx.restore();
  }

  function drawCenterValueDoublerIndicator(drawCtx) {
    if (!ruleState.centerValueDoublerActive) return;

    const cfg = getAssetConfig("centerValueDoublerIndicator");
    if (!cfg || !centerValueDoublerIndicatorReady || !centerValueDoublerIndicatorImage) return;

    drawCtx.save();
    drawCtx.globalAlpha = cfg.opacity ?? 1;
    drawCtx.drawImage(centerValueDoublerIndicatorImage, 0, 0, CANVAS_W, CANVAS_H);
    drawCtx.restore();
  }

  function getTargetIslandFillColor(island) {
    if (ruleState.centerValueDoublerTriggerResetTimerMs > 0) {
      return getTableColor("scoreFlash", "scoreFlash");
    }

    const hitState = ruleState.centerValueDoublerTriggerHitState;
    if (hitState && hitState[island.targetId]) {
      return island.litFill ?? getTableColor("scoreFlash", "scoreFlash");
    }

    return island.fill ?? "#171717";
  }

  function drawTargetIsland(drawCtx, island) {
    const points = island.points;
    if (!Array.isArray(points) || points.length < 3) return;

    drawCtx.beginPath();
    drawCtx.moveTo(points[0].x, points[0].y);
    for (let pi = 1; pi < points.length; pi++) {
      drawCtx.lineTo(points[pi].x, points[pi].y);
    }
    drawCtx.closePath();
    drawCtx.fillStyle = getTargetIslandFillColor(island);
    drawCtx.fill();

    if (island.strokeStyle && island.strokeWidth > 0) {
      drawCtx.strokeStyle = island.strokeStyle;
      drawCtx.lineWidth = island.strokeWidth;
      drawCtx.stroke();
    }
  }

  function drawTargetIslands(drawCtx) {
    if (!targetIslands.length) return;
    for (let ii = 0; ii < targetIslands.length; ii++) {
      drawTargetIsland(drawCtx, targetIslands[ii]);
    }
  }

  function drawDynamicIslandFillLayer(drawCtx) {
    drawTargetIslands(drawCtx);
  }

  function drawStaticWallsDrainOrbit(drawCtx) {
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      drawCtx.beginPath();
      drawCtx.moveTo(w.x1, w.y1);
      drawCtx.lineTo(w.x2, w.y2);
      drawCtx.lineWidth = w.visualWidth ?? w.r * 2;
      drawCtx.strokeStyle = COLORS.white;
      drawCtx.stroke();
    }
    for (let i = 0; i < drainWalls.length; i++) {
      drawDrainWall(drawCtx, drainWalls[i], drainWallVisualCaches[i]);
    }
    drawOrbitVisual(drawCtx);
  }

  function drawStaticTopLaneDividersLayer(drawCtx) {
    for (let di = 0; di < topLaneDividers.length; di++) {
      drawTopLaneDivider(drawCtx, topLaneDividers[di]);
    }
  }

  function drawStaticPostsLayer(drawCtx) {
    for (let pi = 0; pi < posts.length; pi++) {
      drawPost(drawCtx, posts[pi]);
    }
  }

  function canBuildStaticPlayfieldCache() {
    const logoCfg = getAssetConfig("playfieldLogo");
    if (!logoCfg) return true;
    return playfieldLogoReady;
  }

  function invalidateStaticPlayfieldCache() {
    staticPlayfieldCache.ready = false;
  }

  function rebuildStaticPlayfieldCache() {
    if (!canBuildStaticPlayfieldCache()) {
      staticPlayfieldCache.ready = false;
      return;
    }

    const slotHeight = CANVAS_H;
    let canvas = staticPlayfieldCache.canvas;
    if (!canvas) {
      canvas = document.createElement("canvas");
      staticPlayfieldCache.canvas = canvas;
    }

    canvas.width = CANVAS_W;
    canvas.height = slotHeight * STATIC_PLAYFIELD_CACHE_SLOT_COUNT;
    const cacheCtx = canvas.getContext("2d");
    cacheCtx.clearRect(0, 0, canvas.width, canvas.height);
    cacheCtx.lineCap = "round";

    const drawCacheSlot = (slotIndex, drawSlot) => {
      cacheCtx.save();
      cacheCtx.translate(0, slotIndex * slotHeight);
      drawSlot(cacheCtx);
      cacheCtx.restore();
    };

    drawCacheSlot(
      STATIC_PLAYFIELD_CACHE_SLOT.wallsDrainOrbit,
      drawStaticWallsDrainOrbit
    );
    drawCacheSlot(
      STATIC_PLAYFIELD_CACHE_SLOT.topLaneDividers,
      drawStaticTopLaneDividersLayer
    );
    drawCacheSlot(
      STATIC_PLAYFIELD_CACHE_SLOT.playfieldLogo,
      drawPlayfieldLogo
    );
    drawCacheSlot(
      STATIC_PLAYFIELD_CACHE_SLOT.posts,
      drawStaticPostsLayer
    );

    staticPlayfieldCache.slotHeight = slotHeight;
    staticPlayfieldCache.ready = true;
  }

  function ensureStaticPlayfieldCache() {
    if (staticPlayfieldCache.ready) return true;
    rebuildStaticPlayfieldCache();
    return staticPlayfieldCache.ready;
  }

  function blitStaticPlayfieldCacheSlot(drawCtx, slotIndex) {
    const cache = staticPlayfieldCache;
    if (!cache.ready || !cache.canvas) return;

    const slotHeight = cache.slotHeight;
    drawCtx.drawImage(
      cache.canvas,
      0,
      slotIndex * slotHeight,
      CANVAS_W,
      slotHeight,
      0,
      0,
      CANVAS_W,
      slotHeight
    );
  }

  function drawStaticPlayfield(drawCtx) {
    drawStaticWallsDrainOrbit(drawCtx);
    drawStaticTopLaneDividersLayer(drawCtx);
    drawPlayfieldLogo(drawCtx);
    drawStaticPostsLayer(drawCtx);
  }

  function drawDynamicWallBumps(drawCtx) {
    for (let wbi = 0; wbi < wallBumps.length; wbi++) {
      const wb = wallBumps[wbi];
      const flashing = wb.flash > 0;

      for (let si = 0; si < wb.segments.length; si++) {
        const seg = wb.segments[si];

        drawCtx.beginPath();
        drawCtx.moveTo(seg.x1, seg.y1);
        drawCtx.lineTo(seg.x2, seg.y2);
        drawCtx.lineWidth = seg.visualWidth ?? seg.r * 2;
        drawCtx.strokeStyle = flashing ? getTableColor("scoreFlash", "scoreFlash") : COLORS.white;
        drawCtx.stroke();
      }
    }
  }

  function drawDynamicOrbitIndicators(drawCtx) {
    drawOrbitValueIndicators(drawCtx);
    drawTopDropValueIndicator(drawCtx);
    drawCenterValueIndicator(drawCtx);
    drawOrbitBoostIndicator(drawCtx);
    drawTable777LoopCountIndicator(drawCtx);
    drawTable777TargetComboIndicator(drawCtx);
    drawTable777SlotVisual(drawCtx);
  }

  function drawDynamicSpinnersLayer(drawCtx) {
    for (let spi = 0; spi < spinners.length; spi++) {
      drawSpinner(drawCtx, spinners[spi]);
    }
  }

  function drawDynamicSaucerLightsLayer(drawCtx) {
    for (let si = 0; si < saucers.length; si++) {
      drawSaucerLight(drawCtx, saucers[si]);
    }
  }

  function drawTimedBlocker(drawCtx, blocker) {
    if (blocker.open) return;

    const flashing = blocker.flash > 0;

    drawCtx.beginPath();
    drawCtx.moveTo(blocker.x1, blocker.y1);
    drawCtx.lineTo(blocker.x2, blocker.y2);
    drawCtx.lineCap = "round";
    drawCtx.lineWidth = blocker.visualWidth ?? ((blocker.r ?? 5) * 2);
    drawCtx.strokeStyle = flashing
      ? getTableColor("scoreFlash", "scoreFlash")
      : COLORS.white;
    drawCtx.stroke();
  }

  function drawDynamicTopLanesTargetsLayer(drawCtx) {
    for (let li = 0; li < topLanes.length; li++) {
      drawTopLane(drawCtx, topLanes[li]);
    }
    for (let tbi = 0; tbi < timedBlockers.length; tbi++) {
      drawTimedBlocker(drawCtx, timedBlockers[tbi]);
    }
    for (let ti = 0; ti < targets.length; ti++) {
      drawTarget(drawCtx, targets[ti]);
    }
    for (let di = 0; di < dropTargets.length; di++) {
      drawDropTarget(drawCtx, dropTargets[di]);
    }
  }

  function drawDynamicSlingshotsKickbacksLayer(drawCtx) {
    for (let si = 0; si < slingshots.length; si++) {
      const sling = slingshots[si];
      const edge = sling.activeSegment;
      const flashing = sling.flash > 0;
      drawSlingshotBody(drawCtx, sling, flashing);
      drawCtx.beginPath();
      drawCtx.moveTo(edge.x1, edge.y1);
      drawCtx.lineTo(edge.x2, edge.y2);
      drawCtx.lineWidth = 2;
      drawCtx.strokeStyle = COLORS.white;
      drawCtx.stroke();
    }
    for (let ki = 0; ki < kickbacks.length; ki++) {
      drawKickback(drawCtx, kickbacks[ki]);
    }
  }

  function drawDynamicFlippersBallSavesLayer(drawCtx) {
    function strokeFlipper(f) {
      const p2 = f.getP2();
      drawCtx.beginPath();
      drawCtx.moveTo(f.x, f.y);
      drawCtx.lineTo(p2.x, p2.y);
      drawCtx.lineWidth = f.thickness * 2;
      drawCtx.strokeStyle = getTableColor("flipper", "rcpRed");
      drawCtx.stroke();
      drawCtx.beginPath();
      drawCtx.arc(f.x, f.y, f.thickness * 0.6, 0, Math.PI * 2);
      drawCtx.fillStyle = COLORS.white;
      drawCtx.fill();
    }
    for (const flipper of flippers) strokeFlipper(flipper);
    for (let bsi = 0; bsi < ballSaves.length; bsi++) {
      drawBallSave(drawCtx, ballSaves[bsi]);
    }
  }

  function drawDynamicBumpersLayer(drawCtx) {
    for (let bi = 0; bi < bumpers.length; bi++) {
      const bumper = bumpers[bi];
      const flashing = bumper.flash > 0;

      drawBumperBase(drawCtx, bumper, flashing);
      drawBumperOverlay(drawCtx, bumper, flashing);
    }
  }

  function drawDynamicPlayfield(drawCtx) {
    drawDynamicIslandFillLayer(drawCtx);
    drawDynamicWallBumps(drawCtx);
    drawDynamicOrbitIndicators(drawCtx);
    drawDynamicSpinnersLayer(drawCtx);
    drawDynamicSaucerLightsLayer(drawCtx);
    drawDynamicTopLanesTargetsLayer(drawCtx);
    drawDynamicSlingshotsKickbacksLayer(drawCtx);
    drawDynamicFlippersBallSavesLayer(drawCtx);
    drawDynamicBumpersLayer(drawCtx);
  }

  function drawBall(drawCtx) {
    if (!ballInPlay) return;

    const r = BALL_RADIUS;

    // base fill
    drawCtx.beginPath();
    drawCtx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
    drawCtx.fillStyle = COLORS.ballBase;
    drawCtx.fill();

    // outer stroke
    drawCtx.beginPath();
    drawCtx.arc(ball.x, ball.y, r - 1, 0, Math.PI * 2);
    drawCtx.lineWidth = r * (2 / 22); // SVGのstroke-width:2 を比率で再現
    drawCtx.strokeStyle = COLORS.ballStroke;
    drawCtx.stroke();

    // highlight
    drawCtx.beginPath();
    drawCtx.arc(
      ball.x + r * (7 / 22),
      ball.y - r * (10 / 22),
      r * (5 / 22),
      0,
      Math.PI * 2
    );
    drawCtx.fillStyle = COLORS.white;
    drawCtx.fill();
  }

  function drawDebugOverlay(drawCtx) {
    if (!DEBUG || !TABLE?.stuckZones) return;

    for (let zi = 0; zi < TABLE.stuckZones.length; zi++) {
      const zone = TABLE.stuckZones[zi];
      if (zone.type === "circle") {
        drawCtx.beginPath();
        drawCtx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
        drawCtx.lineWidth = 1;
        drawCtx.strokeStyle = "#0f0";
        drawCtx.stroke();
      }
    }
  }

  function drawPinballScene(drawCtx) {
    drawCtx.lineCap = "round";
    const useStaticCache = ensureStaticPlayfieldCache();

    drawDynamicIslandFillLayer(drawCtx);
    drawDynamicWallBumps(drawCtx);
    if (useStaticCache) {
      blitStaticPlayfieldCacheSlot(drawCtx, STATIC_PLAYFIELD_CACHE_SLOT.wallsDrainOrbit);
    } else {
      drawStaticWallsDrainOrbit(drawCtx);
    }
    drawDynamicOrbitIndicators(drawCtx);
    drawDynamicSpinnersLayer(drawCtx);
    drawDynamicSaucerLightsLayer(drawCtx);
    if (useStaticCache) {
      blitStaticPlayfieldCacheSlot(drawCtx, STATIC_PLAYFIELD_CACHE_SLOT.topLaneDividers);
    } else {
      drawStaticTopLaneDividersLayer(drawCtx);
    }
    drawDynamicTopLanesTargetsLayer(drawCtx);
    if (useStaticCache) {
      blitStaticPlayfieldCacheSlot(drawCtx, STATIC_PLAYFIELD_CACHE_SLOT.playfieldLogo);
    } else {
      drawPlayfieldLogo(drawCtx);
    }
    drawDynamicSlingshotsKickbacksLayer(drawCtx);
    if (useStaticCache) {
      blitStaticPlayfieldCacheSlot(drawCtx, STATIC_PLAYFIELD_CACHE_SLOT.posts);
    } else {
      drawStaticPostsLayer(drawCtx);
    }
    drawDynamicFlippersBallSavesLayer(drawCtx);
    tableModeRuntime?.drawBeforeBall?.(drawCtx);
    drawBall(drawCtx);
    tableModeRuntime?.drawBehindPlayfield?.(drawCtx);
    tableModeRuntime?.draw?.(drawCtx);
    drawDynamicBumpersLayer(drawCtx);
    drawHighScoreParticles(drawCtx);
    drawDebugOverlay(drawCtx);
  }

  function reset() {
    window.RCPAudio?.stopBgm?.();
    secondChanceState.available = false;
    secondChanceState.firstLaunchAtMs = null;
    secondChanceState.elapsedMs = 0;
    score = 0;
    for (let bi = 0; bi < bumpers.length; bi++) bumpers[bi].flash = 0;
    for (let si = 0; si < slingshots.length; si++) slingshots[si].flash = 0;
    for (let ti = 0; ti < targets.length; ti++) {
      targets[ti].flash = 0;
      targets[ti].hitCooldown = 0;
    }
    resetDropTargets();
    resetKickbacks();
    resetBallSaves();
    for (let wbi = 0; wbi < wallBumps.length; wbi++) {
      wallBumps[wbi].flash = 0;
      wallBumps[wbi].hitCooldown = 0;
    }
    resetTopLanes();
    resetOrbitLaneTriggers();
    resetLoopTriggers();
    resetTable777OrbitBonusState();
    resetTable777DelayedSlotMessage();
    resetTable777PendingSlotReward();
    for (let spi = 0; spi < spinners.length; spi++) {
      spinners[spi].spinCount = 0;
      spinners[spi].wasInside = false;
      spinners[spi].pulseRemaining = 0;
      spinners[spi].pulseTimer = 0;
      spinners[spi].pulseOn = false;
      spinners[spi].spinSfxCue = 0;
      spinners[spi].pendingScoreSpins = 0;
      spinners[spi].sfxStepQueue = [];
    }
    ballInPlay = false;
    waitingForLaunch = true;
    launchRequested = false;
    resetStuckDetection();
    const spawn = TABLE?.spawn;
    if (spawn) {
      ball.x = spawn.x;
      ball.y = spawn.y;
    }
    ball.vx = 0;
    ball.vy = 0;

    displayState.message = "";
    displayState.messageTimer = 0;
    displayState.mode = "normal";
    displayState.lastBonusTotal = 0;
    displayState.lastTotalScore = 0;
    displayState.lastLostBall = 0;
    displayState.hintIndex = 0;
    displayState.awaitingFirstLaunchMessage = false;
    displayState.centerValueDisplayUnlocked = false;

    gameState.status = "ready";
    gameState.currentBall = 1;
    gameState.resultInputLock = 0;

    resetRuleState();
    resetLoopBonusState();
    resetLoopRouteState();
    resetOrbitSoundState();
    resetTimedBlockers();
    resetSaucerHoldState();

    highScoreParticles.length = 0;

    nudgeCooldownMs = 0;
    nudgeCountThisGame = 0;

    recordsState.currentGameRecorded = false;
    recordsState.lastInsertedIndex = -1;

    paused = false;
    overlayState.mode = "none";
    overlayState.returnTo = "title";
    resetShotMapState();
    highScoreParticles.length = 0;
    tableModeRuntime?.reset?.();
  }

  function applyTable(table) {
    if (!table) return false;

    resetAssetCache();
    applyRuleConfig(table);
    rebuildTableData(table);
    syncCanvasResolution();
    loadTableAssets();
    initFlippers();
    tableModeRuntime = createTableModeRuntime(table);
    loadRecords();
    reset();

    return true;
  }

  function applySelectedTable() {
    const selectedTableId = getSelectedTableId();
    const selectedTable = getTableById(selectedTableId);

    if (!selectedTable) {
      console.warn("RCP: selected table not found:", selectedTableId);
      return false;
    }

    if (TABLE?.id === selectedTable.id) {
      return true;
    }

    return applyTable(selectedTable);
  }

  function returnToTitle() {
    window.RCPAudio?.stopMelody?.();

    const selectedTable = getTableById(getSelectedTableId());
    if (selectedTable && TABLE?.id !== selectedTable.id) {
      applySelectedTable();
    } else {
      reset();
      loadRecords();
    }

    titleState.active = true;
    overlayState.mode = "none";
    overlayState.returnTo = "title";
    paused = false;
  }

  function update(dt, input) {
    if (input && input.escapePressed) {
      if (!titleState.active) {
        returnToTitle();
        input.escapePressed = false;
        updateBallRollAudio(dt);
        return;
      }
      input.escapePressed = false;
    }

    if (input && input.resetPressed) reset();

    if (titleState.active) {
      if (input) {
        if (overlayState.mode === "howTo" || overlayState.mode === "records") {
          if (
            input.nudgePressed ||
            input.arrowDownPressed ||
            input.launchPressed ||
            input.pausePressed
          ) {
            overlayState.mode = "none";
            input.nudgePressed = false;
            input.arrowDownPressed = false;
            input.launchPressed = false;
            input.pausePressed = false;
          }
        } else {
          if (input.nudgePressed) {
            overlayState.mode = "records";
            overlayState.returnTo = "title";
            input.nudgePressed = false;
          }

          if (input.arrowDownPressed) {
            window.RCPAudio?.warmup?.();
            window.RCPAudio?.playMelody?.("tableConfirm", {
              muted: SFXmute
            });
            applySelectedTable();
            titleState.active = false;
            overlayState.mode = "none";
            input.arrowDownPressed = false;
          }

          if (input.selectLeftPressed) {
            const prevIndex = titleState.selectedTableIndex;
            titleState.selectedTableIndex = Math.max(0, titleState.selectedTableIndex - 1);
            if (titleState.selectedTableIndex !== prevIndex) {
              window.RCPAudio?.warmup?.();
              window.RCPAudio?.play?.("tableSelect", {
                muted: SFXmute
              });
              applySelectedTable();
            }
            input.selectLeftPressed = false;
          }

          if (input.selectRightPressed) {
            const prevIndex = titleState.selectedTableIndex;
            titleState.selectedTableIndex = Math.min(
              TABLE_SELECT_ITEMS.length - 1,
              titleState.selectedTableIndex + 1
            );
            if (titleState.selectedTableIndex !== prevIndex) {
              window.RCPAudio?.warmup?.();
              window.RCPAudio?.play?.("tableSelect", {
                muted: SFXmute
              });
              applySelectedTable();
            }
            input.selectRightPressed = false;
          }

          if (input.launchPressed) {
            window.RCPAudio?.warmup?.();
            window.RCPAudio?.playMelody?.("tableConfirm", {
              muted: SFXmute
            });
            applySelectedTable();
            titleState.active = false;
            overlayState.mode = "none";
            input.launchPressed = false;
          }
        }
      }
      updateBallRollAudio(dt);
      return;
    }

    if (input) {
      if (overlayState.mode === "howTo" || overlayState.mode === "records") {
        if (
          input.nudgePressed ||
          input.arrowDownPressed ||
          input.launchPressed ||
          input.pausePressed
        ) {
          if (overlayState.returnTo === "pauseHub") {
            overlayState.mode = "pauseHub";
          } else {
            overlayState.mode = "none";
          }
          input.nudgePressed = false;
          input.arrowDownPressed = false;
          input.launchPressed = false;
          input.pausePressed = false;
        }
        syncFlipperInput(input);
        updateBallRollAudio(dt);
        return;
      }

      if (overlayState.mode === "pauseHub") {
        if (input.arrowDownPressed) {
          overlayState.mode = "howTo";
          overlayState.returnTo = "pauseHub";
          input.arrowDownPressed = false;
        }

        if (input.nudgePressed) {
          overlayState.mode = "records";
          overlayState.returnTo = "pauseHub";
          input.nudgePressed = false;
        }

        if (input.launchPressed || input.pausePressed) {
          overlayState.mode = "none";
          paused = false;
          window.RCPAudio?.setBgmPaused?.(false);
          input.launchPressed = false;
          input.pausePressed = false;
        }

        syncFlipperInput(input);
        updateBallRollAudio(dt);
        return;
      }

      if (input.pausePressed) {
        overlayState.mode = "pauseHub";
        paused = true;
        window.RCPAudio?.setBgmPaused?.(true);
        input.pausePressed = false;
      }
    }

    syncFlipperInput(input);

    const canOpenRecordsDirectly =
      gameState.status === "ready" ||
      gameState.status === "gameOver";

    if (input && input.nudgePressed && canOpenRecordsDirectly) {
      overlayState.mode = "records";
      overlayState.returnTo = "game";
      input.nudgePressed = false;
      updateBallRollAudio(dt);
      return;
    }

    if (input && input.nudgePressed) tryNudge();

    if (input && (input.launchPressed || input.arrowDownPressed)) {
      launchRequested = true;
      input.arrowDownPressed = false;
    }

    if (launchRequested) {
      if (gameState.status === "gameOver") {
        if (gameState.resultInputLock <= 0) {
          reset();
        }
      } else if (waitingForLaunch) {
        const handledByTableMode =
          tableModeRuntime?.handleLaunchRequest?.() === true;
        if (!handledByTableMode) launchBall();
      } else if (stuckRelaunchAvailable) {
        launchBall();
      }
      launchRequested = false;
    }

    if (!paused) {
      pinballFixedUpdate(dt);
      updateStuckDetection(dt * 1000);
      updateHighScoreParticles(dt * 1000);
      updateDisplayState();

      if (gameState.resultInputLock > 0) {
        gameState.resultInputLock--;
      }
    }

    updateBallRollAudio(dt);
  }

  function draw(drawCtx) {
    const playfieldUiLayout = getPlayfieldUiLayout();

    drawCtx.fillStyle = CANVAS_BACKGROUND_COLOR;
    drawCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawPlayfieldMask(drawCtx);
    drawCenterValueDoublerIndicator(drawCtx);
    drawPlayfieldDisplay(drawCtx);
    drawBallStatus(drawCtx);
    drawPinballScene(drawCtx);

    if (!titleState.active && overlayState.mode !== "howTo" && overlayState.mode !== "records") {
      if (paused && overlayState.mode === "pauseHub") {
        drawCtx.save();
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = "900 42px system-ui, sans-serif";
        drawCtx.fillStyle = "#fff";
        drawPromptText(drawCtx, "PAUSED", CANVAS_W / 2, playfieldUiLayout.pausedPromptY);
        drawCtx.restore();
        drawPauseGuidePrompt(drawCtx);
      } else if (stuckRelaunchAvailable) {
        drawCtx.save();
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = "700 24px system-ui, sans-serif";
        drawCtx.fillStyle = "#fff";
        drawPromptText(
          drawCtx,
          "PRESS LAUNCH TO RELAUNCH",
          CANVAS_W / 2,
          playfieldUiLayout.relaunchPromptY
        );
        drawCtx.restore();
      } else if (
        waitingForLaunch &&
        tableModeRuntime?.shouldShowLaunchPrompt?.() !== false
      ) {
        drawCtx.save();
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = "900 32px system-ui, sans-serif";
        drawCtx.fillStyle = "#fff";
        drawPromptText(
          drawCtx,
          getLaunchPromptText(),
          CANVAS_W / 2,
          playfieldUiLayout.launchPromptY
        );
        drawCtx.restore();

        if (gameState.status === "gameOver" && gameState.resultInputLock <= 0) {
          drawLaunchRestartPrompt(drawCtx);
        }
      }
    }

    if (titleState.active) {
      drawTitleOverlay(drawCtx);
    }

    if (overlayState.mode === "howTo") {
      drawHowToOverlay(drawCtx);
    } else if (overlayState.mode === "records") {
      drawRecordsOverlay(drawCtx);
    }

    syncRsgLinkVisibility();
  }

  let rsgLinkElement = null;
  let rsgLinkVisible = null;

  function syncRsgLinkVisibility() {
    if (!rsgLinkElement) {
      rsgLinkElement = document.getElementById("rsg-link");
    }

    if (!rsgLinkElement) return;

    const shouldShow =
      titleState.active &&
      overlayState.mode === "none";

    if (rsgLinkVisible === shouldShow) return;

    rsgLinkVisible = shouldShow;
    rsgLinkElement.classList.toggle("is-visible", shouldShow);
    rsgLinkElement.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    rsgLinkElement.tabIndex = shouldShow ? 0 : -1;
  }

  function bindRsgLinkInputGuard() {
    if (!rsgLinkElement) {
      rsgLinkElement = document.getElementById("rsg-link");
    }
    if (!rsgLinkElement) return;

    const stopPropagationOnly = (e) => {
      e.stopPropagation();
    };

    rsgLinkElement.addEventListener("pointerdown", stopPropagationOnly);
    rsgLinkElement.addEventListener("click", stopPropagationOnly);
  }

  function createEmptyInputState() {
    return {
      leftFlipper: false,
      rightFlipper: false,
      launchPressed: false,
      nudgePressed: false,
      pausePressed: false,
      resetPressed: false,
      escapePressed: false,
      selectLeftPressed: false,
      selectRightPressed: false,
      arrowDownPressed: false
    };
  }

  const keyboardInput = {
    leftFlipper: false,
    rightFlipper: false,
    launchPressed: false,
    nudgePressed: false,
    pausePressed: false,
    resetPressed: false,
    escapePressed: false,
    selectLeftPressed: false,
    selectRightPressed: false,
    arrowDownPressed: false
  };

  const TOUCH_AREAS = {
    escape: {
      x: 0,
      y: 0,
      w: 740,
      h: 202
    },
    pause: {
      x: 0,
      y: 202,
      w: 740,
      h: 377
    },
    nudge: {
      x: 0,
      y: 579,
      w: 740,
      h: 201
    },
    left: {
      x: 0,
      y: 780,
      w: 247,
      h: 500
    },
    primary: {
      x: 249,
      y: 780,
      w: 243,
      h: 500
    },
    right: {
      x: 492,
      y: 780,
      w: 248,
      h: 500
    }
  };

  const touchInput = {
    leftFlipper: false,
    rightFlipper: false,
    launchPressed: false,
    nudgePressed: false,
    pausePressed: false,
    escapePressed: false,
    selectLeftPressed: false,
    selectRightPressed: false,
    arrowDownPressed: false
  };

  const leftFlipperPointerIds = new Set();
  const rightFlipperPointerIds = new Set();
  const activeTouchPointers = new Map();

  function pollKeyboardInput(input) {
    input.leftFlipper = keyboardInput.leftFlipper;
    input.rightFlipper = keyboardInput.rightFlipper;
    input.launchPressed = keyboardInput.launchPressed;
    input.nudgePressed = keyboardInput.nudgePressed;
    input.pausePressed = keyboardInput.pausePressed;
    input.resetPressed = keyboardInput.resetPressed;
    input.escapePressed = keyboardInput.escapePressed;
    input.selectLeftPressed = keyboardInput.selectLeftPressed;
    input.selectRightPressed = keyboardInput.selectRightPressed;
    input.arrowDownPressed = keyboardInput.arrowDownPressed;

    keyboardInput.launchPressed = false;
    keyboardInput.nudgePressed = false;
    keyboardInput.pausePressed = false;
    keyboardInput.resetPressed = false;
    keyboardInput.escapePressed = false;
    keyboardInput.selectLeftPressed = false;
    keyboardInput.selectRightPressed = false;
    keyboardInput.arrowDownPressed = false;
  }

  function pollGamepadInput(input) {
    // Future: map Gamepad API buttons/axes to abstract input.
  }

  function pollTouchInput(input) {
    input.leftFlipper = input.leftFlipper || touchInput.leftFlipper;
    input.rightFlipper = input.rightFlipper || touchInput.rightFlipper;
    input.launchPressed = input.launchPressed || touchInput.launchPressed;
    input.nudgePressed = input.nudgePressed || touchInput.nudgePressed;
    input.pausePressed = input.pausePressed || touchInput.pausePressed;
    input.escapePressed = input.escapePressed || touchInput.escapePressed;
    input.selectLeftPressed = input.selectLeftPressed || touchInput.selectLeftPressed;
    input.selectRightPressed = input.selectRightPressed || touchInput.selectRightPressed;
    input.arrowDownPressed = input.arrowDownPressed || touchInput.arrowDownPressed;

    touchInput.launchPressed = false;
    touchInput.nudgePressed = false;
    touchInput.pausePressed = false;
    touchInput.escapePressed = false;
    touchInput.selectLeftPressed = false;
    touchInput.selectRightPressed = false;
    touchInput.arrowDownPressed = false;
  }

  function pollInput() {
    const input = createEmptyInputState();
    pollKeyboardInput(input);
    pollGamepadInput(input);
    pollTouchInput(input);
    return input;
  }

  function getCanvasLogicalPoint(clientX, clientY) {
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return null;
    }

    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height)
    };
  }

  function getTouchAreaAt(x, y) {
    for (const [name, rect] of Object.entries(TOUCH_AREAS)) {
      if (
        x >= rect.x &&
        x < rect.x + rect.w &&
        y >= rect.y &&
        y < rect.y + rect.h
      ) {
        return name;
      }
    }
    return null;
  }

  function syncTouchFlipperHeldState() {
    touchInput.leftFlipper = leftFlipperPointerIds.size > 0;
    touchInput.rightFlipper = rightFlipperPointerIds.size > 0;
  }

  function clearTouchOneShotInput() {
    touchInput.launchPressed = false;
    touchInput.nudgePressed = false;
    touchInput.pausePressed = false;
    touchInput.escapePressed = false;
    touchInput.selectLeftPressed = false;
    touchInput.selectRightPressed = false;
    touchInput.arrowDownPressed = false;
  }

  function clearAllTouchInput() {
    leftFlipperPointerIds.clear();
    rightFlipperPointerIds.clear();
    activeTouchPointers.clear();
    touchInput.leftFlipper = false;
    touchInput.rightFlipper = false;
    clearTouchOneShotInput();
  }

  function releaseTouchPointer(pointerId) {
    const tracked = activeTouchPointers.get(pointerId);
    if (!tracked) return;

    if (tracked.heldAction === "leftFlipper") {
      leftFlipperPointerIds.delete(pointerId);
    } else if (tracked.heldAction === "rightFlipper") {
      rightFlipperPointerIds.delete(pointerId);
    }

    activeTouchPointers.delete(pointerId);
    syncTouchFlipperHeldState();
  }

  function trySetPointerCapture(pointerId) {
    if (!canvas || typeof canvas.setPointerCapture !== "function") return;
    try {
      canvas.setPointerCapture(pointerId);
    } catch (_) {
      // Ignore browser/pointer capture differences.
    }
  }

  function onTouchPointerDown(e) {
    if (!canvas || e.target !== canvas) return;
    if (e.pointerType !== "touch") return;
    if (activeTouchPointers.has(e.pointerId)) return;

    window.RCPAudio?.unlock?.();

    const point = getCanvasLogicalPoint(e.clientX, e.clientY);
    if (!point) return;

    const area = getTouchAreaAt(point.x, point.y);
    if (!area) return;

    e.preventDefault();
    trySetPointerCapture(e.pointerId);

    let heldAction = null;

    if (area === "escape") {
      touchInput.escapePressed = true;
    } else if (area === "pause") {
      touchInput.pausePressed = true;
    } else if (area === "nudge") {
      touchInput.nudgePressed = true;
    } else if (area === "left") {
      if (titleState.active) {
        touchInput.selectLeftPressed = true;
      } else {
        heldAction = "leftFlipper";
        leftFlipperPointerIds.add(e.pointerId);
        syncTouchFlipperHeldState();
      }
    } else if (area === "right") {
      if (titleState.active) {
        touchInput.selectRightPressed = true;
      } else {
        heldAction = "rightFlipper";
        rightFlipperPointerIds.add(e.pointerId);
        syncTouchFlipperHeldState();
      }
    } else if (area === "primary") {
      window.RCPAudio?.warmup?.();
      if (overlayState.mode === "pauseHub") {
        touchInput.arrowDownPressed = true;
      } else {
        touchInput.launchPressed = true;
      }
    }

    activeTouchPointers.set(e.pointerId, {
      area,
      heldAction
    });
  }

  function onTouchPointerEnd(e) {
    releaseTouchPointer(e.pointerId);
  }

  function onTouchVisibilityChange() {
    if (document.visibilityState === "hidden") {
      clearAllTouchInput();
    }
  }

  let touchInputBound = false;

  function bindTouchInput() {
    if (touchInputBound || !canvas) return;
    touchInputBound = true;

    canvas.addEventListener("pointerdown", onTouchPointerDown, { passive: false });
    canvas.addEventListener("pointerup", onTouchPointerEnd);
    canvas.addEventListener("pointercancel", onTouchPointerEnd);
    canvas.addEventListener("lostpointercapture", onTouchPointerEnd);
    canvas.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    window.addEventListener("blur", clearAllTouchInput);
    document.addEventListener("visibilitychange", onTouchVisibilityChange);
  }

  let canvasResolutionSyncBound = false;

  function bindCanvasResolutionSync() {
    if (canvasResolutionSyncBound) return;
    canvasResolutionSyncBound = true;

    window.addEventListener("resize", syncCanvasResolution);
    window.addEventListener("orientationchange", syncCanvasResolution);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncCanvasResolution);
    }
  }

  function bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      window.RCPAudio?.unlock?.();

      const k = e.key;
      const code = e.code;

      if (k === "ArrowLeft" || code === "ShiftLeft") {
        if (titleState.active) {
          keyboardInput.selectLeftPressed = true;
        } else {
          keyboardInput.leftFlipper = true;
        }
        e.preventDefault();
      } else if (k === "ArrowRight" || code === "ShiftRight") {
        if (titleState.active) {
          keyboardInput.selectRightPressed = true;
        } else {
          keyboardInput.rightFlipper = true;
        }
        e.preventDefault();
      } else if (k === "r" || k === "R") {
        keyboardInput.resetPressed = true;
        e.preventDefault();
      } else if (k === " ") {
        if (!e.repeat) keyboardInput.pausePressed = true;
        e.preventDefault();
      } else if (k === "ArrowDown") {
        window.RCPAudio?.warmup?.();
        keyboardInput.arrowDownPressed = true;
        e.preventDefault();
      } else if (k === "Enter") {
        window.RCPAudio?.warmup?.();
        keyboardInput.launchPressed = true;
        e.preventDefault();
      } else if (k === "ArrowUp" || code === "KeyZ") {
        if (!e.repeat) keyboardInput.nudgePressed = true;
        e.preventDefault();
      } else if (k === "Escape") {
        keyboardInput.escapePressed = true;
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("keyup", (e) => {
      const k = e.key;
      const code = e.code;

      if (k === "ArrowLeft" || code === "ShiftLeft") {
        if (!titleState.active) {
          keyboardInput.leftFlipper = false;
        }
      } else if (k === "ArrowRight" || code === "ShiftRight") {
        if (!titleState.active) {
          keyboardInput.rightFlipper = false;
        }
      }
    });
  }


  let loopStarted = false;

  function startLoop() {
    if (loopStarted || !ctx) return;
    loopStarted = true;

    const FPS_TARGET = 60;
    const FRAME_MS = 1000 / FPS_TARGET;
    const GAME_TIME_SCALE = 0.85;
    const MAX_UPDATES_PER_FRAME = 2;

    let last = performance.now();
    let acc = 0;

    function loop(now) {
      const d = now - last;
      last = now;
      acc += d;

      const input = pollInput();

      let updates = 0;

      while (acc >= FRAME_MS && updates < MAX_UPDATES_PER_FRAME) {
        const dt = (FRAME_MS / 1000) * GAME_TIME_SCALE;
        update(dt, input);
        acc -= FRAME_MS;
        updates++;
      }

      if (updates >= MAX_UPDATES_PER_FRAME) {
        acc = 0;
      }

      draw(ctx);
      requestAnimationFrame(loop);
    }

    requestAnimationFrame((t) => {
      last = t;
      requestAnimationFrame(loop);
    });
  }

  window.RCPGame = {
    init(canvasEl, table) {
      if (!canvasEl || !table) {
        throw new Error("RCPGame.init requires canvas and table.");
      }
      canvas = canvasEl;
      ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("RCPGame.init: 2d context unavailable.");

      applyTable(table);
      paused = false;
      overlayState.mode = "none";
      overlayState.returnTo = "title";
      return window.RCPGame;
    },
    reset,
    update,
    draw,
    get paused() { return paused; },
    set paused(v) {
      paused = !!v;
      window.RCPAudio?.setBgmPaused?.(paused);
    }
  };

  function autoStart() {
    const canvasEl = document.getElementById("game");
    const table = window.RCP_TABLES?.table1;
    if (!canvasEl || !table) return;
    window.RCPGame.init(canvasEl, table);
    bindCanvasResolutionSync();
    bindKeyboard();
    bindTouchInput();
    bindRsgLinkInputGuard();
    syncRsgLinkVisibility();
    startLoop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoStart);
  } else {
    autoStart();
  }
})();
