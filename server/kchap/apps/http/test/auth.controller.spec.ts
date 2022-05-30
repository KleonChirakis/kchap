import * as request from 'supertest';
import * as chai from 'chai';
import { MyTestRepository } from './my.test.repository';
import { MongoRepository } from '../src/db/mongo.repository';
import { Test } from '@nestjs/testing';
import { MongoModule } from '../src/db/mongo.module';


// Cookie is initialized at login and used onwards
let cookie: string;

describe('AppController', () => {
  let url = 'http://localhost:3000';
  let db, client, mongoDb, moduleRef;

  beforeAll(async () => {
    // Clear session using a db connection to the test server
    // Cannot remove specific user cookie because of lack of info
    moduleRef = await Test.createTestingModule({
      imports: [ MongoModule ]
    }).compile();
    mongoDb = moduleRef.get(MongoRepository);
    await mongoDb.deleteAll();

    // Delete test data
    client = await (db = new MyTestRepository()).getClient();
    const res =  await client.query(`SELECT user_id FROM users_kchap WHERE email = '${userLocal.email}'`);  
    await client.query(`DELETE FROM users_kchap WHERE email = '${userLocal.email}'`);  
    if (res.rows.length > 0) await client.query(`DELETE FROM users WHERE id = ${res.rows[0].user_id}`); 
    await client.query(`DELETE FROM users_fb WHERE fb_id = '${userFB.fbId}'`);
  });

  afterAll(async () => { 
    if (client != null) 
      client.release();
    await db.end();
    await moduleRef.close();     // This also executes onModuleDestroy() of the providers  
  });

  // User info
  const userLocal = {
    name: 'Test CreateUser',
    email: 'testCreate@email.com',  //'test_tjnnxtj_createuser@tfbnw.net',
    password: 'testCr3@tePass',
    device:'test'
  };
  const userFB = {
    fbId: '104169984956449',
    accessToken:'EAAFdS7Hx0ooBALsEuKxiKidRGU4PQayXqBaRFLZAeGZAaQ8t0UzMpGzTFYZBCPMF09MFARX6xTt2gasndM3LwQ1ZBwbbeXp2xKVgT7bWv6LuoJKc5jZBFuMSqpdjva0UIM4QXKVBYL0G9OnybFcjdluL9NSYm3h3dhF0HmwhE5mkFnqlo4jKUvXg4dD0FEZBDCui4wMriCEK1rAGE1Lc4s',
    device:'test'
  };

  describe('create user', () => {                    //https://stackoverflow.com/questions/51422239/unit-testing-nestjs-controller-with-request
    it('should signup and auto login user', async () => {
      return request(url)
        .post('/signup')
        .send(userLocal)
        .expect(201)
        .expect(res => {
          chai.expect(res.body).to.exist;
          chai.expect(res.body).to.have.keys("id", "name", "provider", "device", "loginDate", "deviceId");
        })
        .then(res => { 
          cookie = res.headers['set-cookie']                             // Initialize local test cookie
        });
    });

    it('should logout user', async () => {
      return request(url)
        .post('/auth/logout')
        .set('Cookie', cookie)
        .expect(200)
        .then(res => { 
          cookie = null                                                   // Clear local test cookie
        });
    });

    it('should login user using facebook', async () => {
      return request(url)
        .post('/auth/login')
        .send(userFB)
        .expect(200)
        .expect(res => {
          chai.expect(res.body).to.exist;
          chai.expect(res.body).to.have.keys("id", "name", "provider", "device", "loginDate", "deviceId");
        })
        .then(res => { 
          cookie = res.headers['set-cookie']
        });
    });
  });
});