const querystring = require("querystring");

module.exports.activitiesRequest = (page, token) => ({
  method: "GET",
  uri: "https://www.strava.com/api/v3/athlete/activities",
  headers: {
    Authorization: `Bearer ${token}`
  },
  qs: {
    per_page: 100,
    page
  },
  json: true
});

module.exports.activityRequest = (id, token) => ({
  method: "GET",
  uri: `https://www.strava.com/api/v3/activities/${id}`,
  headers: {
    Authorization: `Bearer ${token}`
  },
  json: true
});

module.exports.athleteRequest = token => ({
  method: "GET",
  uri: "https://www.strava.com/api/v3/athlete",
  headers: {
    Authorization: `Bearer ${token}`
  },
  json: true
});

module.exports.authTokenRequest = code => ({
  method: "POST",
  uri: "https://www.strava.com/oauth/token",
  form: {
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    code
  },
  json: true
});

module.exports.loginUrl = redirectUrl =>
  "https://www.strava.com/oauth/authorize?" +
  querystring.stringify({
    client_id: process.env.CLIENT_ID,
    redirect_uri: redirectUrl,
    response_type: "code",
    scope: "activity:read,profile:read_all"
  });
