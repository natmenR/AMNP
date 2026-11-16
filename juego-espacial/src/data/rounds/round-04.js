export const round04 = {
  id: 'round-04',
  number: 4,
  title: 'Return Home',
  speaker: 'Ship System',
  alert: true,

  report: {
    liveData: false,
    pages: [
      {
        text: 'Mission complete on Mars! Our cargo bay is packed with red rocks and science samples, and it is time to fly home to Earth.',
        notes: [{ term: 'Alert', text: 'Engines ready. Set course for Earth.' }],
      },
    ],
  },

  decision: {
    pages: [
      {
        text: 'To escape Mars, our rockets need a huge burst of power. At the same time, invisible space rays are shooting across our path, and our water tanks are the best shield we have.',
      },
    ],
    title: 'Ready for Blast-Off',
    prompt: 'Water protects us from space rays, but heavy water tanks make the rocket harder to lift. How should we prepare the ship for the trip home?',
    options: [
      {
        id: 'heavy-shield',
        label: 'Keep the Heavy Water Shield: Keep all water tanks full around the cabin to block space rays, even though the extra weight uses up a lot of battery power.',
        minigame: {
          type: 'shieldZap',
          intro: 'Space rays are heading toward the cabin. Tap the incoming rays to block them before they hit the ship.',
        },
        outcomes: { win: 'shield-win', lose: 'shield-lose' },
      },
      {
        id: 'light-rocket',
        label: 'Fly Light and Fast: Drop extra cargo and water to make the rocket super light and save battery power, leaving a thinner shield for the trip home.',
        minigame: {
          type: 'rocketBoost',
          intro: 'Time to launch! Hit the launch button when the power bar reaches the green zone to blast away from Mars.',
        },
        outcomes: { win: 'boost-win', lose: 'boost-lose' },
      },
    ],
  },

  outcomes: {
    'shield-win': {
      tone: 'good',
      text: 'Great job! The water shield blocked the space rays and kept the crew safe, though lifting all that water drained a lot of battery power.',
      effects: { energy: -20, shielding: 15 },
    },
    'shield-lose': {
      tone: 'mixed',
      text: 'Some space rays slipped past the shield and drained our systems, and the heavy ship used up a lot of battery power.',
      effects: { energy: -30, lifeSupport: -10, shielding: 10 },
    },
    'boost-win': {
      tone: 'good',
      text: 'Awesome launch! The light rocket shot toward Earth with plenty of battery left, though the thinner shield let a little space radiation through.',
      effects: { energy: -5, shielding: -10 },
    },
    'boost-lose': {
      tone: 'bad',
      text: 'Rough takeoff! We burned extra battery fighting Mars gravity, and our thinner shield barely held back the space rays.',
      effects: { energy: -25, lifeSupport: -15, shielding: -10 },
    },
  },

  fact: {
    title: 'Space Science Note',
    text: 'Water is a great shield in space because it blocks invisible rays from the Sun and deep space. Since water is very heavy, astronauts always have to balance carrying enough water for safety against saving rocket power to get home.',
  },
};
