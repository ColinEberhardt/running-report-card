const fs = require("fs");
const reportGenerator = require("../generator/index");

fs.readdir("./static", (err, files) => {
  files.forEach(file => {
    if (!file.endsWith("json")) return;
    const filename = `./static/${file}`;
    console.log(`reading data ${filename}`);
    const data = fs.readFileSync(filename, "utf8");
    const report = reportGenerator(JSON.parse(data));
    fs.writeFileSync(filename.replace("json", "html"), report);
    console.log(`writing report ${filename.replace("json", "html")}`);
  });
});
