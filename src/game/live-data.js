/**
 * Convierte el resumen de la API de la NASA en una página de la carta
 * ("Real NASA data") para la ronda 1.
 */

/** @param {number|null} days */
export function describeWindow(days) {
  if (days === 30) return 'last 30 days';
  if (days === 365) return 'last year';
  if (days === 1825) return 'last 5 years';
  return days ? `last ${days} days` : 'recent years';
}

const LEVEL_NAMES = { mild: 'mild', medium: 'medium', strong: 'strong' };

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * @param {ReturnType<import('../services/donki.js').summarizeStorm>|null} summary
 * @returns {import('../ui/letter.js').LetterPage}
 */
export function buildLiveDataPage(summary) {
  const base = 'Mission Control: this is not just a game. Space weather scientists track storms like this one every day, and NASA keeps a public log of them.';

  if (summary?.hasLiveData && summary.latest) {
    const { latest } = summary;
    const date = latest.time
      ? latest.time.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
      : 'a date we could not read';
    const instrument = latest.instruments[0] ? `, spotted by ${latest.instruments[0]}` : '';
    const linked = latest.linkedEvents.length;
    return {
      text: base,
      notesTitle: 'Real NASA data',
      notes: [
        {
          term: 'Latest particle storm in the log',
          text: `${date}${instrument}. It was linked to ${plural(linked, 'solar eruption')}. NASA logged ${plural(summary.count, 'particle storm')} in the ${describeWindow(summary.windowDays)}.`,
        },
        {
          term: 'Storm strength in this game',
          text: `${LEVEL_NAMES[summary.level]}, based on how many eruptions were linked to that real storm.`,
        },
      ],
    };
  }

  const reason = summary && summary.windowDays
    ? `NASA's log shows no particle storms in the ${describeWindow(summary.windowDays)}`
    : "We couldn't reach NASA's space weather log right now";
  return {
    text: base,
    notesTitle: 'Real NASA data',
    notes: [{ term: 'NASA log', text: `${reason}, so we are using a typical storm strength: medium.` }],
  };
}
