import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects login with invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@rollcall.edu', password: 'wrongpassword' })
      .expect(401);
  });

  it('rejects registration with a short password', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'test@rollcall.edu', password: '123', role: 'STUDENT' })
      .expect(400);
  });
});
