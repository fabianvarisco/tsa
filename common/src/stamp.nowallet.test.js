'use strict';

require('dotenv').config();
const Stamper = require('./Stamper.js');
const mock = require('./mock.js');
const TIMEOUT = 100000;

test('verify without a private key', async() => {
  const hash = mock.randomHex();

  var stamper = await Stamper.build();
  expect(stamper.walletAccount).toBeTruthy();

  const result = (await stamper.stamp(hash))[0];
  expect(result.status).toBe('stamped');

  process.env.ACCOUNT_PKEY = '';
  process.env.ACCOUNT_ADDRESS = '';
  process.env.GETH_ACCOUNT_JSON = '';
  process.env.GETH_ACCOUNT_PASSWORD = '';
  stamper = await Stamper.build();
  expect(stamper.walletAccount).toBeFalsy();

  const result2 = await stamper.verify(hash);
  expect(result2.stamps[0].blocknumber).toBe(result.block);
  expect(result2.stamps[0].whostamped).toBe(stamper.defaultAccount);
}, TIMEOUT);
