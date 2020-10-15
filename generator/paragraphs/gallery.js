const { sum } = require("d3-array");

module.exports = stravaData => {
  const photoCount = sum(stravaData.runs, d => d.total_photo_count);

  const gallery = stravaData.runs
    .filter(r => r.photos)
    .map(r => r.photos.primary.urls["600"])
    .slice(0, 6);

  if (gallery.length < 2) {
    return {};
  }

  return {
    gallery,
    photo_count: photoCount
  };
};
