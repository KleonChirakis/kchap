import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DBModule } from './db/db.module';
import { GroupModule } from './group/group.module';
import { TransactionModule } from './transaction/transaction.module';
import { TransferModule } from './transfer/transfer.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [ 
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }), DBModule, AuthModule, GroupModule, TransactionModule, TransferModule]
})
export class AppModule {}