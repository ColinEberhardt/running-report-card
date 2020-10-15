const { DateTime } = require("luxon");
const { range, quantile } = require("d3-array");

const sameDay = (d1, d2) =>
  d1.year === d2.year && d1.month === d2.month && d1.day === d2.day;

module.exports = stravaData => {
  const upperDistanceQuantile = quantile(
    stravaData.runs.map(d => d.distance).sort((a, b) => a - b),
    0.85
  );
  const upperPaceQuantile = quantile(
    stravaData.runs.map(d => d.pace).sort((a, b) => a - b),
    0.85
  );
  const runType = run => {
    if (run.distance > upperDistanceQuantile) {
      return 2; // long
    }
    if (run.pace > upperPaceQuantile) {
      return 3; // workout
    }
    return 0;
  };

  const activityType = runs => Math.max(...runs.map(runType));

  const now = DateTime.fromISO(stravaData.generation_time);
  return (
    range(0, 365)
      // create a year of days
      .map(days => now.minus({ days: days }))
      .map(day => {
        // find the number of runs on that day
        const runs = stravaData.runs.filter(d =>
          sameDay(day, DateTime.fromISO(d.start_date_local))
        );
        return {
          day,
          runs: runs.length,
          type: runs.length > 0 ? activityType(runs) : 0,
          distance: runs.reduce((prev, curr) => prev + curr.distance, 0)
        };
      })
  );
};
