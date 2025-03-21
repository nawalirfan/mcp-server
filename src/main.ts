import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, LogLevel } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { json, urlencoded } from 'express';
import * as fs from 'fs';

async function bootstrap() {
  const logLevels = process.env.LOG_LEVELS || 'error,warn,log';
  const logLevelsArray: LogLevel[] = logLevels.split(',') as LogLevel[];
  const app = await NestFactory.create(AppModule, {snapshot: true, logger: logLevelsArray});
  const logger = new Logger('🤖 mcp');
  
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  // const configService = app.get(ConfigService);
  // const port = configService.get('MCP_API_PORT', 3001);
  const port = 3001;
  logger.log('MCP API PORT:', port);

  patchNestJsSwagger();

  try {
    const config = new DocumentBuilder()
      .setTitle('mcp workbench')
      .setDescription(
        'A tRPC API to manage a Staris AI Source Assisted Pen Test'
      )
      .addServer(`http://localhost:${port}`)
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    fs.writeFileSync('./openapi.json', JSON.stringify(document));

    SwaggerModule.setup('openapi', app, document);
  } catch (e) {
    logger.error('Failed to setup Swagger', e);
  }

  app.enableCors();

  app.enableShutdownHooks();

  await app.listen(port, () =>
    logger.log(`🚀 MCP API is listening: ${port}`)
  );
}
bootstrap();