const fs = require("fs").promises;
const reportGenerator = require("../src/generator/index");
const { DateTime, Interval } = require("luxon");
const geocode = require("../src/geocode")

module.exports = async function (file, callback) {
  const filename = `./static/${file}`;
  console.log(`reading data ${filename}`);
  const data = await fs.readFile(filename, "utf8");
  const report = await reportGenerator(JSON.parse(data));
  await fs.writeFile(filename.replace("json", "html"), report);
  console.log(`writing report ${filename.replace("json", "html")}`);
  callback(null);
};


// module.exports = async function (file, callback) {
//   const filename = `./static/${file}`;
//   console.log(`reading data ${filename}`);
//   const data = JSON.parse(await fs.readFile(filename, "utf8"));

//   const generationTime = DateTime.fromISO(data.generation_time);
//   data.runs = data.runs
//     .filter(
//       d =>
//         Interval.fromDateTimes(
//           DateTime.fromISO(d.start_date_local),
//           generationTime
//         ).length("years") < 1.0
//     )
//     .filter(d => d.type === "Run");

//   data.locations = await geocode(data);

//   await fs.writeFile(filename, JSON.stringify(data, null, 2));

//   const report = await reportGenerator(data);
//   await fs.writeFile(filename.replace("json", "html"), report);
//   console.log(`writing report ${filename.replace("json", "html")}`);

//   callback(null);
// };
