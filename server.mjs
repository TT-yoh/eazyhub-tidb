import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Mount Vercel API routes
  app.use('/api', async (req, res) => {
    try {
      req.headers.host = req.headers.host || 'localhost:5173';
      // req.path will be e.g. "/query"
      const routeName = req.path.replace(/^\//, '').split('?')[0]; 
      const tsFilePath = path.join(__dirname, 'api', `${routeName}.ts`);
      
      if (!fs.existsSync(tsFilePath)) {
        return res.status(404).json({ error: 'API Route Not Found' });
      }

      // Dynamic import the compiled module (we use ts-node via vite-node in reality, but since vite is running we can use it to transform)
      // Actually, since we are inside Vite's dev server process, we can use vite.ssrLoadModule
      const module = await vite.ssrLoadModule(tsFilePath);
      const handler = module.default;

      if (typeof handler !== 'function') {
        return res.status(500).json({ error: 'Handler is not a function' });
      }

      // Execute handler
      await handler(req, res);

    } catch (err) {
      console.error(`API Error on ${req.url}:`, err);
      if (!res.headersSent) {
         res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
    }
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  const port = 5173;
  app.listen(port, () => {
    console.log(`\n🚀 EazyHub TiDB Dev Server running at: http://localhost:${port}`);
    console.log(`⚡ API Routes (/api/*) are enabled via custom Vercel emulation middleware.\n`);
  });
}

startServer();
