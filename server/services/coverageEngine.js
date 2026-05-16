const calculateCoverage = (canvasWidth, canvasHeight, gridSize, nodes) => {
  const cols = Math.ceil(canvasWidth / gridSize);
  const rows = Math.ceil(canvasHeight / gridSize);

  let coveredCellsCount = 0;
  let deadCellsCount = 0;
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellX = c * gridSize + gridSize / 2;
      const cellY = r * gridSize + gridSize / 2;

      let highestSignal = 0;
      const channelsPresent = [];

      nodes.forEach((node) => {
        const dx = cellX - node.x;
        const dy = cellY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= node.range) {
          const signal = Math.max(0, (1 - distance / node.range) * node.power);
          highestSignal = Math.max(highestSignal, signal);
          channelsPresent.push(node.channel);
        }
      });

      const uniqueChannels = new Set(channelsPresent);
      const interferenceTint =
        channelsPresent.length > uniqueChannels.size
          ? Math.min((channelsPresent.length - uniqueChannels.size) * 0.4, 1)
          : 0;

      const isCovered = highestSignal > 0;

      if (isCovered) coveredCellsCount++;
      else deadCellsCount++;

      cells.push({
        x: c * gridSize,
        y: r * gridSize,
        isCovered,
        signalStrength: highestSignal,
        interferenceTint,
      });
    }
  }

  const totalCells = cols * rows;

  return {
    cells,
    coveragePercent: Math.round((coveredCellsCount / totalCells) * 100),
    deadZonePercent: Math.round((deadCellsCount / totalCells) * 100),
  };
};

module.exports = { calculateCoverage };