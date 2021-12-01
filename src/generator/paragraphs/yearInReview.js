const fs = require("fs");
const numberToText = require("number-to-text");
require("number-to-text/converters/en-us");
const Handlebars = require("handlebars");
const { sum } = require("d3-array");
const { format } = require("d3-format");
const { streakLength, roundToDay, matchClosest } = require("./util/util");
const narrativeGenerator = require("./narrativeGenerator");

const formatInteger = format(",.0f");
const SECONDS_TO_HOURS = 1 / (60 * 60);
const FEET_TO_METRES = 1 / 3.28084;
const MILES_TO_KILOMETRES = 1.60934;

// distances in miles
const DISTANCE_DATA = [
  ["round the World", 24901],
  ["length of the Great Wall of China", 13170],
  ["length of the Russia", 5600],
  ["length of the Amazon River", 4000],
  ["width of America", 2800],
  ["width of Australia", 2500],
  ["length of the UK", 874],
  ["length of the Italy", 620],
];

// heights in metres
const HEIGHT_DATA = [
  ["Mount Everest", 8848],
  ["Mount Kilimanjaro", 5895],
  ["El Capitan", 2308],
  ["Snowdon", 1100],
  ["Empire State Building", 600],
  ["Eiffel Tower", 324],
  ["The Great Pyramid of Giza", 146],
];

// runs in miles
const CLASSIFICATION_DATA = [
  ["extreme runner", 2000],
  ["running addict", 1500],
  ["serious runner", 600],
  ["recreational runner", 300],
  ["occasional runner", 0],
];

module.exports = async (stravaData) => {
  const useImperial = stravaData.athlete.measurement_preference === "feet";

  const yearOfRunningData = stravaData.runs;
  const totalRuns = yearOfRunningData.length;

  const name = stravaData.athlete.firstname.trim();

  const totalMiles = sum(yearOfRunningData, (d) => d.distance);
  const totalMilesFormatted = useImperial
    ? `${formatInteger(Math.floor(totalMiles))} miles`
    : `${formatInteger(Math.floor(totalMiles * MILES_TO_KILOMETRES))} km`;
  const totalMilesMatch = matchClosest(DISTANCE_DATA, totalMiles * 4);
  const totalMilesComparison = `${totalMilesMatch[0]} in ${numberToText
    .convertToText((totalMilesMatch[1] / totalMiles).toFixed(0))
    .toLowerCase()} years`;

  const totalClimb = sum(yearOfRunningData, (d) => d.total_elevation_gain);
  const totalClimbFormatted = useImperial
    ? `${formatInteger(Math.floor(totalClimb))} feet`
    : `${formatInteger(Math.floor(totalClimb * FEET_TO_METRES))} metres`;

  const runnerClassification = matchClosest(CLASSIFICATION_DATA, totalMiles)[0];

  const heightComparison = matchClosest(HEIGHT_DATA, totalClimb / 2);
  const totalClimbComparison = `climbing ${heightComparison[0]} ${numberToText
    .convertToText((totalClimb / heightComparison[1]).toFixed(0))
    .toLowerCase()} times`;

  const totalHoursRun = Math.floor(
    sum(yearOfRunningData, (d) => d.elapsed_time * SECONDS_TO_HOURS)
  );

  const runningDays = yearOfRunningData.map((s) => roundToDay(s.startDate).ts);
  const longestStreak =
    streakLength(runningDays, (prev, curr) => prev - curr === 86400000) + 1;

  const templateText = String(
    fs.readFileSync("./src/generator/paragraphs/prompts/yearInReview.txt")
  );
  const template = Handlebars.compile(templateText);
  prompt = template({
    name,
    gender: stravaData.athlete.sex,
    totalMiles: totalMilesFormatted,
    totalMilesComparison,
    totalRuns,
    totalHoursRun,
    longestStreak,
    totalClimb: totalClimbFormatted,
    totalClimbComparison,
    runnerClassification,
  });
  const yearInReviewNarrative = await narrativeGenerator(prompt);

  return {
    totalRuns,
    longestStreak,
    runnerClassification,
    totalMiles: totalMilesFormatted,
    totalClimb: totalClimbFormatted,
    yearInReviewNarrative,
  };
};
