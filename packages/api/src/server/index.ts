import 'reflect-metadata';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http, { Server } from 'http';

import { CONFIG, updateConfig } from '../config';
import { loadConfigFile } from '../config/loadConfigFile';
import { ApiConfig, Env } from '../config/types';
import { setupDatabase } from '../lib/database';
import { logger, setupLogger } from '../lib/logger';
import { apollo } from './middleware/apollo';
import { loadMiddleware } from './middleware/loadMiddleware';


let httpServer: Server;

/**
 * Starts a new Brix API server instance. Returns the `httpServer` and a Sequelize
 * instance.
 * @param config The API config to override all settings with (highest priority)
 */
export const server = async (config?: Partial<ApiConfig>) => {

  await loadConfigFile(config ? config.rootDir : undefined);
  await updateConfig(config || process.env.NODE_ENV as Env);

  await setupLogger();
  const db = await setupDatabase();

  const app = express();
  httpServer = http.createServer(app);

  // Middleware
  app.use(cors({
    origin: CONFIG.corsAllowFrom
  }));
  app.use(helmet({
    xssFilter: true
  }));

  await loadMiddleware(app);
  await apollo(app, httpServer);


  await new Promise(res => httpServer.listen(CONFIG.port, res));
  logger.info(`🚀 Server ready at http://localhost:${CONFIG.port}/graphql`);
  return { httpServer, db };

};


// File is called from command line
if (require.main === module) server();
