'use strict';

require('dotenv').config();
const benchmark = require('./stamp.benchmark.js');

const TIMEOUT = 200000;

test('benchmark', async() => {
  const sizes = [10, 30];
  const times = 1;
  const treeMaxLeaves = 5;
  const treeBatchSize = 5;

  await benchmark.run(null, sizes, times, treeMaxLeaves, treeBatchSize);
}, TIMEOUT);
