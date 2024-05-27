import express from 'express';
import routers from './routers';
import config from './config';
import log4js, { Configuration } from 'log4js';
import mongoose, { ConnectOptions } from 'mongoose';
import getConsulValue from './consul';
import { dateInputMiddleware } from './middlewares';

export default async () => {
  const app = express();

  log4js.configure(config.log4js as Configuration);

  // to disable caching of requests returning 304 instead of 200
  app.disable('etag');

  app.use(express.json({ limit: '1mb' }));

  app.use(dateInputMiddleware);

  app.use('/', routers);

  const port = await getConsulValue('/port') as number;
  const address = await getConsulValue('/address') as string;
  app.listen(port, address, () => {
    log4js.getLogger().info(`Testimonies app listening on port ${address}:${port}`);
  });

  const mongoAddress = await getConsulValue('/mongo.address') as string;
  await mongoose.connect(mongoAddress, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    socketTimeoutMS: 30000,
  } as ConnectOptions);

  return app;
};
