(() => {
  "use strict";

  window.RCP_TABLES = window.RCP_TABLES || {};

  window.RCP_TABLES.table4 = {
    id: "table4",
    label: "Table 4",
    secondChance: { enabled: true },

    assets: {
      playfieldLogo: true,
      playfieldMask: {
        src: "./svg/maskT4.svg",
        opacity: 1
      },
      howToOverlay: {
        src: "./svg/howToOverlayT4.svg",
        opacity: 1
      }
    },

    ui: {
      ballLostDisplay: "ballLostScore",
      displayHintsUntilFirstMessage: true,
      gameOverDisplay: "finalScoreOnly",
      displayHints: [
        "UPPER TARGETS BUILD BONUS",
        "SAUCERS COLLECT BONUS",
        "HIGHER LEVELS PAY MORE",
        "UPPER SAUCER COLLECTS x2",
        "SPINNERS POWER UP SAUCERS"
      ]
    },

    // Saucer collection is the main scoring objective.
    rules: {
      dropTargetGroupResetDelayMs: 2000,
      dropTargetGroupResetDelays: {
        bonusReady: 0
      },

      dropTargetScores: {
        bonusReady: {
          hit: 25,
          bankComplete: 0
        },
        leftDrop: {
          hit: 25,
          bankComplete: 100
        },
        rightDrop: {
          hit: 25,
          bankComplete: 100
        }
      },

      bumperScores: [20],
      bumperLevelThresholds: [],
      bumperBonusValueAdd: 0,
      bumperBonusValueThresholds: [],

      spinnerScorePerSpin: 10,
      spinnerBumperLevelThresholds: [],
      spinnerBonusValueThresholds: [20, 45, 75, 110, 150],

      bonusValueInitialScore: 500,
      bonusValueAdd: 100,
      bonusValueMaxScore: 1000,
      bonusValuePersistsOnBallLoss: true,
      collectBonusOnBallLoss: false,

      wallBumpScore: 5,
      loopBonusScore: 0
    },

    canvas: {
      w: 740,
      h: 1280,
      svgOffsetX: 0,
      svgOffsetY: 0
    },

    walls: [
      // Canvas boundary and shared lower geometry.
      { x1: -10.5, y1: -10.5, x2: 750.5, y2: -10.5, r: 14 },
      { x1: -10.5, y1: -10.5, x2: -10.5, y2: 1280.5, r: 14 },
      { x1: 750.5, y1: -10.5, x2: 750.5, y2: 1280.5, r: 14 },
      { x1: 216.2, y1: 1280, x2: 0, y2: 1155, r: 3 },
      { x1: 740, y1: 1155, x2: 523.9, y2: 1280, r: 3 },

      // Outlane dividers.
      { x1: 65, y1: 1100, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 912, x2: 675, y2: 1100, r: 3 },
      { x1: 63, y1: 908, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 912, x2: 677, y2: 908, r: 3 },

      // Upper saucer wall: two sloped sides to avoid a flat resting surface.
      { x1: 370, y1: 70, x2: 308.6, y2: 117.2, r: 2 },
      { x1: 370, y1: 70, x2: 431.4, y2: 117.2, r: 2 },

      // Lower saucer wall: two sloped sides to avoid a flat resting surface.
      { x1: 370, y1: 489, x2: 328.4, y2: 521, r: 2 },
      { x1: 370, y1: 489, x2: 411.6, y2: 521, r: 2 },

      // Symmetrical upper walls.
      { x1: 308.6, y1: 117.2, x2: 128, y2: 3, r: 2 },
      { x1: 128, y1: 3, x2: 2, y2: 109, r: 2 },
      { x1: 2, y1: 109, x2: 78, y2: 295, r: 2 },
      { x1: 431.4, y1: 117.2, x2: 612, y2: 3, r: 2 },
      { x1: 612, y1: 3, x2: 738, y2: 109, r: 2 },
      { x1: 738, y1: 109, x2: 662, y2: 295, r: 2 },

      // Side drop-target lane walls.
      { x1: 0, y1: 775, x2: 54.2, y2: 575.3, r: 2 },
      { x1: 740, y1: 775, x2: 685.8, y2: 575.3, r: 2 },

      // Spinner dividers.
      { x1: 145.5, y1: 484.4, x2: 155.1, y2: 510.7, r: 2 },
      { x1: 594.5, y1: 484.4, x2: 584.9, y2: 510.7, r: 2 }
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

    drainWalls: [
      {
        id: "drain_left_wall",
        points: [
          { x: 236.6, y: 1157.1 },
          { x: 220.6, y: 1189.9 },
          { x: 65, y: 1100 },
          { x: 65, y: 1058 }
        ],
        collisionSegments: [
          { x1: 65, y1: 1058, x2: 236.6, y2: 1157.1, r: 1 },
          { x1: 220.6, y1: 1189.9, x2: 65, y2: 1100, r: 1 }
        ]
      },
      {
        id: "drain_right_wall",
        points: [
          { x: 503.4, y: 1157.1 },
          { x: 519.4, y: 1189.9 },
          { x: 675, y: 1100 },
          { x: 675, y: 1058 }
        ],
        collisionSegments: [
          { x1: 503.4, y1: 1157.1, x2: 675, y2: 1058, r: 1 },
          { x1: 675, y1: 1100, x2: 519.4, y2: 1189.9, r: 1 }
        ]
      }
    ],

    flippers: {
      left: {
        x: 228.6,
        y: 1173,
        length: 97,
        minAngleDeg: 25,
        maxAngleDeg: -25,
        thickness: 16
      },
      right: {
        x: 511.4,
        y: 1173,
        length: 97,
        minAngleDeg: 155,
        maxAngleDeg: 205,
        thickness: 16
      }
    },

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

    bumpers: [
      {
        id: "center_bumper",
        x: 370,
        y: 323,
        visualR: 54,
        collisionR: 44,
        power: 4.5
      }
    ],

    slingshots: [
      {
        side: "left",
        score: 10,
        powerX: 10,
        powerY: -10,
        bodyPath:
          "M200.4,1063.3l-65.1-39.8c-3.3-2-5.2-5.5-5.2-9.3v-124.1c0-12,16.6-15.3,21.1-4l65.1,163.9c3.9,9.7-6.9,18.8-15.8,13.3h0Z",
        bodyCollisionSegments: [
          { x1: 147.6, y1: 888.5, x2: 144.2, y2: 879.6, r: 4 },
          { x1: 144.2, y1: 879.6, x2: 133.7, y2: 881.8, r: 4 },
          { x1: 130, y1: 890.1, x2: 133.7, y2: 881.8, r: 4 },
          { x1: 130, y1: 890.1, x2: 130, y2: 1014.2, r: 4 },
          { x1: 131.4, y1: 1019.5, x2: 130, y2: 1014.2, r: 4 },
          { x1: 135.2, y1: 1023.5, x2: 131.4, y2: 1019.5, r: 4 },
          { x1: 200.4, y1: 1063.3, x2: 135.2, y2: 1023.5, r: 4 },
          { x1: 209.4, y1: 1064.4, x2: 200.4, y2: 1063.3, r: 4 },
          { x1: 216, y1: 1058.7, x2: 209.4, y2: 1064.4, r: 4 },
          { x1: 211.6, y1: 1047.5, x2: 216, y2: 1058.7, r: 4 }
        ],
        activeSegment: {
          x1: 217,
          y1: 1051.9,
          x2: 150.1,
          y2: 883.6,
          hitWidth: 2,
          nx: 1,
          ny: 0
        }
      },
      {
        side: "right",
        score: 10,
        powerX: -10,
        powerY: -10,
        bodyPath:
          "M539.6,1063.3l65.1-39.8c3.3-2,5.2-5.5,5.2-9.3v-124.1c0-12-16.6-15.3-21.1-4l-65.1,163.9c-3.9,9.7,6.9,18.8,15.8,13.3h0Z",
        bodyCollisionSegments: [
          { x1: 592.4, y1: 888.5, x2: 595.8, y2: 879.6, r: 4 },
          { x1: 595.8, y1: 879.6, x2: 606.3, y2: 881.8, r: 4 },
          { x1: 610, y1: 890.1, x2: 606.3, y2: 881.8, r: 4 },
          { x1: 610, y1: 890.1, x2: 610, y2: 1014.2, r: 4 },
          { x1: 608.6, y1: 1019.5, x2: 610, y2: 1014.2, r: 4 },
          { x1: 604.8, y1: 1023.5, x2: 608.6, y2: 1019.5, r: 4 },
          { x1: 539.6, y1: 1063.3, x2: 604.8, y2: 1023.5, r: 4 },
          { x1: 530.6, y1: 1064.4, x2: 539.6, y2: 1063.3, r: 4 },
          { x1: 524, y1: 1058.7, x2: 530.6, y2: 1064.4, r: 4 },
          { x1: 528.4, y1: 1047.5, x2: 524, y2: 1058.7, r: 4 }
        ],
        activeSegment: {
          x1: 523,
          y1: 1051.9,
          x2: 589.9,
          y2: 883.6,
          hitWidth: 2,
          nx: -1,
          ny: 0
        }
      }
    ],

    orbit: {
      visualPaths: {
        deflectorLeft: "M78,295c-66,82-59,188-23.8,280.3",
        deflectorRight: "M662,295c66,82,59,188,23.8,280.3"
      },
      draw: {
        lineWidth: 4
      },
      collisionCurves: [
        {
          id: "table4_deflector_left",
          p0: { x: 78, y: 295 },
          p1: { x: 12, y: 377 },
          p2: { x: 19, y: 483 },
          p3: { x: 54.2, y: 575.3 },
          count: 24,
          r: 4
        },
        {
          id: "table4_deflector_right",
          p0: { x: 662, y: 295 },
          p1: { x: 728, y: 377 },
          p2: { x: 721, y: 483 },
          p3: { x: 685.8, y: 575.3 },
          count: 24,
          r: 4
        }
      ],
      oneWayCollisionCurves: []
    },

    dropTargets: [
      {
        id: "left_drop_target_1",
        group: "leftDrop",
        x1: 53.1,
        y1: 641.4,
        x2: 63.6,
        y2: 602.8,
        r: 5,
        rebound: 1.2
      },
      {
        id: "left_drop_target_2",
        group: "leftDrop",
        x1: 36.9,
        y1: 701.3,
        x2: 47.4,
        y2: 662.7,
        r: 5,
        rebound: 1.2
      },
      {
        id: "left_drop_target_3",
        group: "leftDrop",
        x1: 20.6,
        y1: 761.3,
        x2: 31.1,
        y2: 722.7,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_1",
        group: "rightDrop",
        x1: 686.9,
        y1: 641.4,
        x2: 676.4,
        y2: 602.8,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_2",
        group: "rightDrop",
        x1: 703.1,
        y1: 701.3,
        x2: 692.6,
        y2: 662.7,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_3",
        group: "rightDrop",
        x1: 719.4,
        y1: 761.3,
        x2: 708.9,
        y2: 722.7,
        r: 5,
        rebound: 1.2
      },
      {
        id: "upper_target_left_1",
        group: "bonusReady",
        x1: 92.2,
        y1: 53.4,
        x2: 123.4,
        y2: 27.1,
        r: 5,
        rebound: 2
      },
      {
        id: "upper_target_left_2",
        group: "bonusReady",
        x1: 25.7,
        y1: 109.3,
        x2: 57,
        y2: 83,
        r: 5,
        rebound: 2
      },
      {
        id: "upper_target_right_1",
        group: "bonusReady",
        x1: 647.8,
        y1: 53.4,
        x2: 616.6,
        y2: 27.1,
        r: 5,
        rebound: 2
      },
      {
        id: "upper_target_right_2",
        group: "bonusReady",
        x1: 714.3,
        y1: 109.3,
        x2: 683,
        y2: 83,
        r: 5,
        rebound: 2
      }
    ],

    targets: [],

    topLaneDividers: [],
    topLanes: [],
    orbitLaneTriggers: [],

    spinners: [
      {
        id: "spinner_left",
        rect: {
          x: 59.3,
          y: 513.1,
          w: 70,
          h: 10,
          angleDeg: -20
        }
      },
      {
        id: "spinner_right",
        rect: {
          x: 610.7,
          y: 513.1,
          w: 70,
          h: 10,
          angleDeg: 20
        }
      }
    ],

    saucerBonusLevels: [
      { level: 1, requiredDownCount: 2, baseScore: 200, color: "#7f8" },
      { level: 2, requiredDownCount: 3, baseScore: 500, color: "#64f" },
      { level: 3, requiredDownCount: 4, baseScore: 1000, color: "#f55" }
    ],

    bonusPowerLevelUpScores: [
      { multiplier: 1.2, score: 20 },
      { multiplier: 1.4, score: 50 },
      { multiplier: 1.6, score: 100 },
      { multiplier: 1.8, score: 150 },
      { multiplier: 2, score: 200 }
    ],

    dropTargetCompletionBonuses: [
      {
        id: "upper_left_pair",
        targetIds: ["upper_target_left_1", "upper_target_left_2"],
        score: 50
      },
      {
        id: "upper_right_pair",
        targetIds: ["upper_target_right_1", "upper_target_right_2"],
        score: 50
      },
      {
        id: "upper_all",
        targetIds: [
          "upper_target_left_1",
          "upper_target_left_2",
          "upper_target_right_1",
          "upper_target_right_2"
        ],
        score: 200
      }
    ],

    saucers: [
      {
        id: "upper_saucer",
        x: 370,
        y: 127,
        r: 28,
        requiredDropTargetGroup: "bonusReady",
        requiredDropTargetCount: 2,
        bonusCollectMultiplier: 2,
        unreadyScore: 20,
        lightR: 26,
        unreadyHoldMs: 200,
        holdMs: 1200,
        releaseVx: 3,
        releaseRandomDirection: true,
        releaseVy: 2
      },
      {
        id: "lower_saucer",
        x: 370,
        y: 546,
        r: 28,
        requiredDropTargetGroup: "bonusReady",
        requiredDropTargetCount: 2,
        bonusCollectMultiplier: 1,
        unreadyScore: 10,
        lightR: 26,
        unreadyHoldMs: 200,
        holdMs: 1200,
        releaseVx: 3,
        releaseRandomDirection: true,
        releaseVy: 2
      }
    ],

    spawn: {
      x: 670,
      y: 470,
      launchPowerMin: 16,
      launchPowerMax: 20
    },

    kickbacks: [
      {
        id: "leftKickback",
        side: "left",
        x1: 50,
        y1: 928,
        x2: 16,
        y2: 928,
        r: 18,
        color: "#f55",
        activeColor: "#f55",
        triggerGroups: ["leftDrop"],
        durationMs: 8000,
        powerX: 10,
        powerY: -20
      },
      {
        id: "rightKickback",
        side: "right",
        x1: 724,
        y1: 928,
        x2: 690,
        y2: 928,
        r: 18,
        color: "#f55",
        activeColor: "#f55",
        triggerGroups: ["leftDrop"],
        durationMs: 8000,
        powerX: -10,
        powerY: -20
      }
    ],

    ballSaves: [
      {
        id: "mainBallSave",
        x1: 335,
        y1: 1245,
        x2: 405,
        y2: 1245,
        r: 18,
        color: "#f55",
        activeColor: "#f55",
        triggerGroups: ["rightDrop"],
        durationMs: 8000,
        powerX: 0,
        powerY: -24
      }
    ],

    visual: {
      lineWidth: 4,
      colors: {
        flipper: "#0ab",
        scoreFlash: "#f55",
        bumperFlashLevel1: "#f55",
        bumperFlashLevel2: "#f55"
      }
    }
  };
})();
