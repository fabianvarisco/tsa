'use strict';

const dao = require('../../db/src/stampRequestDAO.js');
const mock = require('../../common/src/mock.js');
const TEST_SIZE = process.env.TEST_SIZE ? parseInt(process.env.TEST_SIZE, 10) : 55;

var job;

beforeAll(() => {
  process.env.JOB_MAIN = false;
  job = require('./job.js');
});

async function insertMockRequests(count) {
  const rowsToInsert = mock.randomHexArray(count).map((x, i) => ({ object_hash: x, force_single: i % 2 }));
  await dao.insertRequests(rowsToInsert);
  return rowsToInsert;
}

async function getStatus() {
  const pool = await dao.initPool();
  const status = await dao.getRequestStatus();
  await pool.close();
  return status;
}

test('run twice', async() => {
  var pool = await dao.initPool();
  const status1 = await dao.getRequestStatus();
  var rows = [];
  if (status1.pending > 0) rows = await dao.selectPending();
  if (status1.pending < TEST_SIZE) {
    const newRows = await insertMockRequests(TEST_SIZE - status1.pending);
    for (var row of newRows) rows.push(row);
  }
  console.log(`Processing ${rows.length} pending...`);
  expect(rows.length).toBeGreaterThan(0);

  await pool.close();

  await job.run();

  const status2 = await getStatus();
  expect(status2.pending).toBe(0);

  pool = await dao.initPool();
  await dao.cleanRequests(rows.map(x => x.object_hash));
  await pool.close();

  const status3 = await getStatus();
  expect(status3.total).toBe(status2.total);
  expect(status3.pending).toBeGreaterThanOrEqual(TEST_SIZE);

  await job.run();

  const status4 = await getStatus();
  expect(status4.pending).toBe(0);

}, 2000000);
