const COVERAGE_DEVICE_TYPES = ["WiFi AP", "Router"];
const MIN_USABLE_SIGNAL = 6;

const lineIntersectsRect = (x1, y1, x2, y2, rect) => {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  const pointInside =
    x2 >= left && x2 <= right && y2 >= top && y2 <= bottom;

  if (pointInside) return true;

  const ccw = (ax, ay, bx, by, cx, cy) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  };

  const intersects = (ax, ay, bx, by, cx, cy, dx, dy) => {
    return (
      ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
      ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
    );
  };

  return (
    intersects(x1, y1, x2, y2, left, top, right, top) ||
    intersects(x1, y1, x2, y2, right, top, right, bottom) ||
    intersects(x1, y1, x2, y2, right, bottom, left, bottom) ||
    intersects(x1, y1, x2, y2, left, bottom, left, top)
  );
};

const calculateCoverage = (
  canvasWidth,
  canvasHeight,
  gridSize,
  nodes = [],
  walls = []
) => {
  const cols = Math.ceil(canvasWidth / gridSize);
  const rows = Math.ceil(canvasHeight / gridSize);

  let coveredCellsCount = 0;
  let deadCellsCount = 0;
  const cells = [];

  const coverageNodes = nodes.filter((node) =>
    COVERAGE_DEVICE_TYPES.includes(node.type)
  );

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cellX = c * gridSize + gridSize / 2;
      const cellY = r * gridSize + gridSize / 2;

      let highestSignal = 0;
      const channelsPresent = [];

      coverageNodes.forEach((node) => {
        const dx = cellX - node.x;
        const dy = cellY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= node.range) {
          let signal = Math.max(
            0,
            (1 - distance / node.range) * node.power
          );

          walls.forEach((wall) => {
            const blocked = lineIntersectsRect(
              node.x,
              node.y,
              cellX,
              cellY,
              wall
            );

            if (blocked) {
              signal *= Number(wall.attenuation ?? 0.08);
            }
          });

          highestSignal = Math.max(highestSignal, signal);
          channelsPresent.push(node.channel);
        }
      });

      const uniqueChannels = new Set(channelsPresent);

      const interferenceTint =
        channelsPresent.length > uniqueChannels.size
          ? Math.min((channelsPresent.length - uniqueChannels.size) * 0.4, 1)
          : 0;

      
      const isCovered = highestSignal >= MIN_USABLE_SIGNAL;

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

  const totalCells = cols * rows || 1;

  return {
    cells,
    coveragePercent: Math.round((coveredCellsCount / totalCells) * 100),
    deadZonePercent: Math.round((deadCellsCount / totalCells) * 100),
  };
};

module.exports = { calculateCoverage };