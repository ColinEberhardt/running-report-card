const fs = require("fs");
const workerFarm = require("worker-farm");
const workers = workerFarm({ maxConcurrentWorkers: 1 }, require.resolve("./generate"));

let queue = 0;
fs.readdir("./static", (_, files) => {
  files.forEach(file => {
    if (file.endsWith("json") && file === "8725202.json") {
      queue++;
      workers(file, () => {
        queue--;
        if (queue === 0) {
          workerFarm.end(workers);
        }
      });
    }
  });
});
