const { least, mean } = require("d3-array");

module.exports = stravaData => {
  const popularRun = least(stravaData.runs, d => -d.kudos_count);
  return {
    thirteen: Math.floor(mean(stravaData.runs, d => d.kudos_count)),
    north_tyneside_ten: popularRun.name,
    north_tyneside_ten_id: popularRun.id,
    forty: popularRun.kudos_count,
    followers: stravaData.athlete.follower_count
  };
};
