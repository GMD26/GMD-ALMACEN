import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { INITIAL_PRODUCTS } from "./src/data/initialCatalog";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Catálogo KRONALINE BASE en la Nube - Sincronización global síncrona
  app.get("/api/catalog/kronaline", (req, res) => {
    res.json({
      success: true,
      updatedAt: new Date().toISOString(),
      message: "Catálogo KRONALINE BASE disponible en servidor para sincronización global",
      totalProducts: INITIAL_PRODUCTS.length,
      products: INITIAL_PRODUCTS
    });
  });

  // Vite middleware for development vs static production serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
