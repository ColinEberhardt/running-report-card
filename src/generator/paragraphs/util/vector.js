const { sum, zip } = require("d3-array");

const normalise = v => {
  const total = sum(v, d => d);
  return v.map(d => d / total);
};

const distance = (v1, v2) =>
  sum(zip(normalise(v1), normalise(v2)).map(v => Math.abs(v[0] - v[1])));

const orderedVectors = (data, vectorAccessor, referenceVector) =>
  data
    .map(p => ({
      data: p,
      distance: distance(referenceVector, vectorAccessor(p))
    }))
    .sort((a, b) => a.distance - b.distance);

// for the given array, finds the element with a vector closest to the given reference vector
const closestVector = (data, vectorAccessor, referenceVector) =>
  orderedVectors(data, vectorAccessor, normalise(referenceVector))[0].data;

module.exports = {
  distance,
  closestVector,
  orderedVectors
};
