const numberToText = require("number-to-text");
require('number-to-text/converters/en-us');

const { sum } = require("d3-array");
const { format } = require("d3-format");
const { streakLength, roundToDay } = require("./util/util");

const last = arr => arr[arr.length - 1];

const formatInteger = format(",.0f");
const SECONDS_TO_HOURS = 1 / (60 * 60);
const MILES_ROUND_GLOBE = 24901;
const METRES_TO_FEET = 3.28084;

const HEIGHT_DATA = [
  {
    text: "Mount Everest",
    height: 8848,
    postscript: "(but probably with a bit less snow)"
  },
  {
    text: "Mount Kilimanjaro",
    height: 5895,
    postscript: "(but without the risk of volcanic activity)"
  },
  {
    text: "El Capitan",
    height: 2308,
    postscript: "(but a bit less steep)"
  },
  {
    text: "Snowdon",
    height: 1100,
    postscript: "(but a bit less wet and windy)"
  },
  {
    text: "Empire State Building",
    height: 600,
    postscript: "(but without taking the lift)"
  },
  {
    text: "Eiffel Tower",
    height: 324,
    postscript: "(but without taking the lift)"
  },
  {
    text: "The Great Pyramid of Giza",
    height: 146,
    postscript: "(but probably far less hot)"
  }
];

module.exports = stravaData => {
  const yearOfRunningData = stravaData.runs;
  const profile = stravaData.athlete;

  const totalMiles = sum(yearOfRunningData, d => d.distance);
  const classification = (() => {
    if (totalMiles >= 100 && totalMiles < 300) {
      return "a <b>recreational runner</b>, having clocked up a modest mileage in the last twelve months";
    } else if (totalMiles >= 300 && totalMiles < 700) {
      return "a <b>serious runner</b>, covering a decent mileage in a year";
    } else if (totalMiles >= 700 && totalMiles < 1500) {
      return "a <b>running addict</b>, clocking up a significant mileage over the year";
    } else if (totalMiles >= 1500) {
      return "an <b>extreme runner</b>, clocking up an eye-watering number of miles";
    } else {
      return "an <b>occasional runner</b>, clocking up a handful of miles each week";
    }
  })();

  const totalClimb = sum(yearOfRunningData, d => d.total_elevation_gain);

  const height =
    HEIGHT_DATA.find(({ height }) => totalClimb / height > 2) ||
    last(HEIGHT_DATA);

  const climbMultiple = (totalClimb / height.height).toFixed(0);

  const heightText = `climbing ${height.text} ${numberToText.convertToText(
    climbMultiple
  ).toLowerCase()} times ${height.postscript}`;

  const totalHours = sum(
    yearOfRunningData,
    d => d.elapsed_time * SECONDS_TO_HOURS
  );

  const runningDays = yearOfRunningData.map(s => roundToDay(s.startDate).ts);
  const longestStreak = streakLength(
    runningDays,
    (prev, curr) => prev - curr === 86400000
  );

  return {
    two_hundred: yearOfRunningData.length,
    one_hundred: formatInteger(totalMiles),
    fifty: formatInteger(totalHours),
    a_running_addict: classification,
    three_thousand: formatInteger(totalClimb * METRES_TO_FEET),
    climbing_everest: heightText,
    longest_streak: longestStreak + 1,
    round_world_years: formatInteger(MILES_ROUND_GLOBE / totalMiles)
  };
};
