(() => {
  "use strict";

  window.RCP_TABLES = window.RCP_TABLES || {};

  const LANE_X = [123.2, 246.6, 370, 493.4, 616.8];
  const ROW_Y = [150, 230, 310, 390, 470, 550, 630, 710];
  const START_ROW = 2;
  const RAIDER_RADIUS = 30;
  const BASE_Y = 40;
  const RAIDER_BASE_POINTS = [
    { x: 0, y: 0 },
    { x: 740, y: 0 },
    { x: 740, y: 100 },
    { x: 616.8, y: 80 },
    { x: 493.4, y: 100 },
    { x: 370, y: 80 },
    { x: 246.6, y: 100 },
    { x: 123.2, y: 80 },
    { x: 0, y: 100 }
  ];
  const DESCENT_INTERVAL_MS = 4080;
  const HARD_DESCENT_INTERVAL_MS = 3245;
  const WAVE_1_BGM_BPM = 100;
  const WAVE_2_BGM_BPM = 110;
  const RESPAWN_DELAY_MS = 1200;
  const RESPAWN_MOVE_MS = 800;
  const WAVE_START_MOVE_MS = 800;
  const BALL_RETURN_DELAY_MS = 1100;
  const PUSH_MOVE_MS = 180;
  const STRONG_PUSH_MOVE_MS = 240;
  const PUSH_SPEED_MIN = 12;
  const STRONG_PUSH_SPEED_MIN = 28;
  const WAVE_BLAST_PUSH_ROWS = 2;
  const MINI_BLAST_PUSH_ROWS = 1;
  const MINI_BLAST_MIN_ROW = ROW_Y.length - 2;
  const BLAST_PULSE_RADIUS = 30;
  const BLAST_PULSE_DURATION_MS = 180;
  const BLAST_ROW_INTERVAL_MS = 70;
  const BLAST_COLOR = "#2fb";
  const MINI_BLAST_TARGET_IDS = [
    "mini_blast_target_left",
    "mini_blast_target_right"
  ];
  const POWER_PUSH_DURATION_MS = 8000;
  const POWER_PUSH_BONUS_ROWS = 1;
  const HARD_MODE_PUSH_BONUS_ROWS = 1;
  const BONUS_RADIUS = 20;
  const BONUS_COLOR = "#b12";
  const BONUS_START_Y = BASE_Y;
  const BONUS_END_Y = 710;
  const BONUS_DESCENT_MS = 1400;
  const BONUS_SCORE = 200;
  const RAIDER_SPRITE_SRC = "./svg/raiders.png";
  const INDICATOR_OVERLAY_SRC = "./svg/CosmoRaiders_indicators.svg";
  const INDICATOR_CLIPS = {
    mini_blast_target_left: { x: 28, y: 599, w: 32, h: 63 },
    mini_blast_target_right: { x: 680, y: 599, w: 32, h: 63 },
    cosmo_drop_1: { x: 161, y: 121, w: 47, h: 41 },
    cosmo_drop_2: { x: 290, y: 122, w: 36, h: 39 },
    cosmo_drop_3: { x: 414, y: 122, w: 35, h: 40 },
    cosmo_drop_4: { x: 542, y: 122, w: 26, h: 39 },
    power_push_left_1: { x: 40, y: 129, w: 27, h: 68 },
    power_push_left_2: { x: 40, y: 196, w: 27, h: 41 },
    power_push_right_1: { x: 673, y: 143, w: 26, h: 39 },
    power_push_right_2: { x: 673, y: 183, w: 26, h: 41 }
  };
  const DROP_TARGET_INDICATOR_IDS = [
    "cosmo_drop_1",
    "cosmo_drop_2",
    "cosmo_drop_3",
    "cosmo_drop_4",
    "power_push_left_1",
    "power_push_left_2",
    "power_push_right_1",
    "power_push_right_2"
  ];
  const RAIDER_SPRITE_SIZE = 16;
  const RAIDER_SPRITE_SCALE = 4;
  const RAIDER_SPRITE_DRAW_SIZE =
    RAIDER_SPRITE_SIZE * RAIDER_SPRITE_SCALE;
  const RAIDER_SPRITE_FRAMES = {
    enm1: 0,
    pushback: 16,
    bonus: 32,
    enm2: 48,
    enm3: 64,
    enemy1: 80,
    enemy2: 96,
    enemy3: 112
  };
  const RAIDER_LANE_SPRITES = ["enm3", "enm2", "enm1", "enm2", "enm3"];
  const HARD_RAIDER_LANE_SPRITES = ["enemy3", "enemy2", "enemy1", "enemy2", "enemy3"];
  const COMBINATION_WINDOW_MS = 700;
  const COMBINATION_HITS_REQUIRED = 3;
  const COMBINATION_BONUS_SCORE = 100;
  const WAVE_COUNT = 2;
  const WAVE_DURATION_MS = 90000;
  const WAVE_1_DISPLAY_DURATION_SECONDS = 90;
  const WAVE_2_DISPLAY_DURATION_SECONDS = 80;
  const WAVE_END_MOVE_MS = 700;
  const WAVE_END_TOTAL_MS = 2200;
  const WAVE_LABEL_X = 210;
  const TIME_LABEL_X = 410;
  const WAVE_TIMER_Y = 775;
  const WAVE_MESSAGE_Y = 660;
  const DANGER_MAX = 3;

  function createRuntime(api) {
    const raiderSprite = typeof Image === "function" ? new Image() : null;
    let raiderSpriteReady = false;
    if (raiderSprite) {
      raiderSprite.onload = () => {
        raiderSpriteReady = true;
      };
      raiderSprite.src = RAIDER_SPRITE_SRC;
    }

    const indicatorOverlay = typeof Image === "function" ? new Image() : null;
    let indicatorOverlayReady = false;
    if (indicatorOverlay) {
      indicatorOverlay.onload = () => {
        indicatorOverlayReady = true;
      };
      indicatorOverlay.src = INDICATOR_OVERLAY_SRC;
    }

    const raiders = LANE_X.map((x, laneIndex) => ({
      laneIndex,
      x,
      rowIndex: START_ROW,
      visualY: ROW_Y[START_ROW],
      active: true,
      state: "normal",
      respawnTimerMs: 0,
      moveFromY: ROW_Y[START_ROW],
      moveToY: ROW_Y[START_ROW],
      moveElapsedMs: 0,
      moveDurationMs: PUSH_MOVE_MS,
      bonusActive: false,
      bonusY: BONUS_START_Y,
      bonusElapsedMs: 0,
      waveEndFromY: ROW_Y[START_ROW]
    }));

    let danger = 0;
    let descentTimerMs = DESCENT_INTERVAL_MS;
    let ballReturnTimerMs = 0;
    let powerPushTimerMs = 0;
    let combinationHitCount = 0;
    let combinationTimerMs = 0;

    function getWaveBgmPlaybackRate() {
      return currentWave >= 2
        ? WAVE_2_BGM_BPM / WAVE_1_BGM_BPM
        : 1;
    }

    function getWaveDurationMs() {
      const duration = api.getBgmDurationMs?.();
      const baseDurationMs = Number.isFinite(duration) && duration > 0
        ? duration
        : WAVE_DURATION_MS;
      return baseDurationMs / getWaveBgmPlaybackRate();
    }

    let currentWave = 1;

    function getDescentIntervalMs() {
      return currentWave >= 2
        ? HARD_DESCENT_INTERVAL_MS
        : DESCENT_INTERVAL_MS;
    }

    function getHardModePushBonusRows() {
      return currentWave >= 2 ? HARD_MODE_PUSH_BONUS_ROWS : 0;
    }

    let waveTimerMs = getWaveDurationMs();
    let waveEndActive = false;
    let waveEndElapsedMs = 0;
    let waveResultLine2 = "";
    let waveStartActive = false;
    let waveStartElapsedMs = 0;
    const blastSequences = [];
    const miniBlastTargetHits = Object.fromEntries(
      MINI_BLAST_TARGET_IDS.map(id => [id, false])
    );

    function resetMiniBlastTargets() {
      for (const id of MINI_BLAST_TARGET_IDS) {
        miniBlastTargetHits[id] = false;
      }
    }

    function resetCombination() {
      combinationHitCount = 0;
      combinationTimerMs = 0;
    }

    function registerCombinationHit() {
      if (combinationHitCount === 0) {
        combinationTimerMs = COMBINATION_WINDOW_MS;
      }

      combinationHitCount++;
      if (combinationHitCount < COMBINATION_HITS_REQUIRED) return;

      api.addScore(COMBINATION_BONUS_SCORE, "cosmo combination bonus");
      api.showMessage("COMBINATION BONUS " + COMBINATION_BONUS_SCORE, 90);
      api.playMelody?.("bonusGain");
      resetCombination();
    }

    function onNonEnemyCollision() {
      resetCombination();
    }

    function getDefendedBonus() {
      if (danger <= 0) return { label: "PERFECT DEFENSE", score: 1000 };
      if (danger === 1) return { label: "DEFENDED", score: 600 };
      return { label: "NARROW DEFENSE", score: 300 };
    }

    function beginWaveEnd(succeeded) {
      if (waveEndActive) return;

      api.stopBgm?.();
      waveEndActive = true;
      waveEndElapsedMs = 0;
      ballReturnTimerMs = 0;
      powerPushTimerMs = 0;
      blastSequences.length = 0;
      resetCombination();
      resetMiniBlastTargets();
      api.setBallInactive();
      api.resetWavePlayfield();

      if (succeeded) {
        api.playSfx?.("turnBack");
        const bonus = getDefendedBonus();
        api.addScore(bonus.score, "cosmo defended bonus");
        waveResultLine2 = bonus.label + " " + bonus.score;
      } else {
        waveResultLine2 = "FAILED";
      }

      for (const raider of raiders) {
        raider.bonusActive = false;
        if (!raider.active) continue;
        raider.waveEndFromY = raider.visualY;
        raider.state = "waveEnd";
      }
    }

    function updateWaveEnd(dtMs) {
      waveEndElapsedMs = Math.min(
        WAVE_END_TOTAL_MS,
        waveEndElapsedMs + dtMs
      );

      const moveProgress = Math.min(1, waveEndElapsedMs / WAVE_END_MOVE_MS);
      const eased = moveProgress * moveProgress * moveProgress;
      for (const raider of raiders) {
        if (!raider.active || raider.state !== "waveEnd") continue;
        raider.visualY = raider.waveEndFromY +
          (BASE_Y - raider.waveEndFromY) * eased;
      }

      if (waveEndElapsedMs < WAVE_END_TOTAL_MS) return;

      if (currentWave >= WAVE_COUNT) {
        waveEndActive = false;
        api.finishGame();
        return;
      }

      currentWave++;
      danger = 0;
      waveTimerMs = getWaveDurationMs();
      waveEndActive = false;
      waveEndElapsedMs = 0;
      waveResultLine2 = "";
      prepareWaveLaunchFormation();
      api.prepareBallLaunch();
    }

    function resetRaider(raider) {
      raider.rowIndex = START_ROW;
      raider.visualY = ROW_Y[START_ROW];
      raider.active = true;
      raider.state = "normal";
      raider.respawnTimerMs = 0;
      raider.moveFromY = raider.visualY;
      raider.moveToY = raider.visualY;
      raider.moveElapsedMs = 0;
      raider.moveDurationMs = PUSH_MOVE_MS;
      raider.bonusActive = false;
      raider.bonusY = BONUS_START_Y;
      raider.bonusElapsedMs = 0;
      raider.waveEndFromY = raider.visualY;
    }

    function resetFormation() {
      for (const raider of raiders) resetRaider(raider);
      descentTimerMs = getDescentIntervalMs();
    }

    function prepareWaveLaunchFormation() {
      resetFormation();
      waveStartActive = false;
      waveStartElapsedMs = 0;
      for (const raider of raiders) {
        raider.visualY = BASE_Y;
        raider.state = "waveReady";
        raider.moveFromY = BASE_Y;
        raider.moveToY = ROW_Y[START_ROW];
      }
    }

    function handleLaunchRequest() {
      if (waveEndActive || waveStartActive) return true;
      if (api.getGameStatus() !== "ready") return false;

      waveStartActive = true;
      waveStartElapsedMs = 0;
      api.playSfx?.("positioning");
      for (const raider of raiders) {
        if (!raider.active) continue;
        raider.visualY = BASE_Y;
        raider.state = "waveStart";
      }
      return true;
    }

    function updateWaveStart(dtMs) {
      waveStartElapsedMs = Math.min(
        WAVE_START_MOVE_MS,
        waveStartElapsedMs + dtMs
      );
      const progress = WAVE_START_MOVE_MS > 0
        ? waveStartElapsedMs / WAVE_START_MOVE_MS
        : 1;
      const eased = 1 - Math.pow(1 - progress, 3);

      for (const raider of raiders) {
        if (!raider.active || raider.state !== "waveStart") continue;
        raider.visualY = BASE_Y +
          (ROW_Y[START_ROW] - BASE_Y) * eased;
      }

      if (progress < 1) return;

      waveStartActive = false;
      waveStartElapsedMs = 0;
      for (const raider of raiders) {
        if (!raider.active) continue;
        raider.visualY = ROW_Y[START_ROW];
        raider.state = "normal";
      }
      descentTimerMs = getDescentIntervalMs();
      api.launchBall({
        bgmPlaybackRate: getWaveBgmPlaybackRate(),
        bgmLayers: currentWave >= 2 ? ["wave2"] : []
      });
    }

    function reset() {
      danger = 0;
      ballReturnTimerMs = 0;
      powerPushTimerMs = 0;
      blastSequences.length = 0;
      currentWave = 1;
      waveTimerMs = getWaveDurationMs();
      waveEndActive = false;
      waveEndElapsedMs = 0;
      waveResultLine2 = "";
      resetCombination();
      resetMiniBlastTargets();
      prepareWaveLaunchFormation();
    }

    function removeRaider(raider) {
      raider.active = false;
      raider.state = "inactive";
      raider.respawnTimerMs = RESPAWN_DELAY_MS;
      raider.bonusActive = false;
    }

    function registerDanger(raider) {
      removeRaider(raider);
      danger++;
      api.playSfx?.("damage");

      if (danger >= DANGER_MAX) {
        beginWaveEnd(false);
        return true;
      }

      api.showMessage(
        "CITIES " + (DANGER_MAX - danger) + "/" + DANGER_MAX,
        90
      );
      return false;
    }

    function stepRaidersDown() {
      let moved = false;
      for (const raider of raiders) {
        if (!raider.active || raider.state !== "normal") continue;

        moved = true;
        raider.rowIndex++;
        if (raider.rowIndex >= ROW_Y.length && registerDanger(raider)) {
          return;
        }
        if (raider.active) raider.visualY = ROW_Y[raider.rowIndex];
      }
      if (moved) api.playSfx?.("descent");
    }

    function updatePushAnimation(raider, dtMs) {
      raider.moveElapsedMs = Math.min(
        raider.moveDurationMs,
        raider.moveElapsedMs + dtMs
      );
      const progress = raider.moveDurationMs > 0
        ? raider.moveElapsedMs / raider.moveDurationMs
        : 1;
      const eased = 1 - Math.pow(1 - progress, 3);
      raider.visualY = raider.moveFromY +
        (raider.moveToY - raider.moveFromY) * eased;

      if (progress < 1) return;

      if (raider.rowIndex < 0) {
        raider.state = "baseWait";
        raider.visualY = BASE_Y;
        raider.respawnTimerMs = BONUS_DESCENT_MS;
        raider.bonusActive = true;
        raider.bonusY = BONUS_START_Y;
        raider.bonusElapsedMs = 0;
      } else {
        raider.state = "normal";
        raider.visualY = ROW_Y[raider.rowIndex];
      }
    }

    function startRespawnAnimation(raider) {
      api.playSfx?.("positioning");
      raider.rowIndex = START_ROW;
      raider.state = "respawn";
      raider.moveFromY = BASE_Y;
      raider.moveToY = ROW_Y[START_ROW];
      raider.moveElapsedMs = 0;
      raider.moveDurationMs = RESPAWN_MOVE_MS;
      raider.respawnTimerMs = 0;
    }

    function updateRespawnAnimation(raider, dtMs) {
      raider.moveElapsedMs = Math.min(
        raider.moveDurationMs,
        raider.moveElapsedMs + dtMs
      );
      const progress = raider.moveDurationMs > 0
        ? raider.moveElapsedMs / raider.moveDurationMs
        : 1;
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      raider.visualY = raider.moveFromY +
        (raider.moveToY - raider.moveFromY) * eased;

      if (progress < 1) return;

      raider.state = "normal";
      raider.visualY = ROW_Y[START_ROW];
    }

    function startRaiderPush(raider, pushRows, source) {
      const isPushable = raider.active && (
        raider.state === "normal" ||
        (raider.state === "push" && raider.rowIndex >= 0)
      );
      if (!isPushable) return false;

      const fromY = raider.visualY;
      raider.rowIndex -= pushRows;
      raider.state = "push";
      raider.moveFromY = fromY;
      raider.moveToY = raider.rowIndex < 0 ? BASE_Y : ROW_Y[raider.rowIndex];
      raider.moveElapsedMs = 0;
      raider.moveDurationMs = pushRows >= 2 ? STRONG_PUSH_MOVE_MS : PUSH_MOVE_MS;

      if (raider.rowIndex < 0) {
        api.addScore(200, "cosmo raider defeated");
        api.playSfx?.("turnBack");
        if (source === "ball") api.showMessage("RAIDER DOWN", 60);
      } else if (source === "ball") {
        api.addScore(20 * pushRows, "cosmo raider pushback");
        api.showMessage(
          pushRows > 1 ? "PUSHBACK x" + pushRows : "PUSHBACK",
          45
        );
      }

      return true;
    }

    function fireBlastRow(sequence, rowIndex) {
      for (const target of sequence.targets) {
        if (target.rowIndex !== rowIndex) continue;
        startRaiderPush(target.raider, sequence.pushRows, sequence.source);
      }
    }

    function updateBlastSequence(sequence, dtMs) {
      sequence.elapsedMs += dtMs;

      for (let index = 0; index < sequence.rowIndices.length; index++) {
        if (sequence.firedRows.has(index)) continue;
        if (sequence.elapsedMs < index * BLAST_ROW_INTERVAL_MS) continue;

        sequence.firedRows.add(index);
        fireBlastRow(sequence, sequence.rowIndices[index]);
      }
    }

    function updateBlastSequences(dtMs) {
      for (let index = blastSequences.length - 1; index >= 0; index--) {
        const sequence = blastSequences[index];
        updateBlastSequence(sequence, dtMs);

        const lastPulseStartMs =
          (sequence.rowIndices.length - 1) * BLAST_ROW_INTERVAL_MS;
        if (sequence.elapsedMs >= lastPulseStartMs + BLAST_PULSE_DURATION_MS) {
          blastSequences.splice(index, 1);
        }
      }
    }

    function startBlastSequence(rowIndices, pushRows, source) {
      const rowSet = new Set(rowIndices);
      const sequence = {
        elapsedMs: 0,
        rowIndices: [...rowIndices],
        pushRows,
        source,
        firedRows: new Set(),
        targets: raiders
          .filter(raider => raider.active && rowSet.has(raider.rowIndex))
          .map(raider => ({ raider, rowIndex: raider.rowIndex }))
      };

      blastSequences.push(sequence);
      updateBlastSequence(sequence, 0);
    }

    function onDropTargetBankComplete(group) {
      if (group === "powerPush") {
        api.addScore(50, "cosmo power push bank complete");
        powerPushTimerMs = POWER_PUSH_DURATION_MS;
        api.showMessage("POWER PUSH", 90);
        return;
      }

      if (group !== "cosmoAttack") return;
      
      api.addScore(50, "cosmo attack bank complete");
      api.playSfx?.("waveBlast");

      for (const raider of raiders) {
        if (raider.bonusActive) defeatBonusEnemy(raider);
      }
      startBlastSequence(
        [...ROW_Y.keys()].reverse(),
        WAVE_BLAST_PUSH_ROWS,
        "waveBlast"
      );
      api.showMessage("WAVE BLAST", 90);
    }

    function onTargetHit(targetId) {
      if (!Object.hasOwn(miniBlastTargetHits, targetId)) return;

      miniBlastTargetHits[targetId] = true;
      const bankComplete = MINI_BLAST_TARGET_IDS.every(
        id => miniBlastTargetHits[id]
      );
      if (!bankComplete) return;
      
      api.addScore(20, "cosmo mini blast bank complete");
      api.playSfx?.("miniBlast");

      for (const raider of raiders) {
        if (
          raider.bonusActive &&
          raider.bonusY >= ROW_Y[MINI_BLAST_MIN_ROW]
        ) {
          defeatBonusEnemy(raider);
        }
      }
      startBlastSequence(
        [ROW_Y.length - 1, MINI_BLAST_MIN_ROW],
        MINI_BLAST_PUSH_ROWS,
        "miniBlast"
      );

      resetMiniBlastTargets();
      api.showMessage("MINI BLAST", 90);
    }

    function isTargetLit(targetId) {
      return miniBlastTargetHits[targetId] === true;
    }

    function updateBonusEnemy(raider, dtMs) {
      if (!raider.bonusActive) return;

      raider.bonusElapsedMs = Math.min(
        BONUS_DESCENT_MS,
        raider.bonusElapsedMs + dtMs
      );
      const progress = BONUS_DESCENT_MS > 0
        ? raider.bonusElapsedMs / BONUS_DESCENT_MS
        : 1;
      raider.bonusY = BONUS_START_Y +
        (BONUS_END_Y - BONUS_START_Y) * progress;

      if (progress >= 1) raider.bonusActive = false;
    }

    function update(dtMs) {
      if (waveEndActive) {
        updateWaveEnd(dtMs);
        return;
      }

      if (waveStartActive) {
        updateWaveStart(dtMs);
        return;
      }

      if (api.getGameStatus() !== "playing") return;

      const bgmTiming = api.getBgmTiming?.();
      waveTimerMs = bgmTiming
        ? Math.max(0, bgmTiming.durationMs - bgmTiming.elapsedMs)
        : Math.max(0, waveTimerMs - dtMs);
      if (waveTimerMs === 0) {
        beginWaveEnd(true);
        return;
      }

      if (powerPushTimerMs > 0) {
        powerPushTimerMs = Math.max(0, powerPushTimerMs - dtMs);
      }

      if (combinationTimerMs > 0) {
        combinationTimerMs = Math.max(0, combinationTimerMs - dtMs);
        if (combinationTimerMs === 0) resetCombination();
      }

      if (ballReturnTimerMs > 0) {
        ballReturnTimerMs -= dtMs;
        if (ballReturnTimerMs <= 0) {
          ballReturnTimerMs = 0;
          api.respawnBall();
        }
      }

      updateBlastSequences(dtMs);

      for (const raider of raiders) {
        updateBonusEnemy(raider, dtMs);

        if (raider.active && raider.state === "push") {
          updatePushAnimation(raider, dtMs);
        } else if (raider.active && raider.state === "baseWait") {
          raider.respawnTimerMs -= dtMs;
          if (raider.respawnTimerMs <= 0) startRespawnAnimation(raider);
        } else if (raider.active && raider.state === "respawn") {
          updateRespawnAnimation(raider, dtMs);
        }

        if (!raider.active && raider.respawnTimerMs > 0) {
          raider.respawnTimerMs -= dtMs;
          if (raider.respawnTimerMs <= 0) resetRaider(raider);
        }
      }

      descentTimerMs -= dtMs;
      while (descentTimerMs <= 0) {
        descentTimerMs += getDescentIntervalMs();
        stepRaidersDown();
        if (waveEndActive || api.getGameStatus() !== "playing") return;
      }
    }

    function collideRaider(raider) {
      if (!raider.active || raider.state !== "normal") return;

      const ball = api.ball;
      const raiderY = raider.visualY;
      if (raiderY == null) return;

      const dx = ball.x - raider.x;
      const dy = ball.y - raiderY;
      const totalR = api.ballRadius + RAIDER_RADIUS;
      const distSq = dx * dx + dy * dy;
      if (distSq >= totalR * totalR || distSq < 1e-6) return;

      const impactSpeed = Math.hypot(ball.vx || 0, ball.vy || 0);
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const depth = totalR - dist;

      ball.x += nx * depth;
      ball.y += ny * depth;

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        const restitution = 0.7;
        ball.vx -= (1 + restitution) * dot * nx;
        ball.vy -= (1 + restitution) * dot * ny;
      }

      if (impactSpeed < PUSH_SPEED_MIN) return;

      const basePushRows = impactSpeed >= STRONG_PUSH_SPEED_MIN ? 2 : 1;
      const pushRows = basePushRows
        + getHardModePushBonusRows()
        + (powerPushTimerMs > 0 ? POWER_PUSH_BONUS_ROWS : 0);
      if (startRaiderPush(raider, pushRows, "ball")) {
        const pushSoundId = pushRows >= 4
          ? "push4"
          : pushRows === 3 ? "push3"
          : pushRows === 2 ? "push2" : "push1";
        api.playSfx?.(pushSoundId);
        registerCombinationHit();
      }
    }

    function defeatBonusEnemy(raider) {
      if (!raider.bonusActive) return false;

      raider.bonusActive = false;
      api.addScore(BONUS_SCORE, "cosmo bonus enemy");
      api.showMessage("BONUS " + BONUS_SCORE, 60);
      api.playMelody?.("boostCollect");
      registerCombinationHit();
      return true;
    }

    function collideBonusEnemy(raider) {
      if (!raider.bonusActive) return;

      const ball = api.ball;
      const dx = ball.x - raider.x;
      const dy = ball.y - raider.bonusY;
      const totalR = api.ballRadius + BONUS_RADIUS;
      const distSq = dx * dx + dy * dy;
      if (distSq >= totalR * totalR || distSq < 1e-6) return;

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const depth = totalR - dist;

      ball.x += nx * depth;
      ball.y += ny * depth;

      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        const restitution = 0.8;
        ball.vx -= (1 + restitution) * dot * nx;
        ball.vy -= (1 + restitution) * dot * ny;
      }

      defeatBonusEnemy(raider);
    }

    function fixedUpdate() {
      if (!api.isBallInPlay()) return;
      for (const raider of raiders) {
        collideRaider(raider);
        collideBonusEnemy(raider);
      }
    }

    function handleOutHole() {
      if (!api.isBallInPlay()) return false;
      resetCombination();
      api.setBallInactive();
      ballReturnTimerMs = BALL_RETURN_DELAY_MS;
      return true;
    }

    function getDisplayLines() {
      if (waveEndActive) {
        return {
          line1: "WAVE " + currentWave + " RESULT",
          line2: waveResultLine2
        };
      }

      if (api.getGameStatus() !== "playing") {
        return {
          line1: "DEFEND CITIES",
          line2Label: "SCORE",
          line2Value: api.formatScore(api.getScore())
        };
      }

      return {
        line1: api.getDisplayMessage() ||
          (powerPushTimerMs > 0
            ? "PUSH +1"
            : "CITIES " + (DANGER_MAX - danger) + "/" + DANGER_MAX),
        line2Label: "SCORE",
        line2Value: api.formatScore(api.getScore())
      };
    }

    function getLaunchPromptText() {
      if (api.getGameStatus() === "gameOver") return "GAME OVER";
      if (currentWave <= 1) return "START GAME";
      return "LAUNCH WAVE " + currentWave;
    }

    function shouldShowLaunchPrompt() {
      return !waveStartActive;
    }

    function drawRaiderSprite(drawCtx, frameName, x, y) {
      if (!raiderSpriteReady || !raiderSprite) return false;

      const sourceY = RAIDER_SPRITE_FRAMES[frameName];
      if (!Number.isFinite(sourceY)) return false;

      const halfSize = RAIDER_SPRITE_DRAW_SIZE / 2;
      drawCtx.save();
      drawCtx.imageSmoothingEnabled = false;
      drawCtx.drawImage(
        raiderSprite,
        0,
        sourceY,
        RAIDER_SPRITE_SIZE,
        RAIDER_SPRITE_SIZE,
        x - halfSize,
        y - halfSize,
        RAIDER_SPRITE_DRAW_SIZE,
        RAIDER_SPRITE_DRAW_SIZE
      );
      drawCtx.restore();
      return true;
    }

    function getDangerShakeX(raider) {
      if (raider.state !== "normal" || raider.rowIndex !== ROW_Y.length - 1) return 0;
      const descentIntervalMs = getDescentIntervalMs();
      const progress = Math.max(0, Math.min(1,
        1 - descentTimerMs / descentIntervalMs));
      if (progress <= 0.5) return 0;
      const ramp = (progress - 0.5) * 2;
      const seconds = ramp * descentIntervalMs / 2000;
      // Integrate a rising frequency for a smooth 4-to-16 Hz warning.
      const phase = 2 * Math.PI * seconds * (4 + 6 * ramp);
      return Math.sin(phase) * 3 * ramp;
    }

    function drawBehindPlayfield(drawCtx) {
      drawCtx.save();
      for (const raider of raiders) {
        if (!raider.active) continue;
        const y = raider.visualY;
        const x = raider.x + getDangerShakeX(raider);
        if (y == null) continue;

        const laneSprites = currentWave >= 2
          ? HARD_RAIDER_LANE_SPRITES
          : RAIDER_LANE_SPRITES;
        const frameName = raider.state === "push"
          ? "pushback"
          : laneSprites[raider.laneIndex];
        if (drawRaiderSprite(drawCtx, frameName, x, y)) continue;

        drawCtx.beginPath();
        drawCtx.arc(x, y, RAIDER_RADIUS, 0, Math.PI * 2);
        drawCtx.fillStyle = "#fff";
        drawCtx.fill();
      }

      for (const raider of raiders) {
        if (!raider.bonusActive) continue;

        if (drawRaiderSprite(drawCtx, "bonus", raider.x, raider.bonusY)) {
          continue;
        }

        drawCtx.beginPath();
        drawCtx.arc(raider.x, raider.bonusY, BONUS_RADIUS, 0, Math.PI * 2);
        drawCtx.fillStyle = BONUS_COLOR;
        drawCtx.fill();
      }

      drawCtx.restore();
    }

    function drawRaiderBase(drawCtx) {
      drawCtx.save();
      drawCtx.beginPath();
      drawCtx.moveTo(RAIDER_BASE_POINTS[0].x, RAIDER_BASE_POINTS[0].y);
      for (let index = 1; index < RAIDER_BASE_POINTS.length; index++) {
        const point = RAIDER_BASE_POINTS[index];
        drawCtx.lineTo(point.x, point.y);
      }
      drawCtx.closePath();
      drawCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
      drawCtx.fill();
      drawCtx.strokeStyle = "#fff";
      drawCtx.lineWidth = 3;
      drawCtx.stroke();
      drawCtx.restore();
    }

    function drawIndicatorClip(drawCtx, targetId) {
      if (!indicatorOverlayReady || !indicatorOverlay) return;
      const clip = INDICATOR_CLIPS[targetId];
      if (!clip) return;

      drawCtx.save();
      drawCtx.beginPath();
      drawCtx.rect(clip.x, clip.y, clip.w, clip.h);
      drawCtx.clip();
      drawCtx.drawImage(indicatorOverlay, 0, 0, 740, 1280);
      drawCtx.restore();
    }

    function drawNormalIndicators(drawCtx) {
      for (const targetId of MINI_BLAST_TARGET_IDS) {
        if (miniBlastTargetHits[targetId]) {
          drawIndicatorClip(drawCtx, targetId);
        }
      }

      for (const targetId of DROP_TARGET_INDICATOR_IDS) {
        if (api.isDropTargetDown?.(targetId)) {
          drawIndicatorClip(drawCtx, targetId);
        }
      }
    }

    function drawBlastIndicators(drawCtx) {
      drawCtx.save();
      drawCtx.fillStyle = BLAST_COLOR;

      for (const sequence of blastSequences) {
        for (let index = 0; index < sequence.rowIndices.length; index++) {
          const localElapsedMs =
            sequence.elapsedMs - index * BLAST_ROW_INTERVAL_MS;
          if (localElapsedMs < 0 || localElapsedMs >= BLAST_PULSE_DURATION_MS) {
            continue;
          }

          const radius = BLAST_PULSE_RADIUS *
            (1 - localElapsedMs / BLAST_PULSE_DURATION_MS);
          const y = ROW_Y[sequence.rowIndices[index]];
          for (const x of LANE_X) {
            drawCtx.beginPath();
            drawCtx.arc(x, y, radius, 0, Math.PI * 2);
            drawCtx.fill();
          }
        }
      }

      drawCtx.restore();
    }

    function drawBeforeBall(drawCtx) {
      drawNormalIndicators(drawCtx);
      drawBlastIndicators(drawCtx);

      // Keep the simplified game clock while making Wave 2's acceleration visible.
      const remainingRatio = Math.max(0, Math.min(1, waveTimerMs / getWaveDurationMs()));
      const displayDurationSeconds = currentWave >= 2
        ? WAVE_2_DISPLAY_DURATION_SECONDS
        : WAVE_1_DISPLAY_DURATION_SECONDS;
      const remainingSeconds = Math.ceil(remainingRatio * displayDurationSeconds);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = String(remainingSeconds % 60).padStart(2, "0");

      drawCtx.save();
      drawCtx.textAlign = "left";
      drawCtx.textBaseline = "middle";
      drawCtx.font = "700 24px system-ui, sans-serif";
      drawCtx.fillStyle = "#bbb";
      drawCtx.fillText(
        "WAVE " + currentWave + "/" + WAVE_COUNT,
        WAVE_LABEL_X,
        WAVE_TIMER_Y
      );
      drawCtx.fillText(
        "TIME " + minutes + ":" + seconds,
        TIME_LABEL_X,
        WAVE_TIMER_Y
      );

      if (
        api.getGameStatus() === "ready" &&
        !waveStartActive &&
        !waveEndActive
      ) {
        const waveMessage = currentWave >= 2
          ? "RAIDERS RUSH IN · PUSHBACK BOOSTED"
          : "RAIDERS ADVANCE · PUSH 'EM BACK";
        drawCtx.textAlign = "center";
        drawCtx.font = "700 24px system-ui, sans-serif";
        drawCtx.fillStyle = "#fff";
        drawCtx.lineWidth = 7;
        drawCtx.lineJoin = "round";
        drawCtx.strokeStyle = "#171717";
        drawCtx.strokeText(
          waveMessage,
          370,
          WAVE_MESSAGE_Y
        );
        drawCtx.fillText(
          waveMessage,
          370,
          WAVE_MESSAGE_Y
        );
      }
      drawCtx.restore();
    }

    function draw(drawCtx) {
      drawRaiderBase(drawCtx);
    }

    return {
      reset,
      update,
      fixedUpdate,
      handleLaunchRequest,
      handleOutHole,
      onDropTargetBankComplete,
      onTargetHit,
      onNonEnemyCollision,
      isTargetLit,
      getDisplayLines,
      getLaunchPromptText,
      shouldShowLaunchPrompt,
      drawBeforeBall,
      drawBehindPlayfield,
      draw
    };
  }

  window.RCP_TABLES.cosmo_raiders = {
    id: "cosmo_raiders",
    label: "Cosmo Raiders",
    createRuntime,

    assets: {
      playfieldLogo: false,
      playfieldMask: {
        src: "./svg/maskCR.svg",
        opacity: 1
      },
      howToOverlay: {
        src: "./svg/howToOverlayCR.svg",
        opacity: 1
      }
    },

    ui: {
      displayHints: ["HIT RAIDERS HARD"],
      showBallStatus: false,
      ballLostDisplay: "ballLostScore",
      gameOverDisplay: "finalScoreOnly",
      playfieldLayout: {
        display: {
          x: 141.5,
          y: 805,
          w: 457,
          h: 152.5
        },
        launchPromptY: 620,
        pausedPromptY: 620,
        relaunchPromptY: 620,
        secondaryPromptY: 660
      },
      suppressRuleMessages: {
        kickbackReady: true,
        ballSaveReady: true
      }
    },

    rules: {
      dropTargetGroupResetDelayMs: 2000,
      dropTargetGroupResetDelays: {
        powerPush: POWER_PUSH_DURATION_MS
      },
      dropTargetScores: {
        cosmoAttack: {
          hit: 10,
          bankComplete: 0
        },
        powerPush: {
          hit: 10,
          bankComplete: 0
        }
      },
      topLaneScore: 0,
      topLaneCompleteScore: 0,
      wallBumpScore: 5
    },

    game: {
      ballsPerGame: 3
    },

    canvas: {
      w: 740,
      h: 1280,
      svgOffsetX: 0,
      svgOffsetY: 0
    },

    walls: [
      { x1: -10.5, y1: -10.5, x2: 750.5, y2: -10.5, r: 14 },
      { x1: -10.5, y1: -10.5, x2: -10.5, y2: 1280.5, r: 14 },
      { x1: 750.5, y1: -10.5, x2: 750.5, y2: 1280.5, r: 14 },
      { x1: 0, y1: 1159.1, x2: 210.4, y2: 1280, r: 3 },
      { x1: 529.6, y1: 1280, x2: 740, y2: 1159.1, r: 3 },
      { x1: 65, y1: 912, x2: 65, y2: 1067.5, r: 3 },
      { x1: 63, y1: 908, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 1067.5, x2: 675, y2: 912, r: 3 },
      { x1: 677, y1: 908, x2: 675, y2: 912, r: 3 },
      { x1: 41, y1: 424.5, x2: 0.5, y2: 260.5, r: 2 },
      { x1: 699.5, y1: 424.5, x2: 740, y2: 260.5, r: 2 }
    ],

    drainWalls: [
      {
        id: "drain_wall_left",
        points: [
          { x: 123.2, y: 1064.6 },
          { x: 115.2, y: 1078.5 },
          { x: 107.2, y: 1092.4 },
          { x: 65, y: 1068 },
          { x: 65, y: 1030.5 }
        ],
        collisionSegments: [
          { x1: 65, y1: 1030.5, x2: 123.2, y2: 1064.6, r: 3 },
          { x1: 123.2, y1: 1064.6, x2: 115.2, y2: 1078.5, r: 3 },
          { x1: 115.2, y1: 1078.5, x2: 107.2, y2: 1092.4, r: 3 }
        ]
      },
      {
        id: "drain_wall_right",
        points: [
          { x: 616.8, y: 1064.6 },
          { x: 624.8, y: 1078.5 },
          { x: 632.8, y: 1092.4 },
          { x: 675, y: 1068 },
          { x: 675, y: 1030.5 }
        ],
        collisionSegments: [
          { x1: 675, y1: 1030.5, x2: 616.8, y2: 1064.6, r: 3 },
          { x1: 616.8, y1: 1064.6, x2: 624.8, y2: 1078.5, r: 3 },
          { x1: 624.8, y1: 1078.5, x2: 632.8, y2: 1092.4, r: 3 }
        ]
      }
    ],

    wallBumps: [
      {
        id: "wall_bump_left",
        segments: [
          { x1: -12, y1: 810, x2: 3, y2: 825, r: 12 },
          { x1: 3, y1: 825, x2: -12, y2: 840, r: 12 }
        ]
      },
      {
        id: "wall_bump_right",
        segments: [
          { x1: 752, y1: 810, x2: 737, y2: 825, r: 12 },
          { x1: 737, y1: 825, x2: 752, y2: 840, r: 12 }
        ]
      }
    ],


    targetIslands: [
      {
        id: "raiders_base_area",
        fill: "rgba(0, 0, 0, 0.5)",
        strokeStyle: "#fff",
        strokeWidth: 3,
        points: RAIDER_BASE_POINTS
      }
    ],

    flippers: {
      left: {
        id: "inner_left",
        x: 220.9,
        y: 1176.5,
        length: 94,
        minAngleDeg: 30,
        maxAngleDeg: -20,
        thickness: 16,
        shotMap: { enabled: false }
      },
      right: {
        id: "inner_right",
        x: 519.1,
        y: 1176.5,
        length: 94,
        minAngleDeg: 150,
        maxAngleDeg: 200,
        thickness: 16,
        shotMap: { enabled: false }
      },
      additional: [
        {
          id: "outer_left",
          side: "left",
          x: 115.2,
          y: 1078.5,
          length: 108,
          minAngleDeg: 30,
          maxAngleDeg: -20,
          thickness: 16,
          shotMap: { enabled: false }
        },
        {
          id: "outer_right",
          side: "right",
          x: 624.8,
          y: 1078.5,
          length: 108,
          minAngleDeg: 150,
          maxAngleDeg: 200,
          thickness: 16,
          shotMap: { enabled: false }
        }
      ]
    },

    orbit: {
      visualPaths: {
        upperLeft: "M.5,521c0-71.4,40.5-96.5,40.5-96.5L.5,260.5",
        upperRight: "M740,521c0-71.4-40.5-96.5-40.5-96.5l40.5-164"
      },
      draw: {
        lineWidth: 4
      },
      collisionCurves: [
        {
          id: "cosmo_upper_left_curve",
          p0: { x: 0.5, y: 521 },
          p1: { x: 0.5, y: 449.6 },
          p2: { x: 41, y: 424.5 },
          p3: { x: 41, y: 424.5 },
          count: 16,
          r: 2
        },
        {
          id: "cosmo_upper_right_curve",
          p0: { x: 740, y: 521 },
          p1: { x: 740, y: 449.6 },
          p2: { x: 699.5, y: 424.5 },
          p3: { x: 699.5, y: 424.5 },
          count: 16,
          r: 2
        }
      ],
      oneWayCollisionCurves: []
    },

    // The visible base edge is also a one-way barrier: the ball may remain
    // below it, while defeated raiders can animate into the base above it.
    oneWayWalls: [
      {
        id: "raiders_base_1",
        p0: { x: 0, y: 100 }, p1: { x: 0, y: 100 },
        p2: { x: 123.2, y: 80 }, p3: { x: 123.2, y: 80 },
        count: 1, r: 2, nx: 0.1602, ny: 0.9871
      },
      {
        id: "raiders_base_2",
        p0: { x: 123.2, y: 80 }, p1: { x: 123.2, y: 80 },
        p2: { x: 246.6, y: 100 }, p3: { x: 246.6, y: 100 },
        count: 1, r: 2, nx: -0.1602, ny: 0.9871
      },
      {
        id: "raiders_base_3",
        p0: { x: 246.6, y: 100 }, p1: { x: 246.6, y: 100 },
        p2: { x: 370, y: 80 }, p3: { x: 370, y: 80 },
        count: 1, r: 2, nx: 0.1602, ny: 0.9871
      },
      {
        id: "raiders_base_4",
        p0: { x: 370, y: 80 }, p1: { x: 370, y: 80 },
        p2: { x: 493.4, y: 100 }, p3: { x: 493.4, y: 100 },
        count: 1, r: 2, nx: -0.1602, ny: 0.9871
      },
      {
        id: "raiders_base_5",
        p0: { x: 493.4, y: 100 }, p1: { x: 493.4, y: 100 },
        p2: { x: 616.8, y: 80 }, p3: { x: 616.8, y: 80 },
        count: 1, r: 2, nx: 0.1602, ny: 0.9871
      },
      {
        id: "raiders_base_6",
        p0: { x: 616.8, y: 80 }, p1: { x: 616.8, y: 80 },
        p2: { x: 740, y: 100 }, p3: { x: 740, y: 100 },
        count: 1, r: 2, nx: -0.1602, ny: 0.9871
      }
    ],

    targets: [
      {
        id: "mini_blast_target_left",
        type: "fixedScore",
        x1: 16.5,
        y1: 606,
        x2: 16.5,
        y2: 655,
        r: 5,
        score: 10,
        rebound: 2.5
      },
      {
        id: "mini_blast_target_right",
        type: "fixedScore",
        x1: 723.5,
        y1: 606,
        x2: 723.5,
        y2: 655,
        r: 5,
        score: 10,
        rebound: 2.5
      }
    ],

    dropTargets: [
      { id: "cosmo_drop_1", group: "cosmoAttack", hitFrom: "below", x1: 209.9, y1: 110, x2: 159.9, y2: 101.9, r: 5 },
      { id: "cosmo_drop_2", group: "cosmoAttack", hitFrom: "below", x1: 336.1, y1: 101.5, x2: 283.3, y2: 110, r: 5 },
      { id: "cosmo_drop_3", group: "cosmoAttack", hitFrom: "below", x1: 456.7, y1: 110, x2: 406.7, y2: 101.9, r: 5 },
      { id: "cosmo_drop_4", group: "cosmoAttack", hitFrom: "below", x1: 580.1, y1: 101.9, x2: 530.1, y2: 110, r: 5 },
      { id: "power_push_left_1", group: "powerPush", x1: 16.5, y1: 122, x2: 16.5, y2: 171, r: 5, rebound: 1.2 },
      { id: "power_push_left_2", group: "powerPush", x1: 16.5, y1: 196, x2: 16.5, y2: 245, r: 5, rebound: 1.2 },
      { id: "power_push_right_1", group: "powerPush", x1: 723.5, y1: 122, x2: 723.5, y2: 171, r: 5, rebound: 1.2 },
      { id: "power_push_right_2", group: "powerPush", x1: 723.5, y1: 196, x2: 723.5, y2: 245, r: 5, rebound: 1.2 }
    ],

    posts: [
      {
        id: "center_post",
        x: 370,
        y: 1281,
        r: 12,
        visualR: 12,
        restitution: 0.55
      }
    ],

    spawn: {
      x: 370,
      y: 1065,
      launchPowerMin: 13,
      launchPowerMax: 16,
      launchVxMin: 2,
      launchVxMax: 5,
      launchRandomDirection: true
    },

    visual: {
      lineWidth: 4,
      colors: {
        flipper: "#74b",
        scoreFlash: "#2fb",
        targetLit: "#2fb"
      }
    }
  };
})();
