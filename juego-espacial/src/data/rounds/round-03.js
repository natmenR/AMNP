export const round03 = {
  id: 'round-03',
  number: 3,
  title: 'Solar Conjunction',
  speaker: 'Ship System',
  alert: false,

  report: {
    liveData: false,
    pages: [
      {
        text: 'Later in the mission, your crew is working at the Mars habitat. The Sun is between Earth and Mars, and its outer atmosphere can disturb radio signals. Mission Control has paused new commands for two weeks.',
      },
    ],
  },

  decision: {
    pages: [
      {
        text: 'Your instruments and manuals still work. Choose how to keep the base running while Earth is quiet.',
      },
    ],
    title: 'Solar Conjunction',
    prompt: 'How will you help the crew?',
    options: [
      {
        id: 'offline-kit',
        label: 'Pack an Offline Kit',
        minigame: {
          type: 'offlineKit',
          intro: 'You have six storage units. Save the three files the crew will need while the radio is offline.',
        },
        outcomes: { win: 'kit-win', lose: 'kit-lose' },
      },
      {
        id: 'habitat-drill',
        label: 'Run the Habitat Drill',
        minigame: {
          type: 'habitatDrill',
          intro: 'Three alarms need your attention. Read the onboard manual and choose a safe action for each alarm.',
        },
        outcomes: { win: 'drill-win', lose: 'drill-lose' },
      },
    ],
  },

  outcomes: {
    'kit-win': {
      tone: 'good',
      text: 'Your crew used the offline files to check the base. When the signal returned, you sent your mission log to Earth.',
      effects: { energy: -4 },
    },
    'kit-lose': {
      tone: 'mixed',
      text: 'Your kit was missing a key file. The crew used extra energy to search for a backup copy.',
      effects: { energy: -8 },
    },
    'drill-win': {
      tone: 'good',
      text: 'You cleared all three alarms. When the signal returned, you sent Earth a report on the repairs.',
      effects: { energy: -3 },
    },
    'drill-lose': {
      tone: 'mixed',
      text: 'The safety system took over after two wrong actions. The crew stayed safe, but the base used extra energy and oxygen.',
      effects: { energy: -7, lifeSupport: -5 },
    },
  },

  fact: {
    title: 'Based on a true story',
    text: 'During solar conjunction, NASA plans tasks in advance so its Mars rovers can keep working while new radio commands are paused.',
  },
};
