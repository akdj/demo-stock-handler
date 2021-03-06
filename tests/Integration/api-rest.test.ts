'use strict';
process.env.API_TYPE = 'rest';
process.env.DATABASE_NAME = 'db_rest';

import request from 'supertest';
import randomstring from 'randomstring';

import testDB from '../test-utils/db';
import db from '../../src/database';
db.client = testDB.client || db.client;

import config from '../../src/config';
import app from '../../src/app';

function doCall(req: request.Test) {
  return req
    .set('accept-encoding', 'compress')
    .set('Access-Control-Allow-Origin', '*')
    .set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE')
    .set('AAccess-Control-Allow-Headers', 'Content-Type')
    .set('content-type', 'application/json')
    .set('accept', 'application/json')
    .set('X-API-KEY', `${config.server.apikey}`);
}

describe('Integration tests - Rest API', () => {
  const authUser = config.server.adminLogin;
  const authPwd = config.server.adminPassword;
  let requestId: string;
  beforeEach(() => {
    requestId = randomstring.generate();
  });
  beforeAll(async () => {
    await testDB.connect();
  });
  afterAll(async () => {
    await testDB.teardown();
    await testDB.disconnect(db.client);
  });

  describe('Test requests', () => {
    let accountId: string | number;
    let productId: string | number;
    let stockAmount: number;
    let holdAmount: number;

    describe('POST /account', () => {
      it('responds with 200 and request ID', async () => {
        const username = 'testuser-rest';
        await doCall(request(app).post('/account'))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .send({ username })
          .expect(200)
          .expect('x-request-id', requestId)
          .expect(res => {
            expect(res.body.data).toHaveProperty('id');
            expect(typeof res.body.data.id).toEqual('string');
            accountId = res.body.data.id;
          });
      });
      it('responds with 400 bad request', async () => {
        await doCall(request(app).post('/account'))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .send({})
          .expect(400)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toEqual("request.body should have required property 'username'");
          });
      });

      it('responds with 401 unauthorized', async () => {
        const username = 'testuser-rest2';
        await doCall(request(app).post('/account'))
          .set('X-REQUEST-ID', requestId)
          .send({ username })
          .expect(400)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(res.body).toHaveProperty('data');
            expect(res.body.data).toEqual('Authorization header required');
          });
      });
    });

    describe('DELETE /account', () => {
      it('responds with 200 and request ID', async () => {
        let temp;
        await doCall(request(app).post('/account'))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .send({ username: 'toto' })
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(res.body.data).toHaveProperty('id');
            expect(typeof res.body.data.id).toEqual('string');
            temp = res.body.data.id;
          });

        await doCall(request(app).delete('/account/' + temp))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId);
      });
    });

    describe('POST /product', () => {
      it('responds OK with product ID', async () => {
        const productA = 'product-A';
        const productB = 'product-B';
        const amount = 100;
        await doCall(request(app).post('/product'))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .send({ name: productA, amount })
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(res.body.data).toHaveProperty('id');
            expect(typeof res.body.data.id).toEqual('string');
            productId = res.body.data.id;
            stockAmount = amount;
          });

        await doCall(request(app).post('/product'))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .send({ name: productB, amount: 70 })
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(res.body.data).toHaveProperty('id');
            expect(typeof res.body.data.id).toEqual('string');
          });
      });
    });

    describe('PATCH /product/:productId', () => {
      it('responds OK', async () => {
        const amount = 50;
        await doCall(request(app).patch('/product/' + productId))
          .auth(`${authUser}`, `${authPwd}`)
          .set('X-REQUEST-ID', requestId)
          .send({ amount })
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            stockAmount = stockAmount + amount;
          });
      });
    });

    describe('GET /products', () => {
      it('responds OK with list of products', async () => {
        await doCall(request(app).get('/products'))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toEqual(2);
            expect(res.body.data[0]).toHaveProperty('name');
            expect(res.body.data[0]).toHaveProperty('amount');
            expect(res.body.data[1]).toHaveProperty('name');
            expect(res.body.data[1]).toHaveProperty('amount');
            const product = res.body.data.find((prod: { id: string | number }) => prod.id === productId);
            expect(product).toMatchObject({ id: productId, name: 'product-A', amount: stockAmount });
          });
      });
    });

    describe('POST /action/hold?accountId=xxx&productId=xxx', () => {
      it('responds 200', async () => {
        const amount = 80;
        await doCall(request(app).post(`/action/hold?accountId=${accountId}&productId=${productId}`))
          .set('X-REQUEST-ID', requestId)
          .send({ name: productId, amount })
          .expect(200)
          .expect('X-REQUEST-ID', requestId);

        await doCall(request(app).get('/products'))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
            const product = res.body.data.find((prod: { id: string | number }) => prod.id === productId);
            expect(product).toMatchObject({ id: productId, name: 'product-A', amount: stockAmount - amount });
          });
        stockAmount = stockAmount - amount;
        holdAmount = amount;
      });
    });

    describe('GET /account/:accountId/products', () => {
      it('responds 200 with list of account', async () => {
        await doCall(request(app).get(`/account/${accountId}/products`))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
            const product = res.body.data.find((prod: { product: string | number }) => prod.product.toString() === productId);
            expect(product).toMatchObject({ product: productId.toString(), amount: holdAmount });
          });
      });
    });

    describe('PATCH /action/hold?accountId=xxx&productId=xxx', () => {
      it('responds 200', async () => {
        const amount = -35;
        await doCall(request(app).patch(`/action/hold?accountId=${accountId}&productId=${productId}`))
          .set('X-REQUEST-ID', requestId)
          .send({ amount })
          .expect(200)
          .expect('X-REQUEST-ID', requestId);

        await doCall(request(app).get(`/account/${accountId}/products`))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
            const product = res.body.data.find((prod: { product: string | number }) => prod.product.toString() === productId);
            expect(product).toMatchObject({ product: productId.toString(), amount: holdAmount + amount });
          });

        await doCall(request(app).get('/products'))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
            const product = res.body.data.find((prod: { id: string | number }) => prod.id === productId);
            expect(product).toMatchObject({ id: productId, name: 'product-A', amount: stockAmount - amount });
          });

        stockAmount = stockAmount - amount;
        holdAmount = holdAmount + amount;
      });
    });

    describe('DELETE /action/hold?accountId=xxx&productId=xxx', () => {
      it('responds with json', async () => {
        await doCall(request(app).delete(`/action/hold?accountId=${accountId}&productId=${productId}`))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId);

        await doCall(request(app).get(`/account/${accountId}/products`))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
          });

        await doCall(request(app).get('/products'))
          .set('X-REQUEST-ID', requestId)
          .expect(200)
          .expect('X-REQUEST-ID', requestId)
          .expect(res => {
            expect(Array.isArray(res.body.data)).toBe(true);
            const product = res.body.data.find((prod: { id: string | number }) => prod.id.toString() === productId);
            expect(product).toMatchObject({ id: productId.toString(), name: 'product-A', amount: stockAmount });
          });
      });
    });
  });

  describe('Test Use cases', () => {
    // describe('Add new products, list products in stock, hold some products, list again remaining in stock',()=>{
    //   it('responds with json', async () => {});
    // });
    // describe('List products in stock, release some products, list remaining held, list remaining in stock',()=>{
    //   it('responds with json', async () => {});
    // });
    // describe('List in stock, List remaining held, move out all, list remaining held, list in stock',()=>{
    //   it('responds with json', async () => {});
    // });
    // describe('List in stock, hold some products, delete account, list in stock',()=>{
    //   it('responds with json', async () => {});
    // });
  });
});
