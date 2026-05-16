const generateSuggestions = (deadZonePercent, interferenceVectors, nodes) => {
  const suggestions = [];

  interferenceVectors.forEach((vector) => {
    if (vector.severity === "critical") {
      suggestions.push({
        type: "channel",
        msg: `Co-channel conflict detected between ${vector.from.name} and ${vector.to.name}. Change one device to a different channel.`,
      });
    }

    if (vector.severity === "critical" || vector.severity === "medium") {
      suggestions.push({
        type: "position",
        msg: `Move ${vector.to.name} farther away from ${vector.from.name} to reduce interference.`,
      });
    }
  });

  if (deadZonePercent > 25) {
    suggestions.push({
      type: "coverage",
      msg: `High dead zone detected (${deadZonePercent}%). Add a WiFi AP or Router in the uncovered region.`,
    });
  }

  if (suggestions.length === 0 && nodes.length > 0) {
    suggestions.push({
      type: "perfect",
      msg: "Network layout looks stable. No critical issues found.",
    });
  }

  if (nodes.length === 0) {
    suggestions.push({
      type: "empty",
      msg: "No devices deployed. Add routers or access points to begin analysis.",
    });
  }

  return suggestions;
};

module.exports = { generateSuggestions };