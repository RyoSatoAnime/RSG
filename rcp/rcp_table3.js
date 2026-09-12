(() => {
  "use strict";

  window.RCP_TABLES = window.RCP_TABLES || {};

  window.RCP_TABLES.table3 = {
    id: "table3",
    label: "Table 3",
    secondChance: { enabled: true },

    assets: {
      playfieldLogo: true,
      playfieldMask: {
        src: "./svg/maskT3.svg",
        opacity: 1
      },
      centerValueDoublerIndicator: {
        src: "./svg/indiT3.svg",
        opacity: 1
      },
      howToOverlay: {
        src: "./svg/howToOverlayT3.svg",
        opacity: 1
      }
    },

    ui: {
      displayHints: [
        "SPINNERS BUILD CENTER",
        "CENTER TARGET SCORES",
        "SIDE TARGETS DOUBLE CENTER",
      ],
      centerValueDisplayAfterFirstMessage: true,
      showCenterValueDoublerReadyMessage: false,
      ballLostDisplay: "ballLostScore",
      gameOverDisplay: "finalScoreOnly"
    },

    rules: {
      dropTargetGroupResetDelayMs: 2000,
      kickbackDurationMs: 8000,
      ballSaveDurationMs: 8000,

      dropTargetScores: {
        leftDrop: {
          hit: 25,
          bankComplete: 50
        },
        rightDrop: {
          hit: 25,
          bankComplete: 50
        }
      },

      bumperScores: [15, 30, 50],
      bumperLevelThresholds: [15, 30],
      bumperBonusValueAdd: 0,
      bumperBonusValueThresholds: [],

      spinnerScorePerSpin: 10,
      spinnerBumperLevelThresholds: [],

      centerValueInitialScore: 250,
      centerValueAdd: 250,
      centerValueMaxScore: 2000,
      spinnerCenterValueThresholds: [10, 25, 45, 70, 100, 135, 175],

      centerValueDoublerMultiplier: 2,
      centerValueDoublerDurationMs: 7100,
      centerValueDoublerResetDelayMs: 2000,
      centerValueDoublerTriggerTargets: ["left_target", "right_target"],

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
      { x1: -10.5, y1: -10.5, x2: 750.5, y2: -10.5, r: 14 },
      { x1: -10.5, y1: -10.5, x2: -10.5, y2: 1280.5, r: 14 },
      { x1: 750.5, y1: -10.5, x2: 750.5, y2: 1280.5, r: 14 },
      { x1: 216.2, y1: 1280, x2: 0, y2: 1155, r: 3 },
      { x1: 740, y1: 1155, x2: 523.9, y2: 1280, r: 3 },
      // out lane divider
      { x1: 65, y1: 1100, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 912, x2: 675, y2: 1100, r: 3 },
      // out lane divider rim
      { x1: 63, y1: 908, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 912, x2: 677, y2: 908, r: 3 },
      // left orbit wall lower straight
      { x1: 0, y1: 789, x2: 56.5, y2: 567.5, r: 2 },
      // left orbit wall upper straight
      { x1: 289.5, y1: 43.5, x2: 332.55, y2: 0.5, r: 2 },
      // right orbit wall lower straight
      { x1: 740, y1: 789, x2: 683.5, y2: 567.5, r: 2 },
      // right orbit wall upper straight
      { x1: 450.5, y1: 43.5, x2: 407.45, y2: 0.5, r: 2 },
      // spinner divider
      { x1: 306, y1: 210, x2: 306, y2: 270.5, r: 3 },
      { x1: 434, y1: 210, x2: 434, y2: 270.5, r: 3 },
      // left island
      { x1: 106, y1: 431.5, x2: 142, y2: 517.5, r: 2 },
      { x1: 142, y1: 517.5, x2: 166, y2: 504.5, r: 2 },
      { x1: 166, y1: 504.5, x2: 106, y2: 431.5, r: 2 },
      // right island
      { x1: 634.5, y1: 431.5, x2: 598.5, y2: 517.5, r: 2 },
      { x1: 598.5, y1: 517.5, x2: 574.5, y2: 504.5, r: 2 },
      { x1: 574.5, y1: 504.5, x2: 634.5, y2: 431.5, r: 2 }
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

    centerValueIndicator: {
      shape: "indicator7",
      x: 318.3,
      y: 71,
      angleDeg: 0,
      scale: 1,
      color: "#df5",
      unlitColor: "#171717"
    },

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
      { x: 483, y: 408, visualR: 50, collisionR: 28, power: 4.5 },
      { x: 583, y: 243, visualR: 50, collisionR: 28, power: 4.5 },
      { x: 257, y: 408, visualR: 50, collisionR: 28, power: 4.5 },
      { x: 157, y: 243, visualR: 50, collisionR: 28, power: 4.5 }
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
        leftOrbitWall:
          "M332.55.5l-43.05,43S256.9,0,171.87,0C41.65,0,0,124.5,0,244.5s56.5,323,56.5,323L0,789",
        rightOrbitWall:
          "M740,789l-56.5-221.5s56.5-203,56.5-323S698.35,0,568.13,0c-85.03,0-117.63,43.5-117.63,43.5L407.45.5",
        innerOrbitLeft: "M211.1,88.1c-11.5-7.9-85.6-43.6-113.1,43",
        innerOrbitRight: "M642,131.1c-27.5-86.6-101.6-50.9-113.1-43"
      },
      draw: {
        lineWidth: 4
      },
      collisionCurves: [
        {
          id: "table3_left_orbit_curve_1",
          p0: { x: 56.5, y: 567.5 },
          p1: { x: 56.5, y: 567.5 },
          p2: { x: 0, y: 364.5 },
          p3: { x: 0, y: 244.5 },
          count: 20,
          r: 4
        },
        {
          id: "table3_left_orbit_curve_2",
          p0: { x: 0, y: 244.5 },
          p1: { x: 0, y: 124.5 },
          p2: { x: 41.65, y: 0 },
          p3: { x: 171.87, y: 0 },
          count: 24,
          r: 4
        },
        {
          id: "table3_left_orbit_curve_3",
          p0: { x: 171.87, y: 0 },
          p1: { x: 256.9, y: 0 },
          p2: { x: 289.5, y: 43.5 },
          p3: { x: 289.5, y: 43.5 },
          count: 10,
          r: 4
        },
        {
          id: "table3_right_orbit_curve_1",
          p0: { x: 683.5, y: 567.5 },
          p1: { x: 683.5, y: 567.5 },
          p2: { x: 740, y: 364.5 },
          p3: { x: 740, y: 244.5 },
          count: 20,
          r: 4
        },
        {
          id: "table3_right_orbit_curve_2",
          p0: { x: 740, y: 244.5 },
          p1: { x: 740, y: 124.5 },
          p2: { x: 698.35, y: 0 },
          p3: { x: 568.13, y: 0 },
          count: 24,
          r: 4
        },
        {
          id: "table3_right_orbit_curve_3",
          p0: { x: 568.13, y: 0 },
          p1: { x: 483.1, y: 0 },
          p2: { x: 450.5, y: 43.5 },
          p3: { x: 450.5, y: 43.5 },
          count: 10,
          r: 4
        },
        {
          id: "table3_inner_orbit_left",
          p0: { x: 98, y: 131.1 },
          p1: { x: 125.5, y: 44.5 },
          p2: { x: 199.6, y: 80.2 },
          p3: { x: 211.1, y: 88.1 },
          count: 16,
          r: 4
        },
        {
          id: "table3_inner_orbit_right",
          p0: { x: 642, y: 131.1 },
          p1: { x: 614.5, y: 44.5 },
          p2: { x: 540.4, y: 80.2 },
          p3: { x: 528.9, y: 88.1 },
          count: 16,
          r: 4
        }
      ],
      oneWayCollisionCurves: []
    },

    dropTargets: [
      {
        id: "left_drop_target_1",
        group: "leftDrop",
        x1: 56.3,
        y1: 661.6,
        x2: 67,
        y2: 619.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "left_drop_target_2",
        group: "leftDrop",
        x1: 37.3,
        y1: 734.6,
        x2: 48,
        y2: 692.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_1",
        group: "rightDrop",
        x1: 684.2,
        y1: 661.6,
        x2: 673.5,
        y2: 619.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_2",
        group: "rightDrop",
        x1: 703.2,
        y1: 734.6,
        x2: 692.5,
        y2: 692.5,
        r: 5,
        rebound: 1.2
      }
    ],

    targetIslands: [
      {
        id: "left_target_island",
        targetId: "left_target",
        points: [
          { x: 106, y: 431.5 },
          { x: 142, y: 517.5 },
          { x: 166, y: 504.5 }
        ],
        fill: "#171717"
      },
      {
        id: "right_target_island",
        targetId: "right_target",
        points: [
          { x: 634.5, y: 431.5 },
          { x: 598.5, y: 517.5 },
          { x: 574.5, y: 504.5 }
        ],
        fill: "#171717"
      }
    ],

    targets: [
      {
        id: "center_target",
        type: "centerValue",
        x1: 345,
        y1: 30,
        x2: 394,
        y2: 30,
        r: 5,
        rebound: 2.5
      },
      {
        id: "left_target",
        type: "fixedScore",
        x1: 154,
        y1: 527.5,
        x2: 169,
        y2: 519.5,
        r: 5,
        score: 25,
        rebound: 2.0
      },
      {
        id: "right_target",
        type: "fixedScore",
        x1: 586.5,
        y1: 527.5,
        x2: 571.5,
        y2: 519.5,
        r: 5,
        score: 25,
        rebound: 2.0
      }
    ],

    topLaneDividers: [],

    topLanes: [],

    orbitLaneTriggers: [
      {
        id: "left_small_orbit",
        x: 132.5,
        y: 41.5,
        r: 28,
        score: 25,
        label: "left small orbit",
        cooldownFrames: 12
      },
      {
        id: "right_small_orbit",
        x: 606.5,
        y: 41.5,
        r: 28,
        score: 25,
        label: "right small orbit",
        cooldownFrames: 12
      }
    ],

    spinners: [
      {
        id: "spinner_1",
        rect: {
          x: 330,
          y: 236.5,
          w: 80,
          h: 10,
          angleDeg: 0
        }
      }
    ],

    spawn: {
      x: 705.5,
      y: 286.5,
      launchPowerMin: 19,
      launchPowerMax: 22.5
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
        color: "#fa3",
        activeColor: "#fa3",
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
        color: "#fa3",
        activeColor: "#fa3",
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
        color: "#fa3",
        activeColor: "#fa3",
        triggerGroups: ["rightDrop"],
        durationMs: 8000,
        powerX: 0,
        powerY: -24
      }
    ],

    visual: {
      lineWidth: 4,
      colors: {
        flipper: "#172",
        scoreFlash: "#df5",
        bumperFlashLevel1: "#fa3",
        bumperFlashLevel2: "#172",
      }
    }
  };
})();
