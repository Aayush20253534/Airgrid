const calculateHealthScore = (deadZonePercent, interferenceVectors, nodes) => {
  if (!nodes || nodes.length === 0) return 0;

  let score = 100;

  score -= deadZonePercent * 0.7;

  interferenceVectors.forEach((vector) => {
    if (vector.severity === "critical") score -= 15;
    if (vector.severity === "medium") score -= 7;
    if (vector.severity === "low") score -= 2;
  });

  return Math.max(5, Math.min(100, Math.round(score)));
};

module.exports = { calculateHealthScore };