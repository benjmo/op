const wordlist = require('./wordlist');

/**
 * Gets all the possible values for settings for the game
 * eg. all the possible themes to play with
 * @param {*} req 
 * @param {*} res 
 */
const getSettings = function(req, res) {
  res.json({
    wordTheme: {
      values: wordlist.getThemes(),
      default: wordlist.DEFAULT_THEME
    },
    timeLimit: {
      values: [
        { value: 30, display: 'Blitz (30s)'},
        { value: 60, display: 'Normal (60s)'},
        { value: 90, display: 'Long (90s)'},
        { value: 120, display: 'Super Long (120s)'}
      ],
      default: 60
    },
    name: {
      default: generateName()
    }
  });
}

const getRandomName = function(req, res) {
  res.send(generateName());
}

/**
 * Generates a name for a new room.
 * Uses the gfycat style AdjectiveAdjectieNoun
 * @param {*} req 
 * @param {*} res 
 */
const generateName = function() {
  let name = '';
  name += wordlist.getRandomWord('Adverbs');
  name += wordlist.getRandomWord('Adjectives');
  name += 'Room';
  return name;
}

module.exports = {
  getSettings,
  getRandomName,
  generateName
};