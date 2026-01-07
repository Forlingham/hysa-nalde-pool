import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLogger } from './my-logger';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new MyLogger({
      json: true,
      colors: !process.env.NO_COLOR,
    }),
  });

  await app.listen(process.env.PORT ?? 3000);
  const logger = new Logger('Bootstrap');
  logger.log(`Current PORT: ${process.env.PORT}`);
}
bootstrap();
