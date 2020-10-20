const { rollup, sum, range } = require("d3-array");
const { DateTime } = require("luxon");

module.exports.switcher = (obj, value) => {
  let rtn;
  Object.keys(obj).forEach(key => {
    if (key === "default") {
      rtn = obj[key](value);
    }
    if (value === key) {
      rtn = obj[key];
    }
  });
  return rtn;
};

// buckets the given data
// valueFn - the function used to determine the value added to a bucket for a given element
// bucketFn - a function that determines the bucket for a given element
// max - the total number of buckets
module.exports.bucket = (data, valueFn, bucketFn, max) => {
  const roll = rollup(data, d => sum(d, valueFn), bucketFn);
  return range(0, max).map(i => roll.get(i) || 0);
};

module.exports.capitalizeFirstLetter = string =>
  string.charAt(0).toUpperCase() + string.slice(1);

module.exports.streakLength = (data, isEqual) => {
  let longestStreak = 0;
  let streak = 0;
  for (let i = 1; i < data.length - 1; i++) {
    const curr = data[i];
    const prev = data[i - 1];
    if (curr === prev) continue;
    if (isEqual(prev, curr)) {
      streak++;
      longestStreak = Math.max(longestStreak, streak);
    } else {
      streak = 0;
    }
  }
  return longestStreak;
};

module.exports.roundToDay = d =>
  DateTime.utc(d.year, d.month, d.day, 0, 0, 0, 0);
