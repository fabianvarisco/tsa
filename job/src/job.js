'use strict';

require('dotenv').config();
const assert = require('assert');
const Stamper = require('../../common/src/Stamper.js');
const dao = require('../../db/src/stampRequestDAO.js');
const hh = require('../../common/src/hashHelper.js');
const sleep = require('sleep');

const JOB_MAX_TIMES = process.env.JOB_MAX_TIMES ? parseInt(process.env.JOB_MAX_TIMES, 10) : 0;
const JOB_TIME_SLEEP = process.env.JOB_TIME_SLEEP || 2;
const JOB_BATCH_SIZE = process.env.JOB_BATCH_SIZE || 10;
const JOB_TREE_SIZE = (process.env.JOB_TREE_SIZE || 0) < 1 ? 1 : parseInt(process.env.JOB_TREE_SIZE, 10);
const JOB_MAIN = ['Y', 'y', 'T', 'true', 'TRUE', '1'].indexOf(process.env.JOB_MAIN) > 0;

var stamper;

async function processBatch(objects) {
  console.log('Processing batch', objects.length, 'trees or hashes');
  const map = new Map();
  for (var objectToStamp of objects) {
    if (typeof objectToStamp === 'string') {
      console.log('Stamping single hash ...');
      map.set(objectToStamp, null);
    } else {
      console.log(`Stamping treeRoot from ${objectToStamp.getLeaves().length} leaves ...`);
      map.set(objectToStamp.getHexRoot(), objectToStamp);
    }
  }
  const result = await stamper.stamp(Array.from(map.keys()));

  const result2 = [];
  for (var item of result) {
    const tree = map.get(item.hash);
    if (tree) {
      assert.equal(item.hash, tree.getHexRoot());
      for (var leave of tree.getLeaves()) {
        result2.push({
          txHash: item.txHash,
          block: item.block,
          hash: '0x' + leave.toString('hex'),
          treeRoot: item.hash,
        });
      }
    } else {
      item.treeRoot = null;
      result2.push(item);
    }
  }
  await dao.updateStampResult(stamper.netId, stamper.contractAddress, stamper.fromAddress, result2);
}

function makeTree(leaves) {
  // Si tiene una sola hoja no construye un tree
  return (leaves.length === 1) ? leaves[0] : hh.makeTree(leaves);
}

async function processInstance(time) {
  console.log('Running process instance', time);
  const rows = await dao.selectPending();

  if (rows.length === 0) {
    console.log('Nothing to process');
    sleep.sleep(JOB_TIME_SLEEP);
    return;
  }

  var objectsToStamp = [];
  var leaves = [];

  for (let row of rows) {
    const hash = row.object_hash;
    const single = (JOB_TREE_SIZE < 2) || (row.force_single === 1);
    if (single) {
      objectsToStamp.push(hash);
    } else {
      // Tree
      leaves.push(hash);
      if (leaves.length === JOB_TREE_SIZE) {
        objectsToStamp.push(makeTree(leaves));
        leaves = [];
      }
    }
    if (objectsToStamp.length === JOB_BATCH_SIZE) {
      await processBatch(objectsToStamp);
      objectsToStamp = [];
    }
  }
  if (leaves.length > 0) objectsToStamp.push(makeTree(leaves));
  if (objectsToStamp.length > 0) await processBatch(objectsToStamp);
}

async function run() {
  var pool;
  try {
    console.log('Running job ...');
    console.log('> JOB_MAIN', JOB_MAIN);
    console.log('> JOB_MAX_TIMES', JOB_MAX_TIMES);
    console.log('> JOB_BATCH_SIZE', JOB_BATCH_SIZE);
    console.log('> JOB_TREE_SIZE', JOB_TREE_SIZE);
    assert(JOB_BATCH_SIZE > 0, `JOB_BATCH_SIZE ${JOB_BATCH_SIZE} must be > 0(zero)`);
    assert(JOB_TREE_SIZE > 0, `JOB_TREE_SIZE ${JOB_TREE_SIZE} must be > 0(zero)`);

    pool = await dao.initPool();
    await dao.dbTest();
    await dao.getRequestStatus();

    stamper = await Stamper.build();

    var time = 0;
    while (JOB_MAX_TIMES === 0 || time < JOB_MAX_TIMES) await processInstance(++time);

    await dao.getRequestStatus();

  } catch (e) { console.error(e); throw e; } finally { if (pool) await pool.close(); }
}

module.exports = { run: run };

if (JOB_MAIN) run();
