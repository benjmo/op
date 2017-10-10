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