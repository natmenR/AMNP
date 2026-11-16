
export const round02 = {
  id: 'round-02',
  number: 2,
  title: 'MARS TERRAIN RECONNAISSANCE',
  speaker: 'AURA',
  alert: false,

  report: {
    liveData: false,
    pages: [
      {
        text: 'MISSION LOG — DAY 980. After months of travel, your crew has reached Mars. The habitat is operational, but the surrounding terrain remains largely unexplored.',
      },
      {
        text: 'AURA: Commander, our orbital maps are incomplete. Rocky formations, unstable ground, and unknown surface conditions could threaten future expeditions.',
      },
      {
        text: 'MISSION CONTROL: Your next objective is to identify three scientific locations and gather enough information to establish a safe exploration route.',
      },
      {
        text: 'AURA: Our rover has limited battery capacity. Every movement, scan, and navigation decision must be carefully planned.',
      },
    ],
  },

  decision: {
    pages: [
      {
        text: 'AURA: I have identified three possible reconnaissance strategies. Each one offers different advantages and risks.',
      },
      {
        text: 'MISSION CONTROL: Choose your approach carefully. Your decision will determine how the crew explores the Martian surface.',
      },
    ],

    title: 'Round 2',
    prompt: 'How will you explore the Martian terrain?',

    options: [
      {
        id: 'rocky-shortcut',
        label: 'A — Rocky Shortcut',
        minigame: {
          type: 'marsRoverDrive',
          intro: 'Drive the rover across the Martian surface. Reach and scan all three scientific sites, manage your battery, and return safely to the habitat.',
        },
        outcomes: {
          win: 'rover-win',
          lose: 'rover-lose',
        },
      },

      {
        id: 'surveyed-corridor',
        label: 'B — Surveyed Corridor',
        minigame: {
          type: 'marsRoutePlanner',
          intro: 'Plan an efficient route between the three scientific sites. Consider terrain costs, available battery, and the safest path back to the habitat.',
        },
        outcomes: {
          win: 'planner-win',
          lose: 'planner-lose',
        },
      },

      {
        id: 'remote-mapping',
        label: 'C — Remote Mapping',
        minigame: {
          type: 'marsRadarScan',
          intro: 'Operate the remote radar system. Adjust its orientation, scan the terrain, and classify the detected sectors using a limited number of attempts.',
        },
        outcomes: {
          win: 'radar-win',
          lose: 'radar-lose',
        },
      },
    ],
  },

  outcomes: {
    'rover-win': {
      tone: 'good',
      text: 'AURA: Reconnaissance complete. The rover successfully scanned all three scientific sites and returned to the habitat. Your crew now has valuable terrain data for future expeditions.',
      effects: {
        energy: -5,
        lifeSupport: 0,
        shielding: 0,
      },
    },

    'rover-lose': {
      tone: 'mixed',
      text: 'AURA: The rover expedition encountered unexpected difficulties. Additional resources were required to recover the mission, and some scientific observations remain incomplete.',
      effects: {
        energy: -12,
        lifeSupport: -3,
        shielding: 0,
      },
    },

    'planner-win': {
      tone: 'good',
      text: 'MISSION CONTROL: Excellent navigation planning. Your selected route minimized unnecessary movement, allowing the rover to complete its scientific survey while preserving valuable energy.',
      effects: {
        energy: -3,
        lifeSupport: 0,
        shielding: 0,
      },
    },

    'planner-lose': {
      tone: 'mixed',
      text: 'AURA: The planned route proved inefficient. The rover consumed additional energy while navigating difficult terrain, forcing the crew to adjust the expedition.',
      effects: {
        energy: -10,
        lifeSupport: -2,
        shielding: 0,
      },
    },

    'radar-win': {
      tone: 'good',
      text: 'AURA: Remote terrain analysis complete. The radar successfully identified the relevant surface sectors, allowing the crew to gather scientific information without exposing the rover to hazardous terrain.',
      effects: {
        energy: -4,
        lifeSupport: 0,
        shielding: 0,
      },
    },

    'radar-lose': {
      tone: 'mixed',
      text: 'AURA: The radar survey produced incomplete results. Several sectors remain uncertain, and additional scans will be necessary before the crew can safely explore the area.',
      effects: {
        energy: -8,
        lifeSupport: 0,
        shielding: -3,
      },
    },
  },

  fact: {
    title: 'Based on a true story',
    text: 'NASA Mars rovers use onboard navigation systems, cameras, and scientific instruments to investigate the Martian surface. Because communication with Earth involves delays, rovers can perform certain navigation tasks autonomously while mission teams plan their exploration routes.',
  },
};
