function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return Math.round(R * c);
}

function isWithinRadius(
  userLat,
  userLon,
  restaurantLat,
  restaurantLon,
  radiusMeters
) {
  const distanceMeters = calculateDistanceMeters(
    userLat,
    userLon,
    restaurantLat,
    restaurantLon
  );

  return {
    isWithin: distanceMeters <= radiusMeters,
    distanceMeters
  };
}

module.exports = {
  calculateDistanceMeters,
  isWithinRadius
};