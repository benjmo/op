/**
 * Returns a random word from the wordlist
 */
const getRandomWord = function() {
  return words[Math.floor(Math.random() * words.length)];
}

const words = [
  'Apple',
  'Balloon',
  'Car',
  'Duck',
  'Egg',
  'Fire',
  'Grass',
  'Helmet',
  'Igloo',
  'Javelin',
  'King',
  'Lamp',
  'Mast',
  'Nest',
  'Octopus',
  'Parachute',
  'Roof',
  'Submarine',
  'Tape',
  'Vase',
  'Wing'
];

module.exports = {
  getRandomWord
};
