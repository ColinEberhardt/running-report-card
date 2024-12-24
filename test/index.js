const fs = require("fs");
const workerFarm = require("worker-farm");
const workers = workerFarm({ maxConcurrentWorkers: 1 }, require.resolve("./generate"));

// load the contents of the ../serverless.env.yml YML file into the env variables
const yaml = require("js-yaml");
const path = require("path");
const envFile = path.resolve(__dirname, "../serverless.env.yml");
const env = yaml.load(fs.readFileSync(envFile, "utf8"));
Object.keys(env).forEach(key => {
  process.env[key] = env[key];
});

let queue = 0;
fs.readdir("./static", (_, files) => {
  files.forEach(file => {
    if (file.endsWith("json")) {
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
