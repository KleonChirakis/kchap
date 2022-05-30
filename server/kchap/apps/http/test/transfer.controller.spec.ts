import * as request from 'supertest';
import { MyTestRepository } from './my.test.repository';
import * as transferTest from './resources/transfer/test.transfer'
import { sortUserIds } from './test.utils';

// Cookie is initialized at login and used onwards
let cookie: string;

describe('TransferController', () => {
  const url = 'http://localhost:3000';
  const transferEndpoint = '/transfers/';
  let db, client;

  /* When using multiple objects use a temporary local storage */
  const transfers = new Map<string, number>();      // Tansfer <id, version>
  let bId;


  beforeAll(async () => {
    // Set/Reset data
    client = await (db = new MyTestRepository()).getClient();
    await Promise.all([
      client.query(`DELETE FROM transfer WHERE group_id = 99999`),

      client.query(`INSERT INTO users (id, name, main_provider) VALUES (100, 'Transaction user 1', 'local') ON CONFLICT (id) DO NOTHING`),
      client.query(`INSERT INTO users (id, name, main_provider) VALUES (200, 'Transaction user 2', 'local') ON CONFLICT (id) DO NOTHING`),
      client.query(`INSERT INTO users (id, name, main_provider) VALUES (300, 'Transaction user 3', 'local') ON CONFLICT (id) DO NOTHING`),

      client.query(`INSERT INTO users_kchap(user_id, password, email) VALUES (100, '$2b$10$q/b3GREcDCEuhXuPq7Uuf.DzCZie8Jy68/MESZpx5GL7O4GfD3XrC', 'transactionUser1@test.com') ON CONFLICT (user_id) DO NOTHING`),
      client.query(`INSERT INTO users_kchap(user_id, password, email) VALUES (200, '$2b$10$q/b3GREcDCEuhXuPq7Uuf.DzCZie8Jy68/MESZpx5GL7O4GfD3XrC', 'transactionUser2@test.com') ON CONFLICT (user_id) DO NOTHING`),
      client.query(`INSERT INTO users_kchap(user_id, password, email) VALUES (300, '$2b$10$q/b3GREcDCEuhXuPq7Uuf.DzCZie8Jy68/MESZpx5GL7O4GfD3XrC', 'transactionUser3@test.com') ON CONFLICT (user_id) DO NOTHING`),
      client.query(`INSERT INTO groups (id, name) VALUES (99999, 'Transaction group') ON CONFLICT (id) DO NOTHING`),

      client.query(`INSERT INTO groups_users (group_id, user_id) VALUES (99999, 100) ON CONFLICT (group_id, user_id) DO NOTHING`),
      client.query(`INSERT INTO groups_users (group_id, user_id) VALUES (99999, 200) ON CONFLICT (group_id, user_id) DO NOTHING`),
      client.query(`INSERT INTO groups_users (group_id, user_id) VALUES (99999, 300) ON CONFLICT (group_id, user_id) DO NOTHING`),

      client.query(`UPDATE groups_users SET balance = 1500 WHERE user_id = 100 AND group_id = 99999`),
      client.query(`UPDATE groups_users SET balance = -1200 WHERE user_id = 200 AND group_id = 99999`),
      client.query(`UPDATE groups_users SET balance = -300 WHERE user_id = 300 AND group_id = 99999`)
    ]);
  });

  afterAll(async () => {
    if (client != null)
      client.release();
    await db.end();
  });


  describe('tranfer test', () => {
    it('should login user 1', async () => {
      return request(url)
        .post('/auth/login')
        .send({
          email: 'transactionUser1@test.com',
          password: 'changeme',
          device: "test"
        })
        .expect(200)
        .then(res => {
          cookie = res.headers['set-cookie']
        });
    });

    it('should create first tranfer', async () => {
      return request(url)
        .post(transferEndpoint)
        .set('Cookie', cookie)
        .send(transferTest.transfer1)
        .expect(201)
        .then(async (res) => {
          transfers.set(res.body.id, res.body.version);
          bId = BigInt(res.body.b.id);
          sortUserIds(res.body.b.bs);
          expect(res.body.b)
            .toMatchObject(
              transferTest.transferResults['test.transfer.1.create.json']
            )
        })
    });

    it('should retrieve first transfer', async () => {
      const groupId = "99999"
      return request(url)
        .get(transferEndpoint + groupId)
        .query({ minId: bId + 1n })
        .set('Cookie', cookie)
        .expect(200)
        .then(async (res) => {
          expect(res.body.page.data).toHaveLength(1)                                                                                // Only one transaction should exist
          expect(res.body.page.data[0]).toMatchObject(                                                                              // Check most of object's properties
            {
              id: Array.from(transfers.keys())[0],              // Get id of first entry (only one should exist)
              groupId: groupId,
              description: transferTest.transfer1.description,
              amount: transferTest.transfer1.amount,
              fromUserId: transferTest.transfer1.fromUserId,
              toUserId: transferTest.transfer1.toUserId
            }
          )
          expect(new Date(res.body.page.data[0].dateTime)).toMatchObject(new Date(transferTest.transfer1.dateTime))           // Dates should be compared individually (dates received include double quotes while expected dates cannot include them)
          expect(new Date(res.body.page.data[0].createdOn)).toMatchObject(new Date(transferTest.transfer1.createdOn))
        })
    });

    it('should update first tranfer', async () => {
      const transferId = Array.from(transfers.keys())[0];
      return request(url)
        .put(`${transferEndpoint}${transferId}`)
        .set('Cookie', cookie)
        .send(Object.assign({}, transferTest.transfer2, { version: transfers.get(transferId) }))
        .expect(200)
        .then(async (res) => {
          transfers.set(transferId, res.body.version);
          sortUserIds(res.body.b.bs);
          expect(res.body.b)
            .toMatchObject(
              transferTest.transferResults['test.transfer.2.update.json']
            )
        });
    });

    it('should create second tranfer', async () => {
      return request(url)
        .post(transferEndpoint)
        .set('Cookie', cookie)
        .send(transferTest.transfer3)
        .expect(201)
        .then(async (res) => {
          transfers.set(res.body.id, res.body.version);
          sortUserIds(res.body.b.bs);
          expect(res.body.b)
            .toMatchObject(
              transferTest.transferResults['test.transfer.3.create.json']
            )
        });
    });

    it('should delete first tranfer', async () => {
      const transferId = Array.from(transfers.keys())[0];
      return request(url)
        .delete(`${transferEndpoint}${transferId}?timestamp=${new Date().getTime()}`)
        .set('Cookie', cookie)
        .expect(200)
        .then(async (res) => {
          sortUserIds(res.body.b.bs);
          expect(res.body.b)
            .toMatchObject(
              transferTest.transferResults['test.transfer.4.delete.json']
            )
        });
    });
  });
});