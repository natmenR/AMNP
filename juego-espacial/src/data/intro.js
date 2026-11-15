/**
 * Textos de la introducción (portada). Cada página es un mensaje de la carta.
 * @typedef {import('../ui/letter.js').LetterPage} LetterPage
 */

/** @param {string} playerName @returns {LetterPage[]} */
export function buildIntroPages(playerName) {
  return [
    { text: `Hello, ${playerName}. Welcome aboard Ares, a spaceship on its way to Mars.` },
    { text: 'Your science mission: find out whether life could exist on the red planet by collecting data about its environment.' },
    {
      text: 'To get there, you will have to share your energy wisely, take care of your life support and protect the ship from radiation.',
      notes: [
        { term: 'Life support', text: 'the machines that give the crew air to breathe and clean water.' },
        { term: 'Radiation', text: 'invisible energy that can hurt people and damage electronics.' },
      ],
    },
    { text: 'The challenge: every decision counts. Survive 300 days in space to complete the mission.' },
  ];
}
