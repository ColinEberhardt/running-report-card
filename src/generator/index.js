const fs = require("fs");
const Handlebars = require("handlebars");
const { DateTime, Interval } = require("luxon");

const yearInReview = require("./paragraphs/yearInReview");
const trainingPattern = require("./paragraphs/trainingPattern");
const schedule = require("./paragraphs/schedule");
const timeOfDay = require("./paragraphs/timeOfDay");
const kudos = require("./paragraphs/kudos");
const location = require("./paragraphs/location");
const gallery = require("./paragraphs/gallery");

const METRES_TO_MILES = 0.000621371;

const pronoun = (sex) => {
  switch (sex) {
    case "M":
      return "he";
    case "F":
      return "she";
  }
  return "they";
};

const possessivePronoun = (sex) => {
  switch (sex) {
    case "M":
      return "his";
    case "F":
      return "her";
  }
  return "their";
};

module.exports = async (stravaData) => {
  try {
    // perform some simple data transformations and enrichment
    stravaData.runs.forEach((d) => {
      d.startDate = DateTime.fromISO(d.start_date_local);
      d.distance = d.distance * METRES_TO_MILES;
      d.pace = d.distance / d.elapsed_time;
    });

    // ensure we only use the past year of data
    const generationTime = DateTime.fromISO(stravaData.generation_time);
    stravaData.runs = stravaData.runs
      .filter(
        (d) =>
          Interval.fromDateTimes(d.startDate, generationTime).length("years") <
          1.0
      )
      .filter((d) => d.type === "Run");

    // replace the default avatar
    const profilePic =
      stravaData.athlete.profile === "avatar/athlete/large.png"
        ? "https://d3nn82uaxijpm6.cloudfront.net/assets/avatar/athlete/large.png"
        : stravaData.athlete.profile;

    const trainingPatternData = await trainingPattern(stravaData);
    const yearInReviewData = await yearInReview(stravaData);

    // generate the various report snippets
    const reportData = {
      id: stravaData.athlete.id,
      encoded_title: encodeURI(
        `A running report card for ${stravaData.athlete.firstname.trim()} ${stravaData.athlete.lastname.trim()}`
      ),
      Colin: stravaData.athlete.firstname.trim(),
      Eberhardt: stravaData.athlete.lastname.trim(),
      his: possessivePronoun(stravaData.athlete.sex),
      he: pronoun(stravaData.athlete.sex),
      profile_pic: profilePic,
      ...trainingPatternData,
      ...yearInReviewData,
      annual_schedule: JSON.stringify(schedule(stravaData)),
      time_of_day: JSON.stringify(timeOfDay(stravaData)),
      ...kudos(stravaData),
      ...gallery(stravaData),
      ...location(stravaData),
    };

    Handlebars.registerHelper(
      "caps",
      (text) => text.charAt(0).toUpperCase() + text.slice(1)
    );

    const report = String(fs.readFileSync("./src/generator/report.html"));
    const template = Handlebars.compile(report);
    return template(reportData);
  } catch (e) {
    console.error(e);
    return "";
  }
};
