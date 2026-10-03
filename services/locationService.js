/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Check if user is within the allowed distance radius
 */
function isWithinRadius(userLat, userLon, restLat, restLon, radiusMeters) {
  const distance = calculateDistanceMeters(userLat, userLon, restLat, restLon);
  return {
    isWithin: distance <= radiusMeters,
    distanceMeters: distance
  };
}

module.exports = {
  calculateDistanceMeters,
  isWithinRadius
};