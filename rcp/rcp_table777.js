(() => {
  "use strict";

  window.RCP_TABLES = window.RCP_TABLES || {};

  window.RCP_TABLES.table777 = {
    id: "table777",
    label: "Table 777",
    secondChance: { enabled: true },

    assets: {
      playfieldLogo: true,
      playfieldMask: {
        src: "./svg/maskT777.svg",
        opacity: 1
      },
      howToOverlay: {
        src: "./svg/howToOverlayT777.svg",
        opacity: 1
      }
    },

    ui: {
      displayHints: [
        "SAUCER SPINS SLOT",
        "LOOP BUILDS SLOT",
        "COMBO SETS WIN",
        "BUMPERS BUILD SAUCER",
        "L DROP BUILDS LOOP"
      ],
      ballLostDisplay: "ballLostScore",
      gameOverDisplay: "finalScoreOnly"
    },

    rules: {
      dropTargetGroupResetDelayMs: 2000,

      dropTargetScores: {
        loopValue: {
          hit: 25,
          bankComplete: 100
        },
        combo: {
          hit: 25,
          bankComplete: 100
        }
      },

      bumperScores: [15, 30, 50],
      bumperLevelThresholds: [],
      bumperBonusValueAdd: 0,
      bumperBonusValueThresholds: [],

      spinnerScorePerSpin: 10,
      spinnerBumperLevelThresholds: [],

      topLaneScore: 0,
      topLaneCompleteScore: 0,
      bonusMultMax: 1,

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
      // left lane inner vertical
      { x1: 74, y1: 0, x2: 74, y2: 212, r: 2 },
      // left drop target lane wall
      { x1: 33, y1: 560, x2: -2, y2: 789, r: 2 },
      // loop assist line
      { x1: 523.5, y1: 191.5, x2: 523.5, y2: 283.5, r: 0, restitution: 0.25 },
      { x1: 523.5, y1: 283.5, x2: 610.1, y2: 251.4, r: 0, restitution: 0.25 }
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
      { x: 181.4, y: 121.7, visualR: 50, collisionR: 26, power: 4.5 },
      { x: 328, y: 190.1, visualR: 50, collisionR: 26, power: 4.5 },
      { x: 195.5, y: 282.9, visualR: 50, collisionR: 26, power: 4.5 }
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
        wallArcTop: "M73,1c136,0,261.7,45,366.8,121.3",
        wallArcTargetRight: "M739,729c0-137.7-35.7-267.9-98.2-378.8",
        wallLaneInner: "M74,0v212c0,141,35,194,35,194",
        wallLaneOuter: "M1,374c0,120,32,186,32,186",
        corner: "M74,74.2c0-39.2,21.8-69.4,67.9-69.4",
        loopOval:
          "M640.8,350.2l48.1-47.5c61.1-55.2,65.9-149.5,10.7-210.6-55.2-61.1-149.5-65.9-210.6-10.7l-49.2,40.8",
        loopInnerCircle:
          "M587.5,127.5c-35.3,0-64,28.7-64,64s28.7,64,64,64,64-28.7,64-64-28.7-64-64-64h0Z",
      },
      draw: {
        lineWidth: 4
      },
      collisionCurves: [
        {
          id: "table777_lane_outer",
          p0: { x: 1, y: 374 },
          p1: { x: 1, y: 494 },
          p2: { x: 33, y: 560 },
          p3: { x: 33, y: 560 },
          count: 14,
          r: 4
        },
        {
          id: "table777_lane_inner",
          p0: { x: 74, y: 212 },
          p1: { x: 74, y: 353 },
          p2: { x: 109, y: 406 },
          p3: { x: 109, y: 406 },
          count: 14,
          r: 4
        },
        {
          id: "table777_corner",
          p0: { x: 74, y: 74.2 },
          p1: { x: 74, y: 35 },
          p2: { x: 95.8, y: 4.8 },
          p3: { x: 141.9, y: 4.8 },
          count: 12,
          r: 4
        },
        {
          id: "table777_right_arc",
          p0: { x: 739, y: 729 },
          p1: { x: 739, y: 591.3 },
          p2: { x: 703.3, y: 461.1 },
          p3: { x: 640.8, y: 350.2 },
          count: 24,
          r: 4
        },
        {
          id: "table777_loop_oval_1",
          p0: { x: 640.8, y: 350.2 },
          p1: { x: 656.8, y: 334.4 },
          p2: { x: 672.9, y: 318.5 },
          p3: { x: 688.9, y: 302.7 },
          count: 1,
          r: 4,
          restitution: 0.25
        },
        {
          id: "table777_loop_oval_2",
          p0: { x: 688.9, y: 302.7 },
          p1: { x: 750, y: 247.5 },
          p2: { x: 754.8, y: 153.2 },
          p3: { x: 699.6, y: 92.1 },
          count: 20,
          r: 4,
          restitution: 0.2
        },
        {
          id: "table777_loop_oval_3",
          p0: { x: 699.6, y: 92.1 },
          p1: { x: 644.4, y: 31 },
          p2: { x: 550.1, y: 26.2 },
          p3: { x: 489, y: 81.4 },
          count: 20,
          r: 4,
          restitution: 0.2
        },
        {
          id: "table777_loop_oval_4",
          p0: { x: 489, y: 81.4 },
          p1: { x: 472.6, y: 95 },
          p2: { x: 456.2, y: 108.6 },
          p3: { x: 439.8, y: 122.2 },
          count: 1,
          r: 4,
          restitution: 0.25
        },
        {
          id: "table777_loop_inner_circle_1",
          p0: { x: 587.5, y: 127.5 },
          p1: { x: 552.2, y: 127.5 },
          p2: { x: 523.5, y: 156.2 },
          p3: { x: 523.5, y: 191.5 },
          count: 12,
          r: 0,
          restitution: 0.25
        },
        {
          id: "table777_loop_inner_circle_2",
          p0: { x: 523.5, y: 191.5 },
          p1: { x: 523.5, y: 226.8 },
          p2: { x: 552.2, y: 255.5 },
          p3: { x: 587.5, y: 255.5 },
          count: 12,
          r: 0,
          restitution: 0.25
        },
        {
          id: "table777_loop_inner_circle_3",
          p0: { x: 587.5, y: 255.5 },
          p1: { x: 622.8, y: 255.5 },
          p2: { x: 651.5, y: 226.8 },
          p3: { x: 651.5, y: 191.5 },
          count: 12,
          r: 0,
          restitution: 0.25
        },
        {
          id: "table777_loop_inner_circle_4",
          p0: { x: 651.5, y: 191.5 },
          p1: { x: 651.5, y: 156.2 },
          p2: { x: 622.8, y: 127.5 },
          p3: { x: 587.5, y: 127.5 },
          count: 12,
          r: 0,
          restitution: 0.25
        },
        {
          id: "table777_top_arc",
          p0: { x: 73, y: 1 },
          p1: { x: 209, y: 1 },
          p2: { x: 334.7, y: 46 },
          p3: { x: 439.8, y: 122.3 },
          count: 20,
          r: 4
        }
      ],
      oneWayCollisionCurves: []
    },

    dropTargets: [
      {
        id: "target_left_1",
        group: "loopValue",
        x1: 49.4,
        y1: 599.3,
        x2: 43.6,
        y2: 636.9,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_left_2",
        group: "loopValue",
        x1: 40.7,
        y1: 656.2,
        x2: 34.9,
        y2: 693.8,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_left_3",
        group: "loopValue",
        x1: 32,
        y1: 713.1,
        x2: 26.2,
        y2: 750.6,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_combo_1",
        group: "combo",
        x1: 653.1,
        y1: 417.7,
        x2: 632.7,
        y2: 376.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_combo_2",
        group: "combo",
        x1: 679,
        y1: 481.6,
        x2: 662.3,
        y2: 438.7,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_combo_3",
        group: "combo",
        x1: 699.2,
        y1: 548.4,
        x2: 686.6,
        y2: 504.2,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_combo_4",
        group: "combo",
        x1: 713.3,
        y1: 617.3,
        x2: 704.8,
        y2: 572.2,
        r: 5,
        rebound: 1.2
      },
      {
        id: "target_combo_5",
        group: "combo",
        x1: 721.2,
        y1: 686.4,
        x2: 716.7,
        y2: 640.7,
        r: 5,
        rebound: 1.2
      }
    ],

    loopTriggers: [
      {
        id: "loopTrigger_0",
        x: 676.5,
        y: 256.5,
        r: 30
      },
      {
        id: "loopTrigger_1",
        x: 532.5,
        y: 97.5,
        r: 30
      }
    ],

    orbitBonus: {
      score: 100,
      timeoutMs: 600,
      triggers: [
        {
          id: "orbitTrigger_0",
          x: 113.5,
          y: 302.5,
          r: 30
        },
        {
          id: "orbitTrigger_1",
          x: 125.5,
          y: 50.5,
          r: 30
        },
        {
          id: "orbitTrigger_2",
          x: 377.5,
          y: 125.5,
          r: 30
        }
      ],
      sequences: [
        [0, 1, 2],
        [2, 1, 0]
      ]
    },

    saucers: [
      {
        id: "slot_saucer",
        x: 38,
        y: 39,
        r: 10,
        holdMs: 1200,
        releaseVx: 3,
        releaseVy: 2,
        onEnter: "table777Slot"
      }
    ],

    targets: [],

    targetIslands: [],

    topLaneDividers: [],

    topLanes: [],

    orbitLaneTriggers: [],

    spinners: [],

    spawn: {
      x: 25,
      y: 140,
      launchPowerMin: -0,
      launchPowerMax: -1
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
        color: "#af8",
        activeColor: "#af8",
        triggerGroups: [],
        durationMs: 5000,
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
        color: "#af8",
        activeColor: "#af8",
        triggerGroups: [],
        durationMs: 5000,
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
        color: "#af8",
        activeColor: "#af8",
        triggerGroups: [],
        durationMs: 5000,
        powerX: 0,
        powerY: -24
      }
    ],

    loopCountIndicator: {
      max: 8,
      litColor: "scoreFlash",
      unlitColor: "#000",
      polygons: [
        [
          { x: 591.5, y: 174.5 },
          { x: 583.5, y: 174.5 },
          { x: 580.5, y: 151.5 },
          { x: 594.5, y: 151.5 }
        ],
        [
          { x: 602.35, y: 182.31 },
          { x: 596.69, y: 176.65 },
          { x: 610.83, y: 158.27 },
          { x: 620.73, y: 168.17 }
        ],
        [
          { x: 604.5, y: 195.5 },
          { x: 604.5, y: 187.5 },
          { x: 627.5, y: 184.5 },
          { x: 627.5, y: 198.5 }
        ],
        [
          { x: 596.69, y: 206.35 },
          { x: 602.35, y: 200.69 },
          { x: 620.73, y: 214.83 },
          { x: 610.83, y: 224.73 }
        ],
        [
          { x: 583.5, y: 208.5 },
          { x: 591.5, y: 208.5 },
          { x: 594.5, y: 231.5 },
          { x: 580.5, y: 231.5 }
        ],
        [
          { x: 572.65, y: 200.69 },
          { x: 578.31, y: 206.35 },
          { x: 564.17, y: 224.73 },
          { x: 554.27, y: 214.83 }
        ],
        [
          { x: 570.5, y: 187.5 },
          { x: 570.5, y: 195.5 },
          { x: 547.5, y: 198.5 },
          { x: 547.5, y: 184.5 }
        ],
        [
          { x: 578.31, y: 176.65 },
          { x: 572.65, y: 182.31 },
          { x: 554.27, y: 168.17 },
          { x: 564.17, y: 158.27 }
        ]
      ]
    },

    targetComboIndicator: {
      litColor: "comboLit",
      unlitColor: "#111",
      items: [
        {
          targetId: "target_combo_1",
          d: "M612.8,414.1c-1.1-2.3-1.6-4.6-1.5-6.7s.8-4.1,2.1-5.9,3.2-3.3,5.7-4.5h0c2.5-1.2,4.9-1.8,7.1-1.7s4.2.7,5.9,2c1.7,1.2,3.2,3,4.3,5.3,1,2.1,1.5,4.2,1.4,6.2,0,2-.6,3.8-1.6,5.4-1,1.6-2.4,2.8-4.2,3.7h-.1c0,0-3.1-6.4-3.1-6.4h.2c.7-.5,1.3-1.1,1.7-1.7.4-.6.7-1.3.7-2.1s-.1-1.6-.5-2.4c-.4-.9-1.1-1.6-1.9-2-.8-.4-1.8-.6-2.9-.5s-2.3.5-3.7,1.1h0c-1.3.7-2.4,1.4-3.2,2.2-.8.8-1.3,1.7-1.4,2.6-.2.9,0,1.8.4,2.7.4.8.9,1.4,1.5,1.8.6.4,1.3.7,2.1.8.8,0,1.6,0,2.4-.4h.2c0,0,3.1,6.4,3.1,6.4h-.2c-1.8.9-3.6,1.3-5.5,1.1-1.9-.2-3.6-.9-5.2-2.1-1.6-1.2-2.9-2.8-3.9-4.9Z"
        },
        {
          targetId: "target_combo_2",
          d: "M638.6,473.8c-.9-2.4-1.2-4.7-.9-6.9.3-2.2,1.2-4.1,2.7-5.8s3.5-3,6-4h0c2.5-1,4.9-1.3,7.1-1,2.2.3,4.1,1.1,5.8,2.5s3,3.3,3.9,5.8c.9,2.5,1.2,4.8.9,6.9s-1.2,4.1-2.7,5.8c-1.5,1.7-3.4,3-6,3.9h0c-2.5,1-4.9,1.3-7.1,1.1-2.2-.3-4.1-1.1-5.8-2.5s-3-3.3-3.9-5.8ZM644.3,471.7c.4,1,1,1.8,1.8,2.3.8.5,1.8.8,2.9.8,1.1,0,2.4-.2,3.7-.7h0c1.4-.5,2.5-1.2,3.3-2s1.4-1.6,1.6-2.6.2-1.9-.2-2.9c-.4-1-1-1.7-1.8-2.2-.8-.5-1.8-.8-2.9-.8-1.1,0-2.4.2-3.8.7h0c-1.4.5-2.5,1.2-3.3,2s-1.4,1.6-1.6,2.6c-.3.9-.2,1.9.2,2.8Z"
        },
        {
          targetId: "target_combo_3",
          points: [
            { x: 686.5, y: 537 },
            { x: 670.4, y: 535.8 },
            { x: 670.4, y: 535.6 },
            { x: 683.4, y: 526.1 },
            { x: 681, y: 517.8 },
            { x: 656.6, y: 524.7 },
            { x: 658.4, y: 531 },
            { x: 672.5, y: 527 },
            { x: 672.6, y: 527.1 },
            { x: 660, y: 536.6 },
            { x: 661.1, y: 540.4 },
            { x: 676.7, y: 541.9 },
            { x: 676.8, y: 542 },
            { x: 662.6, y: 546 },
            { x: 664.4, y: 552.2 },
            { x: 688.8, y: 545.3 },
            { x: 686.5, y: 537 }
          ]
        },
        {
          targetId: "target_combo_4",
          d: "M701.1,600.5l-.9-4.9h0s-1.4-7.3-1.4-7.3l-24.9,4.8.7,3.7,1.7,9c.3,1.8.9,3.3,1.8,4.5.8,1.2,1.9,2.1,3.1,2.6,1.2.5,2.5.6,4,.4h0c1.1-.2,2-.7,2.8-1.4s1.3-1.6,1.6-2.7c.3-1,.4-2.1.2-3.2h.1c.3.9.8,1.7,1.4,2.4.6.7,1.4,1.2,2.2,1.5.9.3,1.8.4,2.7.2h0c1.3-.3,2.4-.8,3.2-1.6.8-.8,1.4-1.9,1.6-3.2s.2-2.8,0-4.5ZM686.4,603.4c-.1.6-.3,1.1-.7,1.4-.3.4-.8.6-1.4.7h0c-.9.2-1.6,0-2.2-.5s-1-1.4-1.2-2.5l-.6-3.1,5.4-1,.6,3c.2.8.2,1.5,0,2.1ZM695.5,601.8c-.3.6-.9,1-1.6,1.2h0c-.8.2-1.5,0-2.1-.5s-1-1.3-1.2-2.4l-.5-2.6,5.1-1,.6,2.9c.2.9.1,1.7-.2,2.3Z"
        },
        {
          targetId: "target_combo_5",
          d: "M684.9,666.9c-.3-2.6,0-4.9.9-6.9.9-2,2.2-3.6,4-4.9,1.8-1.2,4.1-2,6.8-2.3h0c2.7-.3,5.1,0,7.1.8,2.1.8,3.7,2.1,5,3.9s2,4,2.3,6.6c.3,2.6,0,4.9-.9,6.9-.9,2-2.2,3.6-4,4.9s-4.1,2-6.8,2.3h0c-2.7.3-5.1,0-7.1-.8-2.1-.8-3.7-2.1-5-3.9-1.3-1.8-2-4-2.3-6.6ZM690.9,666.3c.1,1.1.5,2,1.2,2.7.7.7,1.5,1.2,2.6,1.5s2.4.4,3.8.2h0c1.4-.2,2.7-.5,3.7-1s1.7-1.2,2.2-2.1c.5-.8.7-1.8.6-2.8-.1-1-.5-1.9-1.1-2.6s-1.5-1.2-2.6-1.5c-1.1-.3-2.4-.4-3.8-.2h0c-1.4.2-2.7.5-3.7,1-1,.5-1.7,1.2-2.2,2.1-.5.8-.7,1.8-.6,2.8Z"
        }
      ]
    },

    slotVisual: {
      x: 170,
      y: 387.7,
      w: 400,
      h: 140,
      scale: 1,
      symbolSprite: {
        src: "./svg/777_symbols.svg",
        cellW: 100,
        cellH: 100,
        order: ["seven", "bar", "bell", "kickback", "ballSave"]
      },
      flashColor: "#fff",
      frameColor: "#f7f7f7",
      dividerColor: "#444",
      backColor: "#111",
      panelColor: "#222"
    },

    visual: {
      lineWidth: 4,
      colors: {
        flipper: "#34c",
        scoreFlash: "#af8",
        comboLit: "#f83"
      }
    }
  };
})();
