import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let memoryServer = null;

export async function connectDb(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);

  let connectionUri = uri;

  if (config.useMemoryMongo) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    connectionUri = memoryServer.getUri('local_cab_booking');
    logger.info('database.memory_started', {});
  }

  try {
    await mongoose.connect(connectionUri);
  } catch (err) {
    if (!config.useMemoryMongo && config.env !== 'production') {
      logger.warn('database.connect_failed_falling_back_to_memory', { message: err.message });
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      connectionUri = memoryServer.getUri('local_cab_booking');
      await mongoose.connect(connectionUri);
    } else {
      throw err;
    }
  }

  logger.info('database.connected', {
    uri: connectionUri.replace(/\/\/.*@/, '//***@'),
    memory: Boolean(memoryServer),
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
