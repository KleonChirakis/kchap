import * as mongo from 'mongodb';
import * as config from '../../../../config.json'
import * as constants from '../../../../constants'
import { Inject, Injectable } from '@nestjs/common';
import { Db } from 'typeorm';
import * as utils from '../utils/utils';

// COnnection factory generates instances of provider
export const connectionFactory = {
  provide: constants.MONGODB_PROVIDER,
  useFactory: async () => (new mongo.MongoClient(
      utils.isProd() ? config.production.mongo.url : config.test.mongo.url,
      { useNewUrlParser: true, useUnifiedTopology: true }
    )).connect()
};

// Once the module is destroyed, so is the mongo connection (onModuleDestroy)
@Injectable()
export class MongoDBProvider {
  constructor(@Inject(constants.MONGODB_PROVIDER) readonly connection: Db) { }  // Expose connection object

  async onModuleDestroy() {
    await this.connection.close();
  }
}
