const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const MILLIS_IN_YEAR = 1000 * 60 * 60 * 24 * 385;
const isMoreThanOneYearAgo = date =>
  new Date().getTime() - date.getTime() > MILLIS_IN_YEAR;

const last = arr => arr[arr.length - 1];

module.exports = { wait, isMoreThanOneYearAgo, last };
