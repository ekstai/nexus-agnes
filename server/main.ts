import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { configureApp } from '@lark-apaas/fullstack-nestjs-core';
import { join } from 'path';
import express from 'express';
import { __express as hbsExpressEngine } from 'hbs';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || 'local-user';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });

  // 本地独立运行:模拟平台网关注入用户上下文
  app.use((req, _res, next) => {
    if (!req.headers['x-larkgw-suda-webuser']) {
      req.headers['x-larkgw-suda-webuser'] = encodeURIComponent(
        JSON.stringify({
          user_id: LOCAL_USER_ID,
          tenant_id: 'local-tenant',
          app_id: 'local-app',
          login_url: '',
          user_name: { zh_cn: '本地用户' },
        })
      );
    }
    next();
  });

  // 本地独立运行:托管前端构建产物
  const clientDir = join(process.cwd(), 'dist/client');
  app.use('/assets', express.static(join(clientDir, 'assets')));
  app.use('/polyfills.js', express.static(clientDir, { index: false }));

  await configureApp(app, { 
    disableSwagger: true,
  });
  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || 'localhost';
  const port = Number(process.env.SERVER_PORT || '3000');

  // 注册视图引擎, 渲染 client 目录下的 html 文件
  app.setBaseViewsDir(join(process.cwd(), 'dist/client'));
  app.setViewEngine('html');
  app.engine('html', hbsExpressEngine);

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
}

bootstrap();
