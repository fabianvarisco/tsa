'use strict';

require('dotenv').config();
const hh = require('./hashHelper.js');
const mock = require('./mock.js');

const TIMEOUT = 100000;

var stamper;

beforeAll(async() => {
  const Stamper = require('./Stamper.js');
  stamper = await Stamper.build();
}, TIMEOUT);

test('stamp and verify an object', async() => {
  const text = String(Date.now());
  const hash = hh.digester(text).toString('hex');
  console.log(`stamping hash [${hh.ALGO}] [${hash}] from [${text}] ...`);

  const result = (await stamper.stamp(hash))[0];
  expect(result.status).toBe('stamped');

  const result2 = await stamper.verify(hash);
  expect(result2.stamped).toBeTruthy();
  console.log(result2);

  expect(result2.stamps[0].blocknumber).toBe(result.block);
  expect(result2.stamps[0].whostamped).toBe(stamper.defaultAccount);
  expect(result2.stamps[0].netid).toBe(stamper.netId);
  expect(result2.stamps[0].hashalgo).toBe(hh.ALGO);
}, TIMEOUT);

test('stamp twice the same object', async() => {
  const hash = mock.randomHex();

  const result = (await stamper.stamp(hash))[0];
  expect(result.status).toBe('stamped');

  const result2 = (await stamper.stamp([hash]))[0];
  expect(result2.hash).toBe(result.hash);
  expect(result2.txHash).toBe(result.txHash);
  expect(result2.block).toBe(result.block);
  expect(result2.status).toBe('already_stamped_by_this_TSA');

  expect(await stamper.getObjectCount(hash)).toBe(1);
}, TIMEOUT);

test('stamp twice the same object - check false', async() => {
  const hash = mock.randomHex();

  const initCount = await stamper.getStamperCount(stamper.defaultAccount);

  const result = (await stamper.stamp(hash))[0];
  expect(result.status).toBe('stamped');

  const result2 = (await stamper.stamp([hash], false))[0];
  expect(result2.hash).toBe(result.hash);
  expect(result2.txHash).not.toBe(result.txHash);
  expect(result2.block).not.toBe(result.block);
  expect(result2.status).toBe('stamped');

  expect(await stamper.getObjectCount(hash)).toBe(2);

  const finalCount = await stamper.getStamperCount(stamper.defaultAccount);
  expect(finalCount).toBe(initCount + 2);

  const stampListPos1 = await stamper.getObjectPos(hash, 0);
  expect(stampListPos1).toBeGreaterThan(0);
  const stampListPos2 = await stamper.getObjectPos(hash, 1);
  expect(stampListPos2).toBeGreaterThan(stampListPos1);

  const stamp1 = await stamper.getStamplistPos(stampListPos1);
  const stamp2 = await stamper.getStamplistPos(stampListPos2);

  expect(stamp1['0']).toBe(hash);
  expect(stamp2['0']).toBe(hash);

  expect(stamp1['1']).toBe(stamper.defaultAccount);
  expect(stamp2['1']).toBe(stamper.defaultAccount);

  expect(parseInt(stamp2['2'], 10)).toBeGreaterThan(parseInt(stamp1['2'], 10), 'second stamp block >= first stamp block');
}, TIMEOUT);

test('verify an unstamped object', async() => {
  console.log('running >> verify an unstamped object ...');

  const result = await stamper.verify(mock.randomHex());

  expect(result.stamped).toBeFalsy();
}, TIMEOUT);

test('wait1block', async() => {
  const web3h = require('./web3Helper.js');
  const ctx = await web3h.setup();

  const blocknumber1 = await web3h.wait1Block(ctx);
  const blocknumber2 = await web3h.wait1Block(ctx);

  expect(blocknumber1).toBeGreaterThan(1);
  expect(blocknumber2).toBeGreaterThan(blocknumber1);
}, TIMEOUT);
