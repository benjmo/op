const fs = require('fs');
const os = require('os');

// Base directory where the wordlists are stored (as .txt files)
const BASE_DIR = __dirname + '/wordlists/';
const DEFAULT_THEME = 'Variety';

/**
 * Returns a random word from the wordlist with the given theme.
 * Throws an exception if an error occurs when reading the wordlist's file.
 * @param theme Theme of the wordlist to use (in the format given by getThemes)
 */
const getRandomWord = function(theme) {
  const wordlist = fs.readFileSync(BASE_DIR + theme + '.txt', 'utf8');
  const words = wordlist.trim().split(os.EOL);
  return words[Math.floor(Math.random() * words.length)];
};

/**
 * Returns an array containing the theme of each available wordlist
 */
const getThemes = function() {
  const themes = [];
  for (const filename of fs.readdirSync(BASE_DIR, 'utf8')) {
    // Only include filenames with the right file extension
    const fileExtIndex = filename.search(/\.txt$/);
    if (fileExtIndex !== -1) {
      // Remove file extension and add to array
      themes.push(filename.slice(0, fileExtIndex));
    }
  }
  return themes;
};

module.exports = {
  getRandomWord,
  getThemes,
  DEFAULT_THEME
};
