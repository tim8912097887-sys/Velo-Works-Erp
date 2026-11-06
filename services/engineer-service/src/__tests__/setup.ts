import { afterAll, beforeAll, beforeEach, vitest } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';

beforeEach(() => {
  vitest.resetAllMocks();
  vitest.restoreAllMocks();
  vitest.clearAllMocks();
});

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();

  await app.init();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

export const getApp = (): INestApplication => app;
