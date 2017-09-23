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
  let i1 = 0, i2 = 0;
  let diff = 0;
  // count through letters of each word to check extra letters
  while (i1 < word.length && i2 < guess.length) {
    if (word[i1] === guess[i2]) {
      i1++;
      i2++;
    } else { 
      // check for extra letter in word
      if (i1 < word.length - 1 && word[i1+1] === guess[i2]) {
        i1++;
      // check for extra letter in guess
      } else if (i2 < guess.length - 1 && word[i1] === guess[i2+1]) {
        i2++;
      // multiple wrong letters, just skip over them
      } else {
        i1++;
        i2++;
      }
      diff++;
    }
  }
  // reached the end: add the characters we haven't seen yet
  diff += word.length - i1;
  diff += guess.length - i2;
  return diff <= 1;

  //@todo plurals y -> ies (eg. 'bunny' === 'bunnies')
};

module.exports = {
  check_guess
};