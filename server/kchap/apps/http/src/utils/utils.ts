import * as  basex from 'base-x';
import * as crypto from 'crypto';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62 = basex(BASE62);

export function trim(value: string) {
    return (isString(value) && value != null) ? value.trim() : value;
}

export function isString(x: any) {
    return Object.prototype.toString.call(x) === "[object String]"
}

export function genRandString(len: number) {
    return base62.encode(crypto.randomBytes(len)).slice(0, len);      // returned length should be greater than param len
}

export function isProd() {
    return process.env.NODE_ENV === 'production';
}