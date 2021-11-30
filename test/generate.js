const fs = require("fs").promises;
const reportGenerator = require("../src/generator/index");

module.exports = async (file, callback) => {
  const filename = `./static/${file}`;
  console.log(`reading data ${filename}`);
  const data = await fs.readFile(filename, "utf8");
  const report = await reportGenerator(JSON.parse(data));
  await fs.writeFile(filename.replace("json", "html"), report);
  console.log(`writing report ${filename.replace("json", "html")}`);
  callback(null);
};

