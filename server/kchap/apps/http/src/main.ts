import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as passport from 'passport';
import * as MongoStore from "connect-mongo"
import * as session from "express-session"
import * as dotenv from "dotenv";
import * as config from '../../../config.json'
import { urlencoded, json } from 'express';
import { HttpExceptionFilter } from './exception/filter/http.exception.filter';
import { ValidationBadRequestExceptionFilter } from './exception/filter/validation.bad.request.exception.filter';
import { ResourceExceptionFilter } from './exception/filter/resource.exception.filter';
import { Big } from 'big.js';
import { SignupEmailUnavailableExceptionFilter } from './exception/filter/signup.email.unavailable.filter';
import { ValidationBadRequestException } from './exception/validation.bad.request.exception';
import { ValidationError, ValidationPipe } from '@nestjs/common';
import * as utils from '../../http/src/utils/utils';


dotenv.config();

Big.DP = config.generic.dp;
Big.RM = 1;       // ROUND_HALF_UP
Big.NE = -30

declare global {
  namespace Express {
    interface SessionData {
      cookie: any
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);

  app.use(session({
      store: MongoStore.default.create({
        mongoUrl: utils.isProd() ? config.production.mongo.url : config.test.mongo.url,
        stringify: false
      }),
      name: config.generic.session.name,
      secret: config.generic.session.secret,
      resave: false,                                    // Do not resave session with every request
      saveUninitialized: false,                         // Do not create a (empty) cookie until we have some user data to save
      rolling: true,                                    // Refresh an already initialized cookie every time a request is served
      proxy: process.env.NODE_ENV == 'production',
      cookie: {
          httpOnly: true,                               // Javascript cannot access cookie
          secure: process.env.NODE_ENV == 'production',
          sameSite: true,                               // Send cookie only with same-site requests (same domain), still use CSRF token, older browsers do not support same-site
          maxAge: 1000 * 60 * 60 * 24 * 7               // millis * sec * min *  hrs * days
      }
  }))
  app.use(passport.initialize());
  app.use(passport.session());

  /* On unhandledRejection and uncaughtException server should restart. PM2 takes care of that, since app stops when occured */
  app.useGlobalFilters(new HttpExceptionFilter()); 
  app.useGlobalFilters(new ValidationBadRequestExceptionFilter());                                // Catches transformed validation errors
  app.useGlobalFilters(new SignupEmailUnavailableExceptionFilter());                              // Catches transformed validation errors
  app.useGlobalFilters(new ResourceExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({ 
      exceptionFactory: (errors: ValidationError[]) => new ValidationBadRequestException(errors)  // Global validation filter for request body
    })
  );

  app.use(json({ limit: config.generic.payloadLimit }));                                          // Avoid big payloads
  app.use(urlencoded({ extended: true, limit: config.generic.payloadLimit }));

  app.enableShutdownHooks();

  await app.listen(3000);
  return app;
}
bootstrap();

export default bootstrap;