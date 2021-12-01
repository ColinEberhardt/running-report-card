const AWS = require("aws-sdk");
const fs = require("fs");
const reportGenerator = require("./generator/index");
const requestResponse = require("request-promise");
const geocode = require("./geocode");
const {
  athleteRequest,
  activitiesRequest,
  authTokenRequest,
  activityRequest
} = require("./strava");
const { wait, isMoreThanOneYearAgo, last } = require("./util");

AWS.config.setPromisesDependency(Promise);
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const httpRequest = async config => {
  console.log("HTTP request", config);
  let result;
  result = await requestResponse(config);
  // console.log("HTTP response", result);
  return result;
};

module.exports.connectHandler = async (event, context) => {
  return { statusCode: 200, body: "Connected." };
};

module.exports.disconnectHandler = async (event, context) => {
  return { statusCode: 200, body: "Disconnected." };
};

const sendMessage = async (event, message) => {
  if (message.status) {
    console.log(message.status);
  }

  const connectionId = event.requestContext.connectionId;

  const ws = new AWS.ApiGatewayManagementApi({
    apiVersion: "2018-11-29",
    endpoint:
      event.requestContext.domainName === "localhost"
        ? "http://localhost:3001"
        : event.requestContext.domainName + "/" + event.requestContext.stage
  });

  await ws
    .postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(message)
    })
    .promise();
};

const isOffline = event => event.requestContext.domainName === "localhost";

const fileExists = async (event, filename) => {
  if (isOffline(event)) {
    return fs.existsSync(`./static/${filename}`);
  } else {
    return await s3
      .headObject({
        Bucket: process.env.S3_BUCKET,
        Key: filename
      })
      .promise()
      .then(
        () => true,
        err => {
          if (err.code === 'NotFound') {
            return false;
          }
          throw err;
        }
      );
  }
}

const writeFile = async (event, filename, data) => {
  if (isOffline(event)) {
    fs.writeFileSync(`./static/${filename}`, data);
  } else {
    await s3
      .putObject({
        Body: data,
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        ACL: "public-read",
        ContentType: filename.endsWith("json")
          ? "application/json"
          : "text/html"
      })
      .promise();
  }
};

const filterActivity = activity =>
  !isMoreThanOneYearAgo(new Date(activity.start_date)) &&
  activity.type === "Run";

module.exports.msgHandler = async (event, context) => {
  const authCode = JSON.parse(event.body).authCode;

  const updateStatus = status => sendMessage(event, { status });

  // use the supplied aurhorisation code to obtain an access code
  // https://developers.strava.com/docs/authentication/
  const body = await httpRequest(authTokenRequest(authCode));
  if (body.error) {
    console.error(body);
    await updateStatus("Problem accessing Strava data :-(");
    return {
      statusCode: 500
    };
  }
  const accessToken = body.access_token;
  await updateStatus("Connected to Strava ....");

  // download the athlete data
  const athlete = await httpRequest(athleteRequest(accessToken));
  await updateStatus("Athlete data downloaded ...");

  const reportUrl = isOffline(event)
    ? `http://localhost:8080/${athlete.id}.html`
    : `https://run-report.com/${athlete.id}.html`;

  // check if we have a report already
  // const filename = `${athlete.id}.html`;
  // if (fileExists(event, filename)) {
  //   await sendMessage(event, {
  //     status: "report generated",
  //     reportUrl
  //   });
  // }

  const athleteData = {
    runs: [],
    generation_time: new Date().toISOString(),
    athlete
  };

  // download at least one years worth of running data
  let page = 1,
    breakLoop = false;
  do {
    const activities = await httpRequest(
      activitiesRequest(page++, accessToken)
    );
    athleteData.runs = athleteData.runs.concat(
      activities.filter(filterActivity)
    );
    breakLoop =
      activities.length === 0 ||
      isMoreThanOneYearAgo(new Date(last(activities).start_date));
    await updateStatus(
      `Data for ${athleteData.runs.length} runs downloaded ...`
    );
    await wait(1000);
  } while (!breakLoop);

  if (athleteData.runs.length === 0) {
    await updateStatus(
      `We could not find any runs in your Strava profile, either they are private, or you haven't recorded any yet!`
    );
    return { statusCode: 200, body: "Data sent." };
  }

  // download 6 runs that contain photos
  await updateStatus(`Fetching additional run data ...`);
  const runsWithPhotos = athleteData.runs
    .filter(r => r.total_photo_count > 0)
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);
  for (let i = 0; i < runsWithPhotos.length; i++) {
    const activity = await httpRequest(
      activityRequest(runsWithPhotos[i].id, accessToken)
    );
    // replace the existing activity with the more detailed one
    const idx = athleteData.runs.findIndex(r => r.id === runsWithPhotos[i].id);
    athleteData.runs[idx] = activity;
    await wait(1000);
  }

  // download
  await updateStatus(`Grabbing location data  ...`);
  const locations = await geocode(athleteData);
  athleteData.locations = locations;

  // save the raw data to S3
  console.log(`Saving report data ${athleteData.athlete.id}.json`);
  await writeFile(
    event,
    `${athleteData.athlete.id}.json`,
    JSON.stringify(athleteData, null, 2)
  );

  // generate the report
  await updateStatus(`Generating the report ...`);
  const report = await reportGenerator(athleteData);
  await writeFile(event, `${athleteData.athlete.id}.html`, report);

  // redirect the client
  await sendMessage(event, {
    status: "report generated",
    reportUrl
  });

  return { statusCode: 200, body: "Data sent." };
};
