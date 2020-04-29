'use strict';

require('dotenv').config();
const ElapsedTime = require('elapsed-time');
const Stamper = require('./Stamper.js');
const mock = require('./mock.js');
const dao = require('../../db/src/stampRequestDAO.js');
const assert = require('assert').strict;

const SIZES = [1, 10, 30, 100, 1000, 2000];
const TIMES = 1;
// const SIZES = [1000];
// const TIMES = 100;
const SINGLE_CHECK_RUN = true;
const SINGLE_NOCHECK_RUN = true;
const TREE_RUN = true;
const TREE_MAX_LEAVES = 100;
const TREE_BATCH_SIZE = 100;

var stamper;

async function stampSingles(sizes, times, checkOption) {
  const results = [];
  for (var size of sizes) {
    for (var time = 1; time <= times; time++) {
      console.log('> size:', size, ' - time:', time, '...');
      const et = ElapsedTime.new().start();
      const result = await stamper.stamp(mock.randomHexArray(size), checkOption);
      const etValue = et.getValue();
      assert(result.every((x) => x.status === 'stamped'));
      const gasUsed = result.find((x) => x.gasUsed > 0).gasUsed;
      results.push({size: size, gas: gasUsed, et: etValue});
    }
  };
  return results;
}

async function stampTrees3(objectsToStamp) {
  const hashes = objectsToStamp.map(x => (typeof x === 'string' || x instanceof String ? x : x.getHexRoot()));

  const stampResults = await stamper.stamp(hashes, false);
  assert(stampResults.every((x) => x.status === 'stamped'));
  const gasUsed = stampResults.find((x) => x.gasUsed > 0).gasUsed;
  const stampResult = stampResults[0];

  for (var x of objectsToStamp) {
    if (typeof x === 'string' || x instanceof String) {
      await dao.updateStampResult(
        stamper.netId, stamper.contractAddress, stamper.defaultAccount,
        [{txHash: stampResult.txHash, block: stampResult.block, hash: x, treeRoot: null}],
      );
    } else { // Tree
      await mock.dbPostStampTree(dao, stamper, x, stampResult);
    }
  }
  return gasUsed;
}

async function stampTrees2(objects, maxLeaves, batchSize) {
  assert(objects.length > 0);
  assert(maxLeaves > 0);
  assert(batchSize > 0);

  const pending = objects.slice(); // copy array
  var acumGasUsed = 0;
  var trees = 0;
  var objectsToStamp = [];
  const et = ElapsedTime.new().start();
  et.pause();
  while (pending.length > 0) {
    const howMany = (pending.length > maxLeaves) ? maxLeaves : pending.length;
    const leaves = pending.splice(0, howMany);
    assert(leaves[0], 'leaves must by a non-empty array');
    et.resume();
    if (leaves.length === 1) {
      objectsToStamp.push(leaves[0]);
      dao.insertRequests([{object_hash: leaves[0], force_single: 0 }]);
    } else {
      trees++;
      objectsToStamp.push(await mock.prepareTree(dao, leaves));
    }
    if (objectsToStamp.length === batchSize) {
      acumGasUsed += await stampTrees3(objectsToStamp);
      objectsToStamp = [];
    }
    et.pause();
  }
  if (objectsToStamp.length > 0) {
    et.resume();
    acumGasUsed += await stampTrees3(objectsToStamp);
    et.pause();
  }
  return {size: objects.length, batchSize: batchSize, maxLeaves: maxLeaves, trees: trees, gas: acumGasUsed, et: et.getValue()};
}

async function stampTrees(sizes, maxLeaves, batchSize) {
  const results = [];
  for (var i of sizes) results.push(await stampTrees2(mock.randomHexArray(i), maxLeaves, batchSize));
  return results;
}

async function run(dbPool,
  sizes = SIZES,
  times = TIMES,
  treeMaxLeaves = TREE_MAX_LEAVES,
  treeBatchSize = TREE_BATCH_SIZE) {
  assert(sizes[0], `arg sizes [${sizes}] must be a non-empty array`);

  if (!dbPool) {
    await dao.initPool();
  }
  stamper = await Stamper.build();

  const initCount = await stamper.getStamperCount(stamper.defaultAccount);

  console.time('> et total');
  const results = [];
  const f = (x, y) => ({test: x + ':', result: y});
  if (SINGLE_CHECK_RUN) results.push(f('Results with Check=true', await stampSingles(sizes, times, true)));
  if (SINGLE_NOCHECK_RUN) results.push(f('Results with Check=false', await stampSingles(sizes, times, false)));
  if (TREE_RUN) results.push(f('Results with Check=false and Trees', await stampTrees(sizes, treeMaxLeaves, treeBatchSize)));

  console.log('===========================================================');
  console.log(Date());
  console.log('> SIZES', sizes);
  console.log('> TIMES', times);
  if (SINGLE_CHECK_RUN) console.log('> SINGLE_CHECK_RUN', SINGLE_CHECK_RUN);
  if (SINGLE_NOCHECK_RUN) console.log('> SINGLE_NOCHECK_RUN', SINGLE_NOCHECK_RUN);
  if (TREE_RUN) {
    console.log('> TREE_MAX_LEAVES', treeMaxLeaves);
    console.log('> TREE_BATCH_SIZE', treeBatchSize);
  }
  console.log('> povider:', stamper.providerHost);
  console.log('> nodeInfo:', stamper.nodeInfo);
  console.log('> contract:', stamper.contractAddress);
  if (stamper.contract.compiler) console.log('> compiler:', stamper.contract.compiler);
  console.log('> account:', stamper.defaultAccount);
  console.log('>');

  var totalCount = 0;
  var totalGas = 0;
  results.forEach(function(x) {
    console.log(x.test);
    console.table(x.result);
    var parcialCount = 0;
    var parcialGas = 0;
    for (var r of x.result) {
      parcialGas += r.gas;
      parcialCount += (r.trees || r.size);
    }
    console.log('> stamp parcial count:', parcialCount);
    console.log('> stamp parcial gas:', parcialGas);
    console.log('>');
    totalCount += parcialCount;
    totalGas += parcialGas;
  });
  console.log('> stamp total count:', totalCount);
  console.log('> stamp total gas:', totalGas);
  console.timeEnd('> et total');

  const finalCount = await stamper.getStamperCount(stamper.defaultAccount);

  assert.equal(finalCount, initCount + totalCount);
}

module.exports = {
  run: run,
};
