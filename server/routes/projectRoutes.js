const express = require("express");
const {
  createProject,
  getProjects,
  getProjectByFile,
} = require("../controllers/projectController");

const router = express.Router();

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:fileName", getProjectByFile);

module.exports = router;