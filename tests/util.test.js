const chai = require('chai');
const expect = chai.expect;
const util = require('../src/util');

describe('Check Guess', () => {
  it('should return true for equal words', () => {
    expect(util.check_guess('antelope', 'antelope')).to.equal(true);
  });
  it('should return true if a letter is added', () => {
    expect(util.check_guess('antelope', 'aantelope')).to.equal(true);
    expect(util.check_guess('antelope', 'antelopme')).to.equal(true);
    expect(util.check_guess('antelopes', 'antelope')).to.equal(true);
  });
  it('should return true if a letter is removed', () => {
    expect(util.check_guess('antelope', 'antelop')).to.equal(true);
    expect(util.check_guess('antlope', 'antelope')).to.equal(true);
  });
  it('should return true if a letter is swapped', () => {
    expect(util.check_guess('antelope', 'anyelope')).to.equal(true);
    expect(util.check_guess('antelope', 'antelopr')).to.equal(true);
    expect(util.check_guess('sntelope', 'antelope')).to.equal(true);
});
  it('should return false if words are very different', () =>  {
    expect(util.check_guess('antelope', 'wildebeest')).to.equal(false);
  });
  it('should return false if the words are a bit too different', () => {
    expect(util.check_guess('antelope', 'antelo')).to.equal(false);
    expect(util.check_guess('antelope', 'antelopqq')).to.equal(false);
});
});