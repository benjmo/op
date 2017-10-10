const wordlist = require('./wordlist');

/**
 * Gets the available options for a game
 * @param {*} req 
 * @param {*} res 
 */
const getSettings = function(req, res) {
  res.json([]);
}

/**
 * Generates a name for a new room.
 * Uses the gfycat style AdjectiveAdjectieNoun
 * @param {*} req 
 * @param {*} res 
 */
const generateName = function(req, res) {
  let name = '';
  name += wordlist.getRandomWord('Adverbs');
  name += wordlist.getRandomWord('Adjectives');
  name += 'Room';
  res.send(name);
}

module.exports = {
  getSettings,
  generateName
};