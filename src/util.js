/**
 * Checks if two words are the same, or close enough to the same
 * @param {String} word
 * @param {String} guess
 */
const check_guess = function(word, guess) {
  // exact match
  if (word === guess)
    return true;

  // guess is compound word that contains the actual word, or vice versa
  // for compound words (eg. 'doorway' === 'door'), or multiple guesses at once (eg. 'cow bull' === 'cow')

  /* uncomment once we have our dictionary stuff figured out
  if (word.indexOf(guess) !== -1) {
    // strip all spaces out
    let split = word;
    split.replace(guess, '');
    split.replace(/\s/, '');
    if (ALL_WORDS.indexOf(split) !== -1)
      return true;
  }
  */

  // minor typo, up to one extra character and up to one missing character
  let wc = {};
  let diff = 0;
  // add all the letters of word1
  for (const c of word) {
    wc[c] = wc[c] ? wc[c] + 1 : 1;
  }
  // remove all the letters of word2
  for (const c of guess) {
    wc[c] = wc[c] ? wc[c] - 1 : -1;
  }
  // missing letters have value 1, extra letters have value -1, sum them
  for (const c of Object.keys(wc)) {
    diff += Math.abs(wc[c]);
  }
  return (diff <= 1);
};

module.exports = {
  check_guess
};