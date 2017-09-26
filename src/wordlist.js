/**
 * Returns a random word from the wordlist
 */
const getRandomWord = function() {
  return words[Math.floor(Math.random() * words.length)];
}

const words = [
  'Apple',
  'Axe',
  'Balloon',
  'Branch',
  'Bridge',
  'Button',
  'Car',
  'Castle',
  'Chair',
  'Coin',
  'Diamond',
  'Duck',
  'Ear',
  'Egg',
  'Envelope',
  'Fan',
  'Fire',
  'Golf',
  'Grass',
  'Guitar',
  'Helmet',
  'Igloo',
  'Iron',
  'Javelin',
  'Key',
  'King',
  'Lamp',
  'Lemonade',
  'Lion',
  'Mast',
  'Match',
  'Maze',
  'Nest',
  'Octopus',
  'Parachute',
  'Piano',
  'Pool',
  'Road',
  'Roof',
  'Rope',
  'Rose',
  'Soccer',
  'Submarine',
  'Suit',
  'Tape',
  'Thunder',
  'Vase',
  'Wallet',
  'Wave',
  'Wing'
];

module.exports = {
  getRandomWord
};
