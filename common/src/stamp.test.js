'use strict';

require('dotenv').config();
const w3h = require('./web3Helper.js');
const ch = require('./contractHelper.js');
const Stamper = require('./Stamper.js');
const tvh = require('./treeVerifyHelper.js');
const hh = require('./hashHelper.js');
const benchmark = require('./stamp.benchmark.js');
const mock = require('./mock.js');
const dao = require('../../db/src/stampRequestDAO.js');

const privateKey = process.env.ACCOUNT_PKEY;
var dbPool;

async function makeStamper() {
  const w3hs = await w3h.setup();
  const contract = await ch.setup(w3hs);
  return new Stamper(w3hs, contract);
}

beforeAll(() => {
  dao.initPool().then(x => { dbPool = x; });
});

test.only('stamp twice the same object', async() => {
  const hashes = mock.randomHexArray(1);

  process.env.ACCOUNT_PKEY = privateKey;
  const stamper = await makeStamper();

  const result = (await stamper.stamp(hashes))[0];
  expect(result.status).toBe('stamped');
  console.log(result);

  const result2 = (await stamper.stamp(hashes))[0];
  console.log(result2);

  expect(result2.status).toBe('already_stamped_by_this_TSA');
  expect(result2.hash).toBe(result.hash);
  expect(result2.txHash).toBe(result.txHash);
  expect(result2.block).toBe(result.block);
}, 20000000);

test('verify without a private key', async() => {
  const hashes = mock.randomHexArray(1);

  process.env.ACCOUNT_PKEY = privateKey;
  var stamper = await makeStamper();

  const result = (await stamper.stamp(hashes))[0];
  expect(result.status).toBe('stamped');

  process.env.ACCOUNT_PKEY = '';
  stamper = await makeStamper();

  const result2 = await stamper.verify(hashes[0]);
  expect(result2.stamps[0].blocknumber).toBe(result.block);
  expect(result2.stamps[0].whostamped).toBe(stamper.from);
}, 10000);

test('verify an unstamped object', async() => {
  process.env.ACCOUNT_PKEY = privateKey;
  const stamper = await makeStamper();

  const result = await stamper.verify(mock.randomHexArray(1));

  expect(result.stamped).toBeFalsy();
}, 10000);

test('wait1block', async() => {
  process.env.ACCOUNT_PKEY = privateKey;
  const web3 = (await w3h.setup()).web3;

  const blocknumber1 = await w3h.wait1block(web3);
  const blocknumber2 = await w3h.wait1block(web3);

  expect(blocknumber1).toBeGreaterThan(1);
  expect(blocknumber2).toBeGreaterThan(blocknumber1);
}, 10000);

test('stamp a tree and verify all leaves', async() => {
  const TREE_LEAVES_COUNT = 10;
  const leaves = mock.randomHexArray(TREE_LEAVES_COUNT);

  process.env.ACCOUNT_PKEY = privateKey;
  const stamper = await makeStamper();

  const tree = (await mock.stampTree(dao, stamper, leaves)).tree;

  // merkletreejs proof verification
  const treeResult = [];
  for (var leave of leaves) treeResult.push(await tvh.verify(stamper, leave));

  console.log('verifying results ...');
  var oks = 0;
  const resultTable = [];
  for (var x of treeResult) {
    var t = x.stamps[0].tree;
    resultTable.push({leave: t.leave, proofSize: t.proof.length, stamped: x.stamped});
    if (x.stamped) oks++;
  };

  console.table(resultTable.sort((a, b) => a.leave > b.leave ? 1 : -1));

  expect(oks).toBe(TREE_LEAVES_COUNT);

  // local proof verification
  var hash;
  treeResult.forEach(function(x) {
    const t = x.stamps[0].tree;
    hash = hh.hexToBuffer(t.leave);
    for (var item of t.proof) {
      const pairs = [];
      const data = hh.hexToBuffer(item);
      if (Buffer.compare(hash, data) === -1) {
        pairs.push(hash, data);
      } else {
        pairs.push(data, hash);
      }
      hash = hh.digester(Buffer.concat(pairs));
    }
    hash = hh.bufferToHex(hash);

    expect(tree.getHexRoot()).toBe(hash);
  });

}, 200000);

test('benchmark', async() => {
  await benchmark.run(dbPool, [10, 30], 5, 5);
}, 200000);
