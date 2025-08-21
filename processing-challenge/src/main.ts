import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configureService = app.get(ConfigService);

  const serverPort = configureService.get<string>('PORT');

  if (serverPort === undefined) {
    throw Error('Undefined PORT env');
  }
  await app.listen(serverPort);
}

bootstrap();
