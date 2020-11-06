const { last } = require("../../util");

module.exports = stravaData => {
  if (stravaData.locations.length === 0) {
    return {};
  }

  // grab the geocoded location data
  let locationProperties = stravaData.locations
    .filter(l => l.geocoded)
    .map(l => l.geocoded.features[0].properties)
    .map(l => ({
      properties: l,
      name: l.city || l.state || l.name
    }));

  locationProperties.forEach((r, i) => {
    if (i === 0) return;
    // if we have duplicate names, use the suburb property
    if (
      locationProperties.filter(d => d.name === r.name).length > 1 &&
      r.properties.suburb
    ) {
      r.name = "the suburb of " + r.properties.suburb;
    }
  });

  // extract the unique names
  const locations = Array.from(new Set(locationProperties.map(l => l.name)));

  return {
    most_frequent_location: locations[0],
    ...(locations.length > 3 && {
      other_locations_one: locations[1],
      other_locations_two: locations[2]
    }),
    ...(locations.length > 1 && {
      furthest_location: last(locations)
    }),
    single_location: locations.length === 1,
    most_frequent_location_frequency: (
      (stravaData.locations[0].runs * 100) /
      stravaData.runs.length
    ).toFixed(0),
    all_locations: JSON.stringify(stravaData.locations.map(l => l.location))
  };
};
