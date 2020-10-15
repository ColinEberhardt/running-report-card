const AWS = require("aws-sdk");
const fs = require("fs");
const reportGenerator = require("../generator/index");
const requestResponse = require("request-promise");
const {
  athleteRequest,
  activitiesRequest,
  authTokenRequest,
  activityRequest
} = require("./strava");
const { wait, isMoreThanOneYearAgo, last } = require("./util");

AWS.config.setPromisesDependency(Promise);
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const S3_BUCKET = "strava-report-card";

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

const writeFile = async (event, filename, data) => {
  const isOffline = event.requestContext.domainName === "localhost";

  if (isOffline) {
    fs.writeFileSync(`./static/${filename}`, data);
  } else {
    await s3
      .putObject({
        Body: data,
        Bucket: S3_BUCKET,
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
  !isMoreThanOneYearAgo(new Date(activity.start_date)) && activity.type === "Run";


module.exports.msgHandler = async (event, context) => {
  const authCode = JSON.parse(event.body).authCode;

  // use the supplied aurhorisation code to obtain an access code
  // https://developers.strava.com/docs/authentication/
  const body = await httpRequest(authTokenRequest(authCode));
  if (body.error) {
    console.error(body);
    await sendMessage(event, { status: "Problem accessing Strava data :-(" });
    return {
      statusCode: 500
    };
  }
  const accessToken = body.access_token;
  await sendMessage(event, { status: "Connected to Strava ...." });

  // download the athlete data
  const athlete = await httpRequest(athleteRequest(accessToken));
  await sendMessage(event, {
    status: "Athlete data downloaded ..."
  });

  const athleteData = {
    runs: [],
    generation_time: new Date().toISOString(),
    athlete
  };

  // download at least one years worth of running data
  let lastRunDate,
    page = 1;
  do {
    const activities = await httpRequest(
      activitiesRequest(page++, accessToken)
    );
    athleteData.runs = athleteData.runs.concat(
      activities.filter(filterActivity)
    );
    lastRunDate = new Date(last(activities).start_date);
    await sendMessage(event, {
      status: `Data for ${athleteData.runs.length} runs downloaded ...`
    });
    await wait(1000);
  } while (!isMoreThanOneYearAgo(lastRunDate));

  await sendMessage(event, {
    status: `Fetching additional run data ...`
  });

  // download 6 runs that contain photis
  const runsWithPhotos = athleteData.runs
    .filter(r => r.total_photo_count > 0)
    .sort(() => 0.5 - Math.random())
    .slice(0, 6);
  for (let i = 0; i < runsWithPhotos.length; i++) {
    const activity = await httpRequest(
      activityRequest(runsWithPhotos[i].id, accessToken)
    );
    const idx = athleteData.runs.findIndex(r => r.id === runsWithPhotos[i].id);
    athleteData.runs[idx] = activity;
    await wait(1000);
  }

  await sendMessage(event, {
    status: `Generating the report ...`
  });

  // save the raw data to S3
  await writeFile(
    event,
    `${athleteData.athlete.id}.json`,
    JSON.stringify(athleteData, null, 2)
  );

  // generate the report
  const report = reportGenerator(athleteData);
  await writeFile(event, `${athleteData.athlete.id}.html`, report);

  const isOffline = event.requestContext.domainName === "localhost";
  const reportUrl = isOffline
    ? `http://localhost:8080/${athleteData.athlete.id}.html`
    : `https://strava-report-card.s3.eu-west-2.amazonaws.com/${athleteData.athlete.id}.html`;
  await sendMessage(event, {
    status: "report generated",
    reportUrl
  });

  return { statusCode: 200, body: "Data sent." };
};
