const { range, quantile } = require("d3-array");
const { switcher, bucket } = require("./util/util");
const { closestVector } = require("./util/vector");

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const WEEKDAY_PROFILE = [
  {
    name: "weekday",
    vector: [1, 1, 1, 1, 1, 0, 0]
  },
  {
    name: "weekend",
    vector: [0, 0, 0, 0, 0, 1, 1]
  },
  ...WEEKDAYS.map((day, index) => ({
    name: day,
    weekday: true,
    vector: range(0, 7).map(d => (d === index ? 1 : 0))
  }))
];

for (let i = 0; i < WEEKDAYS.length; i++) {
  for (let j = 0; j < WEEKDAYS.length; j++) {
    if (i !== j) {
      WEEKDAY_PROFILE.push({
        name: WEEKDAYS[i] + " or a " + WEEKDAYS[j],
        weekday: true,
        vector: range(0, 7).map(d => (d === i || d === j ? 1 : 0))
      });
    }
  }
}

const TIME_OF_DAY_PROFILE = [
  {
    name: "nightime",
    vector: range(0, 24).map(d => (d > 4 && d < 20 ? 0 : 1))
  },
  {
    name: "morning",
    vector: range(0, 24).map(d => (d > 5 && d < 10 ? 1 : 0))
  },
  {
    name: "midday",
    vector: range(0, 24).map(d => (d > 10 && d < 15 ? 1 : 0))
  },
  {
    name: "evening",
    vector: range(0, 24).map(d => (d > 15 && d < 20 ? 1 : 0))
  }
];

module.exports = stravaData => {
  const yearOfRunningData = stravaData.runs;

  const upperDistanceQuantile = quantile(
    yearOfRunningData.map(d => d.distance).sort((a, b) => a - b),
    0.85
  );
  const upperPaceQuantile = quantile(
    yearOfRunningData.map(d => d.pace).sort((a, b) => a - b),
    0.85
  );

  // generators that bucket data based on weekday or time of day
  const weekdayVectorGenerator = data =>
    bucket(
      data,
      d => d.distance,
      d => d.startDate.weekday - 1,
      7
    );
  const timeOfDayVectorGenerator = data =>
    bucket(
      data,
      d => d.distance,
      d => d.startDate.hour - 1,
      24
    );

  const closestWeekdayVector = closestVector(
    WEEKDAY_PROFILE,
    d => d.vector,
    weekdayVectorGenerator(yearOfRunningData)
  );

  const longRunDay = closestVector(
    WEEKDAY_PROFILE.filter(p => p.weekday),
    d => d.vector,
    weekdayVectorGenerator(
      yearOfRunningData.filter(d => d.distance > upperDistanceQuantile)
    )
  ).name;

  const workoutDay = closestVector(
    WEEKDAY_PROFILE.filter(p => p.weekday),
    d => d.vector,
    weekdayVectorGenerator(
      yearOfRunningData.filter(d => d.pace > upperPaceQuantile && d.distance < upperDistanceQuantile)
    )
  ).name;

  const timeOfDay = closestVector(
    TIME_OF_DAY_PROFILE,
    d => d.vector,
    timeOfDayVectorGenerator(yearOfRunningData)
  ).name;

  const timeOfDayPhrase = switcher(
    {
      nightime: "a <b>nighttime runner</b>, heading in the moonlight",
      morning: "a <b>morning runner</b>, heading as the sun starts to rise",
      midday: "a <b>midday runner</b>, heading out when the sun is at its peak",
      evening:
        "an <b>evening runner</b>, heading out when the sun is starting to set"
    },
    timeOfDay
  );

  return {
    weekend: closestWeekdayVector.name,
    monday: longRunDay,
    tuesday: workoutDay,
    a_nighttime_runner: timeOfDayPhrase
  };
};
