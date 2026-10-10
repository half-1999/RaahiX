import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let memoryServer = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function persistentMemoryPath() {
  const dir = path.resolve(__dirname, '../../.data/mongo');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clearStaleLock(dbPath) {
  for (const name of ['mongod.lock', 'WiredTiger.lock']) {
    const lockPath = path.join(dbPath, name);
    try {
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    } catch {
      // ignore
    }
  }
}

async function startMemoryMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const dbPath = persistentMemoryPath();
  clearStaleLock(dbPath);

  memoryServer = await MongoMemoryServer.create({
    instance: {
      port: 27018,
      dbName: 'local_cab_booking',
      dbPath,
      storageEngine: 'wiredTiger',
    },
  });

  const uri = memoryServer.getUri('local_cab_booking');
  logger.info('database.memory_started', { persistent: true, dbPath, port: 27018 });
  return uri;
}

export async function connectDb(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  mongoose.set('bufferTimeoutMS', 20000);

  let connectionUri = uri;

  if (config.useMemoryMongo) {
    connectionUri = await startMemoryMongo();
  }

  try {
    await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 20000,
      maxPoolSize: 10,
    });
  } catch (err) {
    if (!config.useMemoryMongo && config.env !== 'production') {
      logger.warn('database.connect_failed_falling_back_to_memory', { message: err.message });
      connectionUri = await startMemoryMongo();
      await mongoose.connect(connectionUri, {
        serverSelectionTimeoutMS: 20000,
        maxPoolSize: 10,
      });
    } else {
      throw err;
    }
  }

  logger.info('database.connected', {
    uri: connectionUri.replace(/\/\/.*@/, '//***@'),
    memory: Boolean(memoryServer),
    env: config.env,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop({ doCleanup: false, force: true });
    memoryServer = null;
  }
}
