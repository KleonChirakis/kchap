import { Module } from "@nestjs/common";
import { connectionFactory, MongoDBProvider } from "./mongo.connection.provider";
import { MongoRepository } from "./mongo.repository";

// Module is singleton application wide
@Module({
    providers: [connectionFactory, MongoDBProvider, MongoRepository],
    exports: [MongoRepository]
})
export class MongoModule { }
