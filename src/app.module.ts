import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './services';
import { FirebaseService, Configuration } from './common';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [Configuration.envs],
      isGlobal: true,
    }),
  ],
  providers: [AppService, Logger, FirebaseService],
})
export class AppModule {}
