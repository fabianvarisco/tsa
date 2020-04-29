'use strict';

require('dotenv').config();

test.only('Digest method not supported', () => {
  process.env.HASH_ALGORITHM = 'pepe';
  const hh = require('./hashHelper.js');

  expect(hh.ALGO).toBe('pepe');

  expect(() => {
    hh.makeTree(['one', 'two', 'three', 'four', 'six', 'seven', 'eigth', 'nine', 'ten']);
  }).toThrowError('Digest method not supported');

}, 1000);
