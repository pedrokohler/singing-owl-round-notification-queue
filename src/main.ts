import { readFile } from 'fs/promises';
import { NestFactory } from '@nestjs/core';
import { LoggingWinston } from '@google-cloud/logging-winston';
import * as functions from 'firebase-functions';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';
import { AppService } from './services';
import { Configuration } from './common';
import IMessagePayload from './interfaces/message-payload.interface';
import { Message } from 'firebase-functions/lib/providers/pubsub';
dotenv.config();

class Main {
  private readonly builder: functions.FunctionBuilder;
  private readonly environment: string;
  private readonly minimumLevel: string;
  private readonly entryPoint: string;
  constructor() {
    const envs = Configuration.envs();
    this.builder = functions.region(envs.gcp.region);
    this.environment = envs.environment;
    this.minimumLevel = envs.gcp.loggingLevel;
    this.entryPoint = envs.gcp.pubsub.topic;
  }

  get main() {
    return this.builder.pubsub
      .topic(this.entryPoint)
      .onPublish(this.runService.bind(this));
  }

  async runService(message: Message) {
    const payload = message.json as IMessagePayload;
    const loggingWinston = new LoggingWinston();
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: WinstonModule.createLogger({
        level: this.minimumLevel,
        transports: [new winston.transports.Console(), loggingWinston],
      }),
    });
    const service = app.get(AppService);
    await service.execute(payload);
  }

  get mock() {
    if (this.environment === 'Development') {
      return this.builder.https.onRequest(async (req, res) => {
        const fileContent = await readFile(
          './src/message-payload.json',
          'utf-8',
        );
        const payload = JSON.parse(fileContent);

        const message = new Message({
          json: payload,
        });
        await this.runService(message);
        res.sendStatus(200);
      });
    }
    return null;
  }
}

export default new Main();
