const API_BASE_URL = "http://localhost:5000/api";

export const analyzePlannerLayout = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/planner/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze planner layout");
  }

  return response.json();
};

export const optimizePlannerLayout = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/planner/optimize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to optimize planner layout");
  }

  return response.json();
};

export const getProjects = async () => {
  const response = await fetch(`${API_BASE_URL}/projects?t=${Date.now()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load projects");
  }

  return response.json();
};

export const getProjectByFile = async (fileName) => {
  const response = await fetch(
    `${API_BASE_URL}/projects/${fileName}?t=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Failed to load selected project");
  }

  return response.json();
};

export const saveProject = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save project");
  }

  return response.json();
};