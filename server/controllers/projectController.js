const fs = require("fs");
const path = require("path");

const projectsDir = path.join(__dirname, "..", "data", "projects");

const ensureProjectsDir = () => {
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
};

const safeFileName = (name) => {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
};

const createProject = async (req, res) => {
  try {
    ensureProjectsDir();

    const projectName = req.body.projectName || "Untitled Project";
    const fileName = `${safeFileName(projectName)}.json`;
    const filePath = path.join(projectsDir, fileName);

    const project = {
      id: Date.now().toString(),
      fileName,
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(project, null, 2));

    console.log("PROJECT FILE SAVED:", fileName);

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjects = async (req, res) => {
  try {
    ensureProjectsDir();

    const files = fs
      .readdirSync(projectsDir)
      .filter((file) => file.endsWith(".json"));

    const projects = files.map((file) => {
      const filePath = path.join(projectsDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      return {
        fileName: file,
        projectName: data.projectName,
        createdAt: data.createdAt,
        nodesCount: data.nodes?.length || 0,
        areaBlocksX: data.areaBlocksX,
        areaBlocksY: data.areaBlocksY,
      };
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectByFile = async (req, res) => {
  try {
    ensureProjectsDir();

    const fileName = req.params.fileName;
    const filePath = path.join(projectsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Project file not found" });
    }

    const project = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectByFile,
};