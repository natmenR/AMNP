
/**
 * 980 DAYS: MISSION MARS
 * ROUND 02 — MARS TERRAIN RECONNAISSANCE
 *
 * Mission:
 * Survey the Martian surface before beginning
 * further exploration operations.
 *
 * Available routes:
 * A. Rocky Shortcut — Manual rover driving
 * B. Longer Surveyed Corridor — Autonomous planning
 * C. Remote Terrain Mapping — Radar classification
 *
 * Uses the existing round-flow.js controller.
 *
 * @typedef {import('./round-01.js').Round} Round
 */

import { GAME } from '../../config.js';

const name = GAME.playerName;

/** @type {Round} */
export const round02 = {
  id: 'round-02',
  number: 2,
  title: 'Mars Terrain Reconnaissance',
  speaker: 'AURA',
  alert: false,

  // ==========================================================
  // 1. INITIAL MISSION REPORT
  // ==========================================================

  report: {
    liveData: false,

    pages: [
      {
        text:
          `Welcome to the Martian surface, ${name}. ` +
          'This is AURA, your onboard artificial ' +
          'intelligence assistant. Our landing is ' +
          'complete, but the terrain surrounding ' +
          'the habitat has not yet been fully surveyed.'
      },

      {
        text:
          'Before the crew can travel beyond the ' +
          'habitat, we need to identify safe corridors, ' +
          'dangerous obstacles, and locations that ' +
          'may contain valuable scientific evidence.',
        notes: [
          {
            term: 'Terrain reconnaissance',
            text:
              'The process of observing and mapping ' +
              'an area to identify its features, ' +
              'hazards, and possible travel routes.'
          }
        ]
      },

      {
        text:
          'Our exploration rover is ready for its ' +
          'first assignment. Three scientific sites ' +
          'have been identified: ALPHA, BETA, and ' +
          'GAMMA. Each site may help us understand ' +
          'the surrounding Martian environment.',
        notes: [
          {
            term: 'Rover',
            text:
              'A robotic vehicle designed to move ' +
              'across the surface of another world ' +
              'and collect scientific information.'
          }
        ]
      },

      {
        text:
          'MISSION CONTROL: Commander, remember ' +
          'that reaching a destination is only ' +
          'part of the mission. The rover must ' +
          'also preserve enough energy to return ' +
          'to the habitat safely.'
      }
    ]
  },

  // ==========================================================
  // 2. MISSION DECISION
  // ==========================================================

  decision: {
    pages: [
      {
        text:
          'AURA: Our preliminary scans show several ' +
          'possible approaches. Some paths are ' +
          'shorter but contain difficult terrain. ' +
          'Others are longer but easier to navigate.',
        notes: [
          {
            term: 'Regolith',
            text:
              'The layer of loose dust, sand, and ' +
              'broken rock covering the surface ' +
              'of Mars.'
          }
        ]
      },

      {
        text:
          'MISSION CONTROL: Driving across rocky ' +
          'ground can consume additional power. ' +
          'An apparently shorter path is not ' +
          'always the most energy-efficient one.',
        notes: [
          {
            term: 'Energy efficiency',
            text:
              'Completing a task while minimizing ' +
              'the amount of energy required.'
          }
        ]
      },

      {
        text:
          'AURA: We have three possible strategies. ' +
          'You may control the rover manually, ' +
          'program an autonomous expedition, ' +
          'or remain at the habitat and map ' +
          'the surrounding terrain remotely.'
      },

      {
        text:
          'MISSION CONTROL: Each strategy offers ' +
          'different advantages and risks. ' +
          'Consider how much information we ' +
          'need, how much energy we can spend, ' +
          'and whether the rover can return safely.'
      }
    ],

    title: 'Mars Terrain Reconnaissance',

    prompt:
      'How will you survey the Martian surface?',

    options: [

      // ======================================================
      // ROUTE A — ROCKY SHORTCUT
      // ======================================================

      {
        id: 'rocky-shortcut',

        label:
          'A — Rocky shortcut: Drive the rover ' +
          'manually through hazardous terrain, ' +
          'scan three science sites, and return ' +
          'to the habitat.',

        minigame: {
          type: 'marsRoverDrive',

          intro:
            `Manual rover controls activated, ${name}. ` +
            'Use the arrow keys or WASD to navigate ' +
            'the Martian surface. Reach ALPHA, BETA, ' +
            'and GAMMA, then press Space to scan ' +
            'each site. Avoid impassable rocks, ' +
            'monitor battery consumption, and ' +
            'return to the habitat.',

          config: {
            route: 'A',
            siteCount: 3,
            requireReturn: true,
            rockyTerrainCost: 3,
            normalTerrainCost: 1
          }
        },

        outcomes: {
          win: 'rocky-win',
          lose: 'rocky-lose'
        }
      },

      // ======================================================
      // ROUTE B — LONGER SURVEYED CORRIDOR
      // ======================================================

      {
        id: 'surveyed-corridor',

        label:
          'B — Longer surveyed corridor: Plan ' +
          'an autonomous route through three ' +
          'science sites while preserving enough ' +
          'battery for the return journey.',

        minigame: {
          type: 'marsRoutePlanner',

          intro:
            `Autonomous navigation system ready, ${name}. ` +
            'Select the order in which the rover ' +
            'will visit ALPHA, BETA, and GAMMA. ' +
            'Review the estimated battery cost ' +
            'before executing the expedition. ' +
            'Your plan must include the return ' +
            'journey to the habitat.',

          config: {
            route: 'B',
            siteCount: 3,
            requireReturn: true,
            requireAllSites: true
          }
        },

        outcomes: {
          win: 'corridor-win',
          lose: 'corridor-lose'
        }
      },

      // ======================================================
      // ROUTE C — REMOTE TERRAIN MAPPING
      // ======================================================

      {
        id: 'remote-mapping',

        label:
          'C — Remote terrain mapping: Keep ' +
          'the rover at the habitat, align the ' +
          'radar antenna, and classify four ' +
          'terrain sectors.',

        minigame: {
          type: 'marsRadarScan',

          intro:
            `Remote scanning system online, ${name}. ` +
            'The rover will remain at the habitat. ' +
            'Select a sector, align the radar ' +
            'antenna with its signal direction, ' +
            'and scan the terrain. Use the ' +
            'returned signal to classify each ' +
            'sector. You have eight scan attempts.',

          config: {
            route: 'C',
            sectorCount: 4,
            maxAttempts: 8,
            bearingTolerance: 15
          }
        },

        outcomes: {
          win: 'radar-win',
          lose: 'radar-lose'
        }
      }
    ]
  },

  // ==========================================================
  // 3. MISSION OUTCOMES
  //
  // Effects use the three existing HUD resources:
  // energy, lifeSupport, shielding.
  //
  // These are proposed gameplay balance values.
  // ==========================================================

  outcomes: {

    // --------------------------------------------------------
    // ROUTE A — SUCCESS
    // --------------------------------------------------------

    'rocky-win': {
      tone: 'good',

      text:
        `End of Round 2 Report, ${name}. ` +
        'Excellent rover control! You successfully ' +
        'navigated the rocky shortcut, scanned ' +
        'ALPHA, BETA, and GAMMA, and returned ' +
        'the rover to the habitat. The expedition ' +
        'provided a complete local terrain survey, ' +
        'although the difficult ground required ' +
        'additional power. Energy -15%, ' +
        'Life Support +5%, Shielding unchanged.',

      effects: {
        energy: -15,
        lifeSupport: 5,
        shielding: 0
      }
    },

    // --------------------------------------------------------
    // ROUTE A — FAILURE
    // --------------------------------------------------------

    'rocky-lose': {
      tone: 'bad',

      text:
        `End of Round 2 Report, ${name}. ` +
        'The manual rover expedition did not ' +
        'meet its objectives. Hazardous terrain, ' +
        'incomplete scans, or insufficient ' +
        'return reserves prevented a successful ' +
        'survey. The mission consumed valuable ' +
        'power without producing a complete map. ' +
        'Energy -25%, Life Support unchanged, ' +
        'Shielding unchanged.',

      effects: {
        energy: -25,
        lifeSupport: 0,
        shielding: 0
      }
    },

    // --------------------------------------------------------
    // ROUTE B — SUCCESS
    // --------------------------------------------------------

    'corridor-win': {
      tone: 'good',

      text:
        `End of Round 2 Report, ${name}. ` +
        'Your autonomous expedition was ' +
        'successful. The rover visited all three ' +
        'science sites and returned to the ' +
        'habitat using the planned route. ' +
        'Mission Control has received a complete ' +
        'terrain survey and valuable navigation ' +
        'data for future operations. Energy -10%, ' +
        'Life Support +5%, Shielding unchanged.',

      effects: {
        energy: -10,
        lifeSupport: 5,
        shielding: 0
      }
    },

    // --------------------------------------------------------
    // ROUTE B — FAILURE
    // --------------------------------------------------------

    'corridor-lose': {
      tone: 'bad',

      text:
        `End of Round 2 Report, ${name}. ` +
        'The autonomous expedition could not ' +
        'be completed as planned. The selected ' +
        'waypoint order did not satisfy the ' +
        'mission requirements or available ' +
        'energy reserves. Our surface map ' +
        'remains incomplete. Energy -15%, ' +
        'Life Support unchanged, ' +
        'Shielding unchanged.',

      effects: {
        energy: -15,
        lifeSupport: 0,
        shielding: 0
      }
    },

    // --------------------------------------------------------
    // ROUTE C — SUCCESS
    // --------------------------------------------------------

    'radar-win': {
      tone: 'mixed',

      text:
        `End of Round 2 Report, ${name}. ` +
        'The remote terrain survey was ' +
        'successful. You aligned the antenna ' +
        'and classified all four sectors ' +
        'without deploying the rover. This ' +
        'preserved most of our mobility ' +
        'resources, but the remote observations ' +
        'provide only a partial terrain map ' +
        'compared with a direct rover survey. ' +
        'Energy -5%, Life Support unchanged, ' +
        'Shielding unchanged.',

      effects: {
        energy: -5,
        lifeSupport: 0,
        shielding: 0
      }
    },

    // --------------------------------------------------------
    // ROUTE C — FAILURE
    // --------------------------------------------------------

    'radar-lose': {
      tone: 'bad',

      text:
        `End of Round 2 Report, ${name}. ` +
        'The remote scanning operation did ' +
        'not produce enough verified terrain ' +
        'classifications. The available ' +
        'antenna scans have been exhausted ' +
        'or the survey was ended early. ' +
        'The rover remains safely at the ' +
        'habitat, but our terrain information ' +
        'is limited. Energy -5%, ' +
        'Life Support unchanged, ' +
        'Shielding unchanged.',

      effects: {
        energy: -5,
        lifeSupport: 0,
        shielding: 0
      }
    }
  },

  // ==========================================================
  // 4. SCIENTIFIC EXPLANATION
  // ==========================================================

  fact: {
    title: 'Quick Science — Exploring Mars',

    text:
      'NASA Mars rovers use cameras, scientific ' +
      'instruments, and autonomous navigation ' +
      'systems to study the Martian surface. ' +
      'Mission teams must consider obstacles, ' +
      'terrain conditions, communication delays, ' +
      'and available power when planning rover ' +
      'activities. Orbital and remote observations ' +
      'can complement direct surface exploration.'
  }
};
