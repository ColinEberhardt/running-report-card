const { last } = require("../../util");

module.exports = stravaData => { 
  if (stravaData.locations.length === 0) {
    return {};
  }

  // grab the location data
  let locationProperties = stravaData.locations
    .filter(l => l.geocoded)
    .map(l => l.geocoded.features[0].properties)
    .map(l => ({
      properties: l,
      name: l.city || l.state || l.name
    }));

  locationProperties.forEach((r, i) => {
    if (i === 0) return;
    if (
      locationProperties.filter(d => d.name === r.name).length > 1 &&
      r.properties.suburb
    ) {
      r.name = "the suburb of " + r.properties.suburb;
    }
  });

  const locations = locationProperties.map(l => l.name);

  return {
    most_frequent_location: locations[0],
    other_locations_one: locations[1],
    other_locations_two: locations[2],
    furthest_location: last(locations),
    most_frequent_location_frequency: (
      (stravaData.locations[0].runs * 100) /
      stravaData.runs.length
    ).toFixed(0),
    all_locations: JSON.stringify(stravaData.locations.map(l => l.location))
  }
}