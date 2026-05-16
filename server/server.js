const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/planner", require("./routes/plannerRoutes"));
app.use("/api/projects", require("./routes/projectRoutes"));

app.listen(process.env.PORT || 5000, () => {
  console.log(`AirGrid backend running on port ${process.env.PORT || 5000}`);
});