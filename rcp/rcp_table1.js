(() => {
  "use strict";

  window.RCP_TABLES = window.RCP_TABLES || {};

  window.RCP_TABLES.table1 = {
      id: "table1",
      label: "Table 1",
      secondChance: { enabled: true },

      assets: {
        playfieldLogo: {
          src: "./svg/rcp_logo.svg",
          x: 256,
          y: 876,
          scale: 0.377,
          opacity: 1
        },
        playfieldMask: {
          src: "./svg/maskT1.svg",
          opacity: 1
        },
        titleLogo: {
          src: "./svg/rcp_logo.svg",
          scale: 0.9,
          opacity: 1,
          offsetY: -15
        },
        howToOverlay: {
          src: "./svg/howToOverlayT1.svg",
          opacity: 1
        }
      },

      ui: {
        displayHints: [
          "SPINNERS BUILD ORBIT",
          "R TARGETS BOOST ORBIT",
          "L TARGETS BUILD SPINNER",
          "BUMPERS BUILD BONUS",
          "TOP LANES BOOST MULT"
        ]
      },

      rules: {
        orbitTargetBaseInitialScore: 200,
        orbitTargetBaseAdd: 200,
        orbitTargetBaseMaxScore: 1000,
        orbitBoostBonusScore: 1000,
        orbitBoostDurationMs: 7100,

        spinnerOrbitValueThresholds: [10, 25, 50, 80],

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

        bumperScores: [15],
        bumperLevelThresholds: [],
        bumperBonusValueAdd: 1000,
        bumperBonusValueThresholds: [10, 25, 45, 70, 100],

        spinnerScorePerSpin: 10,
        spinnerValueInitialScore: 10,
        spinnerValueAdd: 10,
        spinnerValueMaxScore: 30,
        spinnerBumperLevelThresholds: [],

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
        // out lane divider
        { x1: 65, y1: 1100, x2: 65, y2: 912, r: 3 },
        { x1: 675, y1: 912, x2: 675, y2: 1100, r: 3 },
        // out lane divider rim
        { x1: 63, y1: 908, x2: 65, y2: 912, r: 3 },
        { x1: 675, y1: 912, x2: 677, y2: 908, r: 3 },
        { x1: 0, y1: 730.5, x2: 47.9, y2: 583.9, r: 4, visualWidth: 4 },
        { x1: 651.5, y1: 499.5, x2: 737.5, y2: 713.5, r: 4, visualWidth: 4 }
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

      orbitValueIndicator: {
        color: "#b12",
        unlitColor: "#060606",
        polygons: [
          [
            { x: 276.3, y: 88 },
            { x: 260.9, y: 40.5 },
            { x: 287.6, y: 58.1 }
          ],
          [
            { x: 312.9, y: 77.6 },
            { x: 299.1, y: 29.6 },
            { x: 325.2, y: 48.1 }
          ],
          [
            { x: 347.1, y: 71.5 },
            { x: 336.7, y: 22.6 },
            { x: 361.5, y: 42.8 }
          ],
          [
            { x: 382.3, y: 66.9 },
            { x: 375.4, y: 17.3 },
            { x: 398.6, y: 39.3 }
          ]
        ]
      },

      orbitBoostIndicator: {
        color: "#0ff",
        cutoutColor: "#171717",
        bodyPolygon: [
          { x: 393.8, y: 13.9 },
          { x: 528.3, y: 13.9 },
          { x: 528.3, y: 56.7 },
          { x: 459.7, y: 70.2 }
        ],
        borderLines: [
          { x1: 476.4, y1: 70.4, x2: 404, y2: 10 },
          { x1: 493, y1: 67.6, x2: 424.9, y2: 10.6 },
          { x1: 508.6, y1: 63.8, x2: 444.2, y2: 10 }
        ],
        borderWidth: 8,
        orbitPath:
          "M236.1,43.7C107,95.6,17.3,214.7,16.6,367.1c-.4,83.9,18.9,150.7,45.8,207.5l32.3-14.7C2.1,371.9,35.7,153.3,236.1,43.7Z"
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
        { x: 370, y: 468, visualR: 37.5, collisionR: 21, power: 4.5, score: 10 },
        { x: 290, y: 358, visualR: 37.5, collisionR: 21, power: 4.5, score: 10 },
        { x: 450, y: 358, visualR: 37.5, collisionR: 21, power: 4.5, score: 10 }
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
          outerLeft:
            "M47.9,583.9C20.4,525.9,2.1,471.5,2.1,371.9,2.1,168.7,166.4,4.5,369.5,4.5h182",
          innerLeft:
            "M133.5,546.5C40.6,382.3,73,160.4,252.5,103.6",
          outerRight: "M455.5,81.5c145,17,302.8,180.2,196,418",
          spinnerLaneLeft:
            "M215.4,516.5c-28.5-50.4-45.2-106.2-49.5-161",
          spinnerLaneRight:
            "M572.5,472.5c18.8-39.4,28.2-76.8,33.1-116.9"
        },

        draw: {
          lineWidth: 4
        },

        collisionCurves: [
          {
            id: "orbit_outer_left_1",
            p0: { x: 47.9, y: 583.9 },
            p1: { x: 20.4, y: 525.9 },
            p2: { x: 2.1, y: 471.5 },
            p3: { x: 2.1, y: 371.9 },
            count: 18,
            r: 4
          },
          {
            id: "orbit_outer_left_2",
            p0: { x: 2.1, y: 371.9 },
            p1: { x: 2.1, y: 168.7 },
            p2: { x: 166.4, y: 4.5 },
            p3: { x: 369.5, y: 4.5 },
            count: 18,
            r: 4
          },
          {
            id: "orbit_outer_left_3",
            p0: { x: 369.5, y: 4.5 },
            p1: { x: 430.2, y: 4.5 },
            p2: { x: 490.8, y: 4.5 },
            p3: { x: 551.5, y: 4.5 },
            count: 10,
            r: 4
          },
          {
            id: "orbit_inner_left_1",
            p0: { x: 133.5, y: 546.5 },
            p1: { x: 87.1, y: 464.4 },
            p2: { x: 71.9, y: 367.9 },
            p3: { x: 90.9, y: 284.8 },
            count: 14,
            r: 4
          },
          {
            id: "orbit_inner_left_2",
            p0: { x: 90.9, y: 284.8 },
            p1: { x: 109.8, y: 201.7 },
            p2: { x: 162.8, y: 132 },
            p3: { x: 252.5, y: 103.6 },
            count: 14,
            r: 4
          },
          {
            id: "orbit_outer_right",
            p0: { x: 455.5, y: 81.5 },
            p1: { x: 600.5, y: 98.5 },
            p2: { x: 758.3, y: 261.7 },
            p3: { x: 651.5, y: 499.5 },
            count: 32,
            r: 5
          },
          {
            id: "spinner_lane_right",
            p0: { x: 572.5, y: 472.5 },
            p1: { x: 591.3, y: 433.1 },
            p2: { x: 600.7, y: 395.7 },
            p3: { x: 605.6, y: 355.6 },
            count: 10,
            r: 4
          },
          {
            id: "spinner_lane_left",
            p0: { x: 215.4, y: 516.5 },
            p1: { x: 186.9, y: 466.1 },
            p2: { x: 170.2, y: 410.3 },
            p3: { x: 165.9, y: 355.5 },
            count: 12,
            r: 4
          }
        ],

        oneWayCollisionCurves: []
      },

      dropTargets: [
        {
          id: "drop_target_left_1",
          group: "orbitValue",
          x1: 46.5,
          y1: 646.5,
          x2: 56.6,
          y2: 618.2,
          r: 5,
          rebound: 1.2
        },
        {
          id: "drop_target_left_2",
          group: "orbitValue",
          x1: 28.5,
          y1: 700.5,
          x2: 38.6,
          y2: 672.2,
          r: 5,
          rebound: 1.2
        },
        {
          id: "drop_target_right_1",
          group: "orbitBoost",
          x1: 642.9,
          y1: 535.2,
          x2: 654.1,
          y2: 564.9,
          r: 5,
          rebound: 1.2
        },
        {
          id: "drop_target_right_2",
          group: "orbitBoost",
          x1: 663.9,
          y1: 588.2,
          x2: 675.1,
          y2: 615.9,
          r: 5,
          rebound: 1.2
        },
        {
          id: "drop_target_right_3",
          group: "orbitBoost",
          x1: 684.9,
          y1: 643.2,
          x2: 696.1,
          y2: 668.9,
          r: 5,
          rebound: 1.2
        }
      ],
      targets: [
        {
          id: "target_1",
          x1: 536.5,
          y1: 15.5,
          x2: 536.5,
          y2: 51.5,
          r: 5,
          score: 50,
          rebound: 2.5,
          wall: {
            x1: 551.5,
            y1: 4.5,
            x2: 551.5,
            y2: 62.5,
            r: 4
          },
          wallBottom: {
            x1: 551.5,
            y1: 62.5,
            x2: 455.5,
            y2: 81.5,
            r: 4
          }
        }
      ],

      topLaneDividers: [
        { id: "top_lane_divider_1", x1: 235.5, y1: 209, x2: 235.5, y2: 259, r: 3 },
        { id: "top_lane_divider_2", x1: 325.5, y1: 209, x2: 325.5, y2: 259, r: 3 },
        { id: "top_lane_divider_3", x1: 415.5, y1: 209, x2: 415.5, y2: 259, r: 3 },
        { id: "top_lane_divider_4", x1: 505.5, y1: 209, x2: 505.5, y2: 259, r: 3 }
      ],

      topLanes: [
        {
          id: "top_lane_1",
          indicator: { x: 280, y: 234, r: 13 },
          trigger: { x1: 258, y1: 234, x2: 302, y2: 234, r: 4 },
          score: 10
        },
        {
          id: "top_lane_2",
          indicator: { x: 370, y: 234, r: 13 },
          trigger: { x1: 348, y1: 234, x2: 392, y2: 234, r: 4 },
          score: 10
        },
        {
          id: "top_lane_3",
          indicator: { x: 461, y: 234, r: 13 },
          trigger: { x1: 439, y1: 234, x2: 483, y2: 234, r: 4 },
          score: 10
        }
      ],

      loopBonus: {
        score: 100,
        timeoutMs: 1800,
        centerTrigger: { x: 366, y: 118, r: 28 }
      },

      orbitLaneTriggers: [
        {
          id: "orbit_trigger",
          x: 108.5,
          y: 164.5,
          r: 28,
          score: 25,
          label: "orbit pass",
          cooldownFrames: 12
        }
      ],

      orbitSound: {
        cooldownMs: 250,
        upTrigger: { x: 54, y: 464, r: 30 },
        downTrigger: { x: 177, y: 101, r: 30 }
      },

      spinners: [
        {
          id: "spinner_left",
          rect: {
            x: 135.5,
            y: 507.5,
            w: 60,
            h: 10,
            angleDeg: -25.7
          },
          scorePerSpin: 5
        },
        {
          id: "spinner_right",
          rect: {
            x: 618.2,
            y: 428.7,
            w: 10,
            h: 60,
            angleDeg: -69.1
          },
          scorePerSpin: 5
        }
      ],

      spawn: {
        x: 648.5,
        y: 325,
        launchPowerMin: 19,
        launchPowerMax: 22.5,
      },

      visual: {
        lineWidth: 4
      }
  };
})();
