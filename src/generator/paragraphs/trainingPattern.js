const fs = require("fs");
const Handlebars = require("handlebars");
const OpenAI = require("openai-api");
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const { range, quantile, mean } = require("d3-array");
const { bucket } = require("./util/util");
const { closestVector } = require("./util/vector");
const narrativeGenerator = require("./narrativeGenerator");

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const WEEKDAY_PROFILE = [
  {
    name: "weekday",
    vector: [1, 1, 1, 1, 1, 0, 0],
  },
  {
    name: "weekend",
    vector: [0, 0, 0, 0, 0, 1, 1],
  },
  ...WEEKDAYS.map((day, index) => ({
    name: day,
    weekday: true,
    vector: range(0, 7).map((d) => (d === index ? 1 : 0)),
  })),
];

for (let i = 0; i < WEEKDAYS.length; i++) {
  for (let j = 0; j < WEEKDAYS.length; j++) {
    if (i !== j) {
      WEEKDAY_PROFILE.push({
        name: WEEKDAYS[i] + " or a " + WEEKDAYS[j],
        weekday: true,
        vector: range(0, 7).map((d) => (d === i || d === j ? 1 : 0)),
      });
    }
  }
}

const hourProfile = (start, end) =>
  range(0, 24).map((d) => (d >= start && d < end ? 1 : 0));

const TIME_OF_DAY_PROFILE = [
  {
    name: "nightime",
    vector: hourProfile(2, 22).map((i) => 1 - i),
  },
  {
    name: "morning",
    vector: hourProfile(6, 10),
  },
  {
    name: "midday",
    vector: hourProfile(10, 14),
  },
  {
    name: "afternoon",
    vector: hourProfile(14, 18),
  },
  {
    name: "evening",
    vector: hourProfile(18, 22),
  },
];

module.exports = async (stravaData) => {
  const yearOfRunningData = stravaData.runs;

  const upperDistanceQuantile = quantile(
    yearOfRunningData.map((d) => d.distance).sort((a, b) => a - b),
    0.85
  );
  const upperPaceQuantile = quantile(
    yearOfRunningData.map((d) => d.pace).sort((a, b) => a - b),
    0.85
  );

  // generators that bucket data based on weekday or time of day
  const weekdayVectorGenerator = (data) =>
    bucket(
      data,
      (d) => d.distance,
      (d) => d.startDate.weekday - 1,
      7
    );
  const timeOfDayVectorGenerator = (data) =>
    bucket(
      data,
      (d) => d.distance,
      (d) => d.startDate.toUTC().hour,
      24
    );

  const closestWeekdayVector = closestVector(
    WEEKDAY_PROFILE,
    (d) => d.vector,
    weekdayVectorGenerator(yearOfRunningData)
  );
  const mostlyRunsOn = closestWeekdayVector.name;

  const longRunDay = closestVector(
    WEEKDAY_PROFILE.filter((p) => p.weekday),
    (d) => d.vector,
    weekdayVectorGenerator(
      yearOfRunningData.filter((d) => d.distance > upperDistanceQuantile)
    )
  ).name;

  const workoutDay = closestVector(
    WEEKDAY_PROFILE.filter((p) => p.weekday),
    (d) => d.vector,
    weekdayVectorGenerator(
      yearOfRunningData.filter(
        (d) => d.pace > upperPaceQuantile && d.distance < upperDistanceQuantile
      )
    )
  ).name;

  const timeOfDay = closestVector(
    TIME_OF_DAY_PROFILE,
    (d) => d.vector,
    timeOfDayVectorGenerator(yearOfRunningData)
  ).name;

  const name = stravaData.athlete.firstname.trim();

  const templateText = String(
    fs.readFileSync("./src/generator/paragraphs/prompts/trainingPattern.txt")
  );
  const template = Handlebars.compile(templateText);
  prompt = template({
    name,
    gender: stravaData.athlete.sex,
    longRunDay,
    workoutDay,
    timeOfDay,
    mostlyRunsOn,
  });
  const trainingPatternNarrative = await narrativeGenerator(prompt);

  return {
    trainingPatternNarrative,
    mostlyRunsOn,
  };
};
