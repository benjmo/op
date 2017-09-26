const chai = require('chai');
const expect = chai.expect;
const util = require('../src/util');
const CORRECT_GUESS = util.CORRECT_GUESS;
const INCORRECT_GUESS = util.INCORRECT_GUESS;
const CLOSE_GUESS = util.CLOSE_GUESS;

describe('Check Guess', () => {
  it('should return CORRECT_GUESS for equal words', () => {
    expect(util.checkGuess('antelope', 'antelope')).to.equal(CORRECT_GUESS);
  });
  it('should return CORRECT_GUESS if word is a substring of guess', () => {
    expect(util.checkGuess('antelope', 'fanteloped')).to.equal(CORRECT_GUESS);    
    expect(util.checkGuess('antelope', 'antelope on the mat')).to.equal(CORRECT_GUESS);
    expect(util.checkGuess('antelope', 'fanteloped on the mat')).to.equal(CORRECT_GUESS);
  });
  it('should return CLOSE_GUESS if a letter is added in the middle', () => {
    expect(util.checkGuess('antelope', 'antelopme')).to.equal(CLOSE_GUESS);
  });
  it('should return CLOSE_GUESS if a letter is removed', () => {
    expect(util.checkGuess('antelope', 'antelop')).to.equal(CLOSE_GUESS);
    expect(util.checkGuess('antlope', 'antelope')).to.equal(CLOSE_GUESS);
  });
  it('should return CLOSE_GUESS if a letter is swapped', () => {
    expect(util.checkGuess('antelope', 'anyelope')).to.equal(CLOSE_GUESS);
    expect(util.checkGuess('antelope', 'antelopr')).to.equal(CLOSE_GUESS);
    expect(util.checkGuess('sntelope', 'antelope')).to.equal(CLOSE_GUESS);
});
  it('should return INCORRECT_GUESS if words are very different', () =>  {
    expect(util.checkGuess('antelope', 'wildebeest')).to.equal(INCORRECT_GUESS);
  });
  it('should return INCORRECT_GUESS if the words are a bit too different', () => {
    expect(util.checkGuess('antelope', 'antelo')).to.equal(INCORRECT_GUESS);
    expect(util.checkGuess('antelope', 'antelopqq')).to.equal(INCORRECT_GUESS);
});
});