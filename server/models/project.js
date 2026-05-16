const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    canvasWidth: Number,
    canvasHeight: Number,
    gridSize: Number,
    nodes: Array,
    visualSettings: Object,
    lastAnalysis: Object,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);