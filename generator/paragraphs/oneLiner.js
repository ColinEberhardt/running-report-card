const { sum } = require("d3-array");
const { format } = require("d3-format");

module.exports = stravaData => {
  const yearOfRunningData = stravaData.runs;

  const totalMiles = sum(yearOfRunningData, d => d.distance);
  const mileageClassification = (() => {
    if (totalMiles >= 100 && totalMiles < 300) {
      return "an occasional";
    } else if (totalMiles >= 300 && totalMiles < 700) {
      return "a regular";
    } else if (totalMiles >= 700 && totalMiles < 1500) {
      return "a high mileage";
    } else if (totalMiles >= 1500) {
      return "a very high mileage";
    } else {
      return "a very occasional";
    }
  })();

  // ISSUE: Most people don't tag their runs based on type
  const raceCount = stravaData.runs.filter(r => r.workout_type === 1).length;
  const raceClassification = (() => {
    if (raceCount >= 2 && raceCount < 5) {
      return "occasional racer";
    } else if (raceCount >= 5 && raceCount < 10) {
      return "regular racer";
    } else if (raceCount >= 10 && raceCount < 20) {
      return "frequent racer";
    } else if (raceCount >= 20) {
      return "racing addict";
    } else {
      return "who shuns races";
    }
  })();

  return {
    a_high_mileage: mileageClassification,
    occasional_racer: raceClassification
  };
};
