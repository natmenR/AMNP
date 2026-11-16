/**
 * RONDA 1 · Tormenta solar (evento SEP).
 *
 * Para crear otra ronda: copia este archivo, cambia los textos y regístrala en rounds/index.js.
 * Una ronda tiene una sola misión con esta forma:
 *   report   → resumen de lo que pasó (la carta)
 *   decision → la historia que lleva a la decisión + las opciones
 *   options  → cada opción tiene su minijuego y a qué resultado lleva si gana o pierde
 *   outcomes → texto del resumen final + efectos en los recursos (en puntos porcentuales)
 *
 * @typedef {import('../../ui/letter.js').LetterPage} LetterPage
 * @typedef {{ type: string, intro: string, config?: object }} MinigameSpec
 * @typedef {{ id: string, label: string, minigame: MinigameSpec, outcomes: Record<string, string> }} RoundOption
 * @typedef {{ text: string, tone: 'good'|'mixed'|'bad', effects: import('../../core/resources.js').Effects }} Outcome
 * @typedef {{
 *   id: string, number: number, title: string, speaker: string, alert: boolean,
 *   report: { pages: LetterPage[], liveData: boolean },
 *   decision: { pages: LetterPage[], title: string, prompt: string, options: RoundOption[] },
 *   outcomes: Record<string, Outcome>,
 *   fact: { title: string, text: string }
 * }} Round
 */
import { GAME } from '../../config.js';

const name = GAME.playerName;

/** @type {Round} */
export const round01 = {
  id: 'round-01',
  number: 1,
  title: 'Solar Storm',
  speaker: 'Ship System',
  alert: true,

  report: {
    liveData: true, // añade una página con datos reales de la API de la NASA (ver services/donki.js)
    pages: [
      { text: `Hello, ${name}. Trip Start Summary (Round 1): We have just entered open space and the ship is working well.` },
      {
        text: 'However, our sensors detected a solar storm: the Sun had a huge explosion and sent an invisible rain of tiny, energy-packed particles flying toward us.',
      },
      {
        text: "This creates dangerous radiation, invisible energy traveling through space that can harm our bodies if nothing blocks it. To stay safe, we sounded the alarm and the whole crew moved into the ship's thick-walled shelter.",
        notes: [{ term: 'Radiation', text: 'invisible energy that can hurt people and damage electronics.' }],
      },
    ],
  },

  decision: {
    pages: [
      {
        text: `${name}, we are safe inside the shelter, but we have a problem outside. That rain of particles hit our star tracker, a camera sensor that takes pictures of the stars like a map to know which way the ship is pointing, and now it is giving confusing readings.`,
        notes: [{ term: 'Star tracker', text: 'a camera that looks at the stars to figure out which way the ship is pointing.' }],
      },
      {
        text: 'On the screen, it looks like we are spinning out of control, but the ship is still flying straight; it is just a glitch caused by flashes from the storm.',
      },
      {
        text: 'You can leave the shelter and go to the cockpit to check the star tracker and fire the thrusters, but the radiation outside will hurt you and you will waste a lot of Energy for nothing. The other choice is to stay inside, check the backup sensors, the internal instruments that do not look at the stars and do not get confused by the storm, and wait until the danger passes.',
        notes: [{ term: 'Backup sensors', text: 'instruments inside the ship that feel its movement, so the storm cannot blind them.' }],
      },
    ],
    title: 'Your decision',
    prompt: 'What is your decision?',
    options: [
      {
        id: 'leave',
        label: 'Leave the shelter for the cockpit to check the star tracker and fire the thrusters.',
        minigame: {
          type: 'manualFlight',
          intro: `Shelter hatch open, ${name}. Starting manual flight minigame: try to keep the ship straight while looking at the static-filled screen from the star tracker, and control the Energy used by the thrusters before the radiation alarm goes too high.`,
        },
        outcomes: { win: 'leave-win', lose: 'leave-lose' },
      },
      {
        id: 'stay',
        label: 'Stay inside the shelter, check the backup sensors, and wait for the storm to pass.',
        minigame: {
          type: 'dataCheck',
          intro: `Shelter control screen ready, ${name}. Starting data-check minigame: compare the messy star tracker photos with the backup sensors, clear out the false readings, and keep the thrusters locked off until the storm passes.`,
        },
        outcomes: { win: 'stay-win' },
      },
    ],
  },

  outcomes: {
    'leave-win': {
      tone: 'mixed',
      text: `End of Round 1 Report, ${name}. You managed to check the ship's direction, but leaving the shelter during the solar storm and firing the thrusters without waiting came at a high cost: you lost -15% Life Support from the radiation outside and -25% Energy from using the thrusters unnecessarily, though you gained +5% Shelter Integrity and Shielding by checking the outside sensors.`,
      effects: { lifeSupport: -15, energy: -25, shielding: 5 },
    },
    'leave-lose': {
      tone: 'bad',
      text: `End of Round 1 Report, ${name}. The storm flashes blinded the star tracker, you fired the thrusters using false readings, and you had to rush back to the shelter. You lost -20% Life Support, -30% Energy, and -10% Shelter Integrity and Shielding from the rough maneuver.`,
      effects: { lifeSupport: -20, energy: -30, shielding: -10 },
    },
    'stay-win': {
      tone: 'good',
      text: `End of Round 1 Report, ${name}. You made the right call by staying in the shelter, checking our direction with the backup sensors, and patiently waiting for the star tracker to see the stars clearly again. You gained +10% Life Support for keeping the crew safe, +5% Shelter Integrity and Shielding by keeping the ship steady, and only spent -5% Energy on the indoor screens.`,
      effects: { lifeSupport: 10, shielding: 5, energy: -5 },
    },
  },

  fact: {
    title: 'Based on a true story',
    text: "During the solar storms of May 2024, the star camera on NASA's Mars Odyssey orbiter was overwhelmed by solar particles and went offline for a short time. Odyssey had other ways to figure out its orientation, and the camera was working again in less than an hour.",
  },
};
