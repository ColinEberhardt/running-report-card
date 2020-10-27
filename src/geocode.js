const geocluster = require("geocluster");
const geolib = require("geolib");
const requestResponse = require("request-promise");

const { last } = require("./util");

const httpRequest = async config => {
  console.log("HTTP request", config);
  let result;
  result = await requestResponse(config);
  // console.log("HTTP response", result);
  return result;
};

// const reverseGeocodeOSM = coord =>
//   requestResponse({
//     method: "GET",
//     uri: `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord[0]}&lon=${coord[1]}&zoom=12&addressdetails=1`,
//     json: true,
//     headers: {
//       "User-Agent": `Running report card`
//     }x
//   });

const reverseGeocodeGeoApify = coord =>
  httpRequest({
    method: "GET",
    uri: `https://api.geoapify.com/v1/geocode/reverse?lat=${coord[0]}&lon=${coord[1]}&apiKey=${process.env.GEOAPIFY_KEY}`,
    json: true
  });

const geoDistance = (a, b) =>
  geolib.getDistance(
    { latitude: a[0], longitude: a[1] },
    { latitude: b[0], longitude: b[1] }
  );

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const geocodePlaces = async places => {
  const names = [];
  for (let i = 0; i < places.length; i++) {
    places[i].geocoded = await reverseGeocodeGeoApify(places[i].location);
    await wait(1000);
  }
  return names;
};

const findClusters = (coordinates, bias = 0.001, depth = 0) => {
  const clusters = geocluster(coordinates, bias);
  if (clusters.length > 10 && depth < 13) {
    return findClusters(coordinates, bias * 2, depth++);
  }
  return clusters;
};

module.exports = async stravaData => {
  const coordinates = stravaData.runs.map(r => r.start_latlng).filter(r => r);

  if (coordinates.length === 0) {
    return [];
  }

  // cluster by location, with the number of runs per cluster
  // this should produce approx 10 clusters
  let clusters = findClusters(coordinates)
    .map(c => ({
      location: c.centroid,
      runs: c.elements.length
    }))
    .sort((a, b) => b.runs - a.runs);

  // compute distance from most popular
  clusters.forEach((c, i) => {
    c.distance = i === 0 ? 0 : geoDistance(c.location, clusters[0].location);
  });
  clusters.sort((a, b) => a.distance - b.distance);

  // pick 4 places to reverse geocode
  const places = [
    clusters[0],
    ...clusters.slice(1, -1).slice(-2),
    last(clusters)
  ];

  await geocodePlaces(places);

  return clusters;
};
