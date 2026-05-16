const express = require("express");
const {
  analyzePlanner,
  optimizePlanner,
} = require("../controllers/plannerController");

const router = express.Router();

router.post("/analyze", analyzePlanner);
router.post("/optimize", optimizePlanner);

module.exports = router;