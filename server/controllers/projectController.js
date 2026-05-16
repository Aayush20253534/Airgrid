let savedProjects = [];

const createProject = async (req, res) => {
  try {
    const project = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date(),
    };

    savedProjects.push(project);

    console.log("PROJECT SAVED:", project.projectName);

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjects = async (req, res) => {
  try {
    res.json(savedProjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject,
  getProjects,
};