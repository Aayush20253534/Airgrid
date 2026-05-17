const { calculateCoverage } = require("../services/coverageEngine");
const { detectInterference } = require("../services/interferenceEngine");
const { calculateHealthScore } = require("../services/healthScoreEngine");
const { generateSuggestions } = require("../services/optimizerEngine");

const analyzePlanner = async (req, res) => {
  console.log("ANALYZE API HIT");
  try {
    const { canvasWidth, canvasHeight, gridSize, nodes = [], walls = [] } = req.body;

    const coverage = calculateCoverage(canvasWidth, canvasHeight, gridSize, nodes, walls);
    const interferenceVectors = detectInterference(nodes);
    const networkHealthScore = calculateHealthScore(
      coverage.deadZonePercent,
      interferenceVectors,
      nodes
    );

    res.json({
      ...coverage,
      interferenceVectors,
      networkHealthScore,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const optimizePlanner = async (req, res) => {
  console.log("OPTIMIZE API HIT");
  try {
    const { canvasWidth, canvasHeight, gridSize, nodes, walls } = req.body;

    const coverage = calculateCoverage(canvasWidth, canvasHeight, gridSize, nodes, walls);
    const interferenceVectors = detectInterference(nodes);
    const networkHealthScore = calculateHealthScore(
      coverage.deadZonePercent,
      interferenceVectors,
      nodes
    );
    const suggestions = generateSuggestions(
      coverage.deadZonePercent,
      interferenceVectors,
      nodes
    );

    res.json({
      ...coverage,
      interferenceVectors,
      networkHealthScore,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  analyzePlanner,
  optimizePlanner,
};