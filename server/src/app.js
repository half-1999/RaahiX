import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { success } from './utils/response.js';
import routes from './routes/index.js';

const app = express();

const localDevOrigin =
  /^https?:\/\/(localhost|127\.0\.0\.1):(517\d|3000|4173)$/i;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (config.clientUrls.includes(origin)) return true;
  if (config.env !== 'production' && localDevOrigin.test(origin)) return true;
  return false;
}

app.use(
  helmet({
    // Allow browser clients on another origin (Vite) to call the API.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '4mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
}

app.get('/', (req, res) => {
  success(res, {
    message: 'RaahiX API',
    data: {
      health: '/api/health',
      app: 'https://raahi-x.vercel.app',
    },
  });
});

app.get('/api/health', (req, res) => {
  success(res, { message: 'OK', data: { status: 'ok', env: config.env } });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
