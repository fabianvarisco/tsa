'use strict';

require('dotenv').config();
const ElapsedTime = require('elapsed-time');
const w3h = require('./web3Helper.js');
const hh = require('./hashHelper.js');
const ch = require('./contractHelper.js');
const Stamper = require('./Stamper.js');
const mock = require('./mock.js');
const dao = require('../../db/src/stampRequestDAO.js');
const assert = require('assert').strict;

const SIZES = [1, 10, 100, 1000, 2000];
const TREE_MAX_LEAVES = 100;
const TREE_BATCH_SIZE = 100;

var stamper;

async function stampSingles(sizes, checkOption) {
  const results = [];
  var i = 0;
  for (var size of sizes) {
    console.log(++i);
    const et = ElapsedTime.new().start();
    const result = await stamper.stamp(mock.randomHexArray(size), checkOption);
    const etValue = et.getValue();
    assert(result.every((x) => x.status === 'stamped'));
    const gas = result.find((x) => x.gasUsed > 0).gasUsed;
    results.push({size: size, gas: gas, et: etValue});
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
        stamper.netId, stamper.address, stamper.from,
        [{txHash: stampResult.txHash, block: stampResult.block, hash: x, treeRoot: null}],
      );
    } else { // Tree
      const root = x.getHexRoot();
      const leaves = x.getLeaves().map(y => hh.bufferToHex(y));
      console.log(`updating ${leaves.length} leaves into db ...`);
      const rowsToUpdate = leaves.map(x => ({txHash: stampResult.txHash, block: stampResult.block, hash: x, treeRoot: root}));
      await dao.updateStampResult(stamper.netId, stamper.address, stamper.from, rowsToUpdate);
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

async function run(dbPool, sizes = SIZES, treeMaxLeaves = TREE_MAX_LEAVES, treeBatchSize = TREE_BATCH_SIZE) {
  assert(sizes[0], `arg sizes [${sizes}] must be a non-empty array`);

  if (!dbPool) {
    await dao.initPool();
  }
  const web3setup = await w3h.setup();

  // const options = {
  //   address: "0x7554cf15609FDeb28A6B781BDa3a43Fc2984D53f",
  //   abiPath: "/home/fv/projects/tsa/contracts/build/Stamper.abi.json",
  // };
  const options = {};

  const contract = await ch.setup(web3setup, options);

  stamper = new Stamper(web3setup, contract);

  console.time('et total');
  const results = [];
  const f = (x, y) => ({test: x + ':', result: y});
  // results.push(f('Results with Check=true', await stampSingles(sizes, true)));

  // const sizes2 = [];
  // for (var i=0; i<1000; i++) sizes2.push(1000);
  // results.push(f('Results with Check=false', await stampSingles(sizes2, false)));

  results.push(f('Results with Check=false', await stampSingles(sizes, false)));
  results.push(f('Results with Check=false and Trees', await stampTrees(sizes, treeMaxLeaves, treeBatchSize)));

  console.log('=============');
  console.log('PROVIDER_HOST', process.env.PROVIDER_HOST);
  console.log('CONTRACT_ADDRESS', process.env.CONTRACT_ADDRESS);
  for (var r of results) {
    console.log(r.test);
    console.table(r.result);
  };
  console.timeEnd('et total');
}

module.exports = {
  run: run,
};
