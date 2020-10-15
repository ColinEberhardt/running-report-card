const { bucket } = require("./util/util");

const timeOfDayVectorGenerator = data =>
  bucket(
    data,
    d => d.distance,
    d => d.startDate.hour - 1,
    24
  );

module.exports = stravaData => {
  const yearOfRunningData = stravaData.runs;
  const timeOfDay = timeOfDayVectorGenerator(yearOfRunningData);
  const max = Math.max(...timeOfDay);
  return timeOfDay.map(s => s / max);
};
