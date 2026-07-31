import { API_BASE_PATH } from '@news/contracts';
import express from 'express';

const app = express();
const port = Number(process.env['PORT'] ?? 3001);

app.get(`${API_BASE_PATH}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}${API_BASE_PATH}`);
});
