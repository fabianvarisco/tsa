"use strict";

//process.env.ORA_SDTZ = 'GMT+3';

// export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_5

const oracledb = require('oracledb');
const assert = require('assert');

async function initPool() {
  try {
    console.log('Connecting to db ...');
    console.log("> DB_USER",           process.env.DB_USER)
    console.log("> DB_CONNECT_STRING", process.env.DB_CONNECT_STRING)
    const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX) || 1 ;
    console.log("> DB_POOL_MAX",       DB_POOL_MAX)
    const dbPool = await oracledb.createPool({
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                connectString: process.env.DB_CONNECT_STRING,
                poolAlias: 'pool', // set an alias to allow access to the pool via a name.
                poolMax: DB_POOL_MAX, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
    });
    console.log('Connection pool started');
    return dbPool;
  } catch (err) {
    throw err;
  }
}

async function dbTest() {
  let connection;
  try {
      connection = await oracledb.getConnection('pool');
      const sql = "SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD HH24:MI') AS CD FROM DUAL WHERE 1 = :b1";
      console.log("sql", sql);
      const result = await connection.execute(sql, [1]);
      console.log("dbTest - current date", result.rows[0][0]);
  }
  finally { if (connection) await connection.close() }
}

const sqlStatus = "SELECT COUNT(*), "
                + "NVL(SUM(CASE WHEN NVL(TX_HASH, BLOCK_NUMBER) IS NULL THEN 1 ELSE 0 END), 0) AS PENDING, "
                + "NVL(SUM(CASE WHEN NVL(TX_HASH, BLOCK_NUMBER) IS NULL THEN 0 ELSE 1 END), 0) AS STAMPED, "
                + "TO_CHAR(MAX(CREATE_TS), 'YYYY-MM-DD HH24:MI:SS') AS MAX_CREATE_TS "
                + "FROM BFAC.STAMP_REQUEST";

async function getRequestStatus() {
  let connection;
  try {
      connection = await oracledb.getConnection('pool');
      console.log("sql", sqlStatus);
      const result = await connection.execute(sqlStatus);
      console.log("db STAMP_REQUEST status: ");
      console.log("> Total", result.rows[0][0]);
      console.log("> Pending", result.rows[0][1]);
      console.log("> Stamped", result.rows[0][2]);
      console.log("> Max Create TS", result.rows[0][3]);
      assert.strictEqual(result.rows[0][0], result.rows[0][1]+result.rows[0][2],
                       "Total [" + result.rows[0][0] + "] must be Pending [" + result.rows[0][1] + "] plus Stamped ["+ result.rows[0][2] + "]")
      return { total: result.rows[0][0], pending: result.rows[0][1] }
  }
  finally { if (connection) await connection.close() }
}

const sqlSelectPending = "SELECT OBJECT_HASH, FORCE_SINGLE "
                       + "FROM BFAC.STAMP_REQUEST "
                       + "WHERE PENDING=0 AND ROWNUM < 1000"

async function selectPending() {
    let connection;
    try {
        connection = await oracledb.getConnection('pool');
        console.log("sql", sqlSelectPending);
        const result = await connection.execute(sqlSelectPending);
        console.log(`Selected rows ${result.rows.length}`);
        const result2 = []
        for ( var row of result.rows) result2.push({object_hash: row[0], force_single: row[1]})
        return result2;
    }
    catch (err) { console.log(err); throw err }
    finally { if (connection) { await connection.close(); } }
}

const sqlSelectLeavesByLeave = "SELECT OBJECT_HASH, TREE_ROOT "
                             + "FROM BFAC.STAMP_REQUEST "
                             + "WHERE TREE_ROOT = ("
                             + "SELECT TREE_ROOT "
                             + "FROM BFAC.STAMP_REQUEST "
                             + "WHERE OBJECT_HASH = :1)";

async function selectLeavesByLeave(leave) {
    let connection;
    try {
        connection = await oracledb.getConnection('pool');
        // console.log("sql", sqlSelectLeavesByLeave);
        const result = await connection.execute(sqlSelectLeavesByLeave, [leave]);
        console.log(`Selected rows ${result.rows.length}`)
        return result.rows;
    }
    catch (err) { console.log(err); throw err }
    finally { if (connection) { await connection.close(); } }
}

const insert = `INSERT INTO BFAC.STAMP_REQUEST (OBJECT_HASH, FORCE_SINGLE) VALUES (:1, :2)`;

async function insertRequests(rows) {
    // row[0]: hash
    // row[1]: force_single 1 o 0
    var connection;
    var insertedRows = 0;
    try {
        connection = await oracledb.getConnection('pool');
        //console.log("sql", insert)
        for (var row of rows) {
            const hash = row.object_hash.startsWith('0x') ? row.object_hash : '0x' + row.object_hash;
            console.log(`Inserting hash [...${hash.substr(hash.length-6)}] force_single ${row.force_single} ...`);

            try {
                const result = await connection.execute(insert, [ hash, row.force_single], {autoCommit: false});
                assert.strictEqual(result.rowsAffected, 1, "Insert rowsAffected" + result.rowsAffected + " expected 1");
                insertedRows++;
            }
            catch (err) {
                // ORA-00001: unique constraint violated
                const ORA_00001 = 1;
                if (err.errorNum === ORA_00001) console.log(err);
                else throw err;
            }
        }
        console.log("Rows to insert", rows.length);
        console.log("Inserted rows", insertedRows);
        await connection.commit();
        return insertedRows;
    }
    finally { if (connection) await connection.close() }
}

async function cleanRequests(hashes) {
    var connection;
    try {
        connection = await oracledb.getConnection('pool');
        const sql = `UPDATE BFAC.STAMP_REQUEST SET PENDING=0, TX_HASH=null, BLOCK_NUMBER=null, CONTRACT_ADDRESS=null, FROM_ADDRESS=null, NET_ID=null, TREE_ROOT=null WHERE OBJECT_HASH = :1`;
        // console.log("sql", sql)
        for (var hash of hashes) {
            const result = await connection.execute(sql, [hash], {autoCommit: false});
            assert.strictEqual(result.rowsAffected, 1, `Update ${hash} - rowsAffected ${result.rowsAffected} expected 1`)
        }
        console.log("Cleaned rows", hashes.length)
        await connection.commit()
    }
    finally { if (connection) await connection.close() }
}

const sqlUpdate = "UPDATE BFAC.STAMP_REQUEST SET "
                + "NET_ID = :1, "
                + "CONTRACT_ADDRESS = :2, "
                + "FROM_ADDRESS = :3, "
                + "TX_HASH = :4, "
                + "BLOCK_NUMBER = :5, "
                + "TREE_ROOT = :6, "
                + "PENDING = NULL "
                + "WHERE OBJECT_HASH = :7"

async function updateStampResult(netId, contractAddress, fromAddress, stampResults) {
    var connection
    try {
        connection = await oracledb.getConnection('pool');
        // console.log("sql", sqlUpdate);
        for (let item of stampResults) {
            assert(item.txHash || item.block)
            assert(item.hash);
            const binds = [ netId, contractAddress, fromAddress, item.txHash, item.block, item.treeRoot, item.hash ];
            const result = await connection.execute(sqlUpdate, binds, {autoCommit: false} );
            assert.strictEqual(result.rowsAffected, 1, "Update for "+item.hash+" rowsAffected ["+ result.rowsAffected + "] expected [1]")
        }
        console.log("Updated rows", stampResults.length)
        await connection.commit()
    }
    finally { if (connection) await connection.close() }
}

module.exports = {
    initPool: initPool,
    dbTest: dbTest,
    selectLeavesByLeave: selectLeavesByLeave,
    getRequestStatus: getRequestStatus,
    updateStampResult: updateStampResult,
    insertRequests: insertRequests,
    cleanRequests: cleanRequests,
    selectPending: selectPending
}
