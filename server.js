const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const app = express();
const PORT = 3000;
const PYTHON_API = "http://127.0.0.1:5000";

app.use("/api", createProxyMiddleware({
  target: PYTHON_API,
  changeOrigin: true,
  pathRewrite: (requestPath) =>
    requestPath.startsWith("/api/") ? requestPath : `/api${requestPath}`,
  on: {
    error: (err, req, res) => {
      console.error("Python backend is not reachable:", err.message);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "application/json" });
      }
      res.end(JSON.stringify({
        error: "Python backend is not running. Start Flask in the backend terminal."
      }));
    }
  }
}));

app.use(express.static(path.join(__dirname, "frontend")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CampusConnect frontend: http://localhost:${PORT}`);
  console.log("Make sure the Python backend is also running on port 5000.");
});