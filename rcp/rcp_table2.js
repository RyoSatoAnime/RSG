(() => {
  "use strict";

  window.RCP_TABLES = window.RCP_TABLES || {};

  window.RCP_TABLES.table2 = {
    id: "table2",
    label: "Table 2",
    secondChance: { enabled: true },

    assets: {
      playfieldLogo: true,
      playfieldMask: {
        src: "./svg/maskT2.svg",
        opacity: 1
      },
      howToOverlay: {
        src: "./svg/howToOverlayT2.svg",
        opacity: 1
      }
    },

    ui: {
      displayHints: [
        "AIM TOP DROP",
        "BUMPERS BUILD BONUS",
        "TOP LANES BOOST MULT",
        "R DROP FOR BALL SAVE",
        "L DROP FOR KICKBACKS"
      ]
    },

    rules: {
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
          bankComplete: 50
        },
        orbitBoost: {
          hit: 25,
          bankComplete: 75
        },
        leftDrop: {
          hit: 25,
          bankComplete: 50
        },
        rightDrop: {
          hit: 25,
          bankComplete: 50
        },
        topDrop: {
          hit: 25,
          bankComplete: 250
        }
      },

      bumperScores: [15, 30, 50],
      bumperBonusValueAdd: 1000,
      bumperBonusValueThresholds: [10, 25, 45, 70, 100],

      spinnerScorePerSpin: 10,
      spinnerBumperLevelThresholds: [25, 100],

      topLaneScore: 10,
      topLaneCompleteScore: 200,
      bonusMultMax: 5,

      wallBumpScore: 5,

      loopBonusScore: 100
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
      // wall_spinner
      { x1: 740.1, y1: 341.5, x2: 675.5, y2: 616.5, r: 2 },
      { x1: 675.5, y1: 616.5, x2: 740, y2: 788, r: 2 },
      // wall_target_left
      { x1: 88.5, y1: 604.5, x2: 0.5, y2: 783.5, r: 2 },
      // wall_target_top diagonal
      { x1: 568.6, y1: 170.1, x2: 491.7, y2: -0.2, r: 2 },
      // out lane divider
      { x1: 65, y1: 1100, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 912, x2: 675, y2: 1100, r: 3 },
      // out lane divider rim
      { x1: 63, y1: 908, x2: 65, y2: 912, r: 3 },
      { x1: 675, y1: 912, x2: 677, y2: 908, r: 3 },
      // spinner_divider
      { x1: 599.5, y1: 545.5, x2: 587.4, y2: 586.2, r: 3 }
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

    orbitValueIndicators: [],

    topDropValueIndicator: {
      shape: "triangle3",
      x: 565,
      y: 6,
      angleDeg: 66,
      scale: 1,
      color: "#3fe",
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
      { x: 438, y: 551, visualR: 37.5, collisionR: 21, power: 4.5 },
      { x: 358, y: 441, visualR: 37.5, collisionR: 21, power: 4.5 },
      { x: 518, y: 441, visualR: 37.5, collisionR: 21, power: 4.5 }
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
        wallOrbit: "M88.5,604.5C-139.5,113.5,101.5.3,492,.3",
        orbitDivider1: "M195.8,386.9c-43.5-144.9-6.7-189.3,121.7-225.4",
        orbitDivider2: "M140.7,498.8C39.6,232.9,90.5,134.4,296.5,90.5",
        wallTargetTop:
          "M740.5.5l-.4,341s3.9-88.6-51.6-136c-55-47-119.9-35.4-119.9-35.4L491.7-.2l248.8.7Z"
      },
      draw: {
        lineWidth: 4
      },
      collisionCurves: [
        {
          id: "table2_wall_orbit",
          p0: { x: 88.5, y: 604.5 },
          p1: { x: -139.5, y: 113.5 },
          p2: { x: 101.5, y: 0.3 },
          p3: { x: 492, y: 0.3 },
          count: 36,
          r: 5
        },
        {
          id: "table2_orbit_divider_1",
          p0: { x: 195.8, y: 386.9 },
          p1: { x: 152.3, y: 242.0 },
          p2: { x: 189.1, y: 197.6 },
          p3: { x: 317.5, y: 161.5 },
          count: 24,
          r: 4
        },
        {
          id: "table2_orbit_divider_2",
          p0: { x: 140.7, y: 498.8 },
          p1: { x: 39.6, y: 232.9 },
          p2: { x: 90.5, y: 134.4 },
          p3: { x: 296.5, y: 90.5 },
          count: 32,
          r: 4
        },
        {
          id: "table2_wall_target_top_curve_1",
          p0: { x: 740.1, y: 341.5 },
          p1: { x: 740.1, y: 341.5 },
          p2: { x: 744.0, y: 252.9 },
          p3: { x: 688.5, y: 205.5 },
          count: 14,
          r: 4
        },
        {
          id: "table2_wall_target_top_curve_2",
          p0: { x: 688.5, y: 205.5 },
          p1: { x: 633.5, y: 158.5 },
          p2: { x: 568.6, y: 170.1 },
          p3: { x: 568.6, y: 170.1 },
          count: 12,
          r: 4
        }
      ],
      oneWayCollisionCurves: []
    },

    dropTargets: [
      {
        id: "left_drop_target_1",
        group: "leftDrop",
        x1: 74.6,
        y1: 679.9,
        x2: 91.5,
        y2: 645.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "left_drop_target_2",
        group: "leftDrop",
        x1: 45.9,
        y1: 738.4,
        x2: 62.8,
        y2: 704,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_1",
        group: "rightDrop",
        x1: 681,
        y1: 690.4,
        x2: 667.5,
        y2: 654.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "right_drop_target_2",
        group: "rightDrop",
        x1: 704,
        y1: 751.4,
        x2: 690.5,
        y2: 715.5,
        r: 5,
        rebound: 1.2
      },
      {
        id: "top_drop_target_1",
        group: "topDrop",
        x1: 492.4,
        y1: 55.5,
        x2: 478.9,
        y2: 25.6,
        r: 5,
        rebound: 1.2
      },
      {
        id: "top_drop_target_2",
        group: "topDrop",
        x1: 516.4,
        y1: 108.5,
        x2: 502.9,
        y2: 78.6,
        r: 5,
        rebound: 1.2
      },
      {
        id: "top_drop_target_3",
        group: "topDrop",
        x1: 540.4,
        y1: 161.5,
        x2: 526.9,
        y2: 131.6,
        r: 5,
        rebound: 1.2
      }
    ],

    targets: [],

    topLaneDividers: [
      { id: "top_lane_divider_1", x1: 303.5, y1: 278.7, x2: 303.5, y2: 328.7, r: 3 },
      { id: "top_lane_divider_2", x1: 393.5, y1: 278.7, x2: 393.5, y2: 328.7, r: 3 },
      { id: "top_lane_divider_3", x1: 483.5, y1: 278.7, x2: 483.5, y2: 328.7, r: 3 },
      { id: "top_lane_divider_4", x1: 573.5, y1: 278.7, x2: 573.5, y2: 328.7, r: 3 }
    ],

    topLanes: [
      {
        id: "top_lane_1",
        indicator: { x: 348, y: 304, r: 13 },
        trigger: { x1: 316, y1: 304, x2: 380, y2: 304, r: 4 }
      },
      {
        id: "top_lane_2",
        indicator: { x: 438, y: 304, r: 13 },
        trigger: { x1: 406, y1: 304, x2: 470, y2: 304, r: 4 }
      },
      {
        id: "top_lane_3",
        indicator: { x: 529, y: 304, r: 13 },
        trigger: { x1: 497, y1: 304, x2: 561, y2: 304, r: 4 }
      }
    ],

    orbitLaneTriggers: [
      {
        id: "outer_orbit_trigger",
        x: 171.5,
        y: 88.5,
        r: 30,
        score: 25,
        label: "outer orbit"
      },
      {
        id: "inner_orbit_trigger",
        x: 206.5,
        y: 163.5,
        r: 30,
        score: 25,
        label: "inner orbit"
      }
    ],

    loopRoute: {
      score: 100,
      timeoutMs: 1300,
      triggers: [
        {
          id: "loop_start_trigger",
          x: 245.5,
          y: 238.5,
          r: 30
        },
        {
          id: "loop_mid_trigger",
          x: 454.5,
          y: 212.5,
          r: 30
        },
        {
          id: "loop_trigger",
          x: 697.5,
          y: 308.5,
          r: 30
        }
      ],
      sequences: [
        [0, 1, 2],
        [2, 1, 0]
      ]
    },

    spinners: [
      {
        id: "spinner_right",
        rect: {
          x: 632,
          y: 548,
          w: 10,
          h: 60,
          angleDeg: -75
        }
      }
    ],

    spawn: {
      x: 703,
      y: 478,
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
        color: "#88e",
        activeColor: "#88e",
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
        color: "#88e",
        activeColor: "#88e",
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
        color: "#88e",
        activeColor: "#88e",
        triggerGroups: ["rightDrop"],
        durationMs: 8000,
        powerX: 0,
        powerY: -24
      }
    ],

    visual: {
      lineWidth: 4,
      colors: {
        flipper: "#c4a",
        scoreFlash: "#3fe",
        bumperFlashLevel1: "#88e"
      }
    }
  };
})();
