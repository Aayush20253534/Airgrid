const detectInterference = (nodes) => {
  const vectors = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < n1.range + n2.range) {
        let severity = "low";

        if (n1.frequency === n2.frequency) {
          const channelDiff = Math.abs(n1.channel - n2.channel);

          if (channelDiff === 0) severity = "critical";
          else if (channelDiff <= 4) severity = "medium";
        }

        vectors.push({
          id: `${n1.id}-${n2.id}`,
          from: { x: n1.x, y: n1.y, name: n1.name },
          to: { x: n2.x, y: n2.y, name: n2.name },
          severity,
        });
      }
    }
  }

  return vectors;
};

module.exports = { detectInterference };