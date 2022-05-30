
import { Injectable } from '@nestjs/common';
import { Client, Pool } from 'pg';
import * as config from '../../../config.json'

@Injectable()
export class MyTestRepository {
    pool

    constructor(init: boolean = true) {
        if (init) this.init();
    }

    init() {
        this.pool = new Pool({
            user: config.test.pg.user,
            host: config.test.pg.host,
            database: config.test.pg.database,
            password: config.test.pg.password
        });

        this.pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
    } 

    /**
     * Resets test database.
     * 
     * Give jest a high timeout interval (second param)
     * due to database creation.
     */
    async reset() {
        // Drop current connection
        await this.end();

        const superClient = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres',
            password: 'SECRET'
        })
        await superClient.connect();
    
        // Drop test database and create a duplicate the original
        await superClient.query('DROP DATABASE IF EXISTS kchap_test');
        await superClient.query('CREATE DATABASE kchap_test WITH TEMPLATE kchap_test_original;');

        await superClient.end();

        this.init();
    }

    async onModuleDestroy() {
        await this.end();
    }

    getClient(callback?): any {
        if (callback && typeof callback == 'function') {
            this.pool.connect((err, client, done) => {
                callback(err, client, done);
            });
        } else {
            return this.pool.connect();
        }
    }

    query(text, params, callback) {
        if (callback === undefined && typeof params == 'function') {
            callback = params;
            params = undefined;
        }

        const promise = new Promise(async function (resolve, reject) {

            const start = Date.now();

            try {
                const res = await this.pool.query(text, params);
                const duration = Date.now() - start;
                //console.log('executed query', { text, duration, rows: res.rowCount });
                resolve(res);
            } catch (e) {
                reject(e);
            }

        });

        if (callback && typeof callback == 'function') {
            promise.then(callback.bind(null, null), callback);
        }
        return promise;
    }

    CbLogQuery(text, params, callback) {
        if (typeof callback === 'undefined') {
            callback = params;
            params = null;
        }

        const start = Date.now();
        return this.pool.query(text, params, (err, res) => {
            const duration = Date.now() - start;
            console.log('executed query', { text, duration, rows: res.rowCount });
            callback(err, res);
        });
    }

    async end() { if (this.pool) await this.pool.end(); }
}