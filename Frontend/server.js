import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Start server
app.listen(port, () => {
  console.log(`Frontend server running at http://localhost:${port}`);
  console.log('Open your browser and navigate to the URL above');
  console.log('Image clipboard operations require this HTTP server setup');
});