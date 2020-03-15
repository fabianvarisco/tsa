'use strict';

// https://medium.com/coinmonks/compiling-and-deploying-ethereum-smart-contracts-with-pure-javascript-4bee3bfe99bb

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

function loadSolc(version) {
  const LoadSolcPath = path.resolve('..', 'contracts', 'solc.'+version, 'index.js');
  return require(LoadSolcPath).solc();
}

const SOLCS = [
  { regExp: /^pragma solidity \^?0.5.2;/m, solc: loadSolc('0.5.2') },
  { regExp: /^pragma solidity \^?0.6.4;/m, solc: loadSolc('0.6.4') },
]

console.log('process.env.CONTRACTS_BUILD_PATH', process.env.CONTRACTS_BUILD_PATH);
console.log('process.env.CONTRACTS_SRC_PATH', process.env.CONTRACTS_SRC_PATH);

const buildPath = process.env.CONTRACTS_BUILD_PATH;
const scrPath = process.env.CONTRACTS_SRC_PATH;

async function buildSources() {
  const sources = [];
  const files = fs.readdirSync(scrPath);
  assert(files[0], 'sources not found');

  files.forEach(file => {
    const fullPath = path.resolve(scrPath, file);
    sources.push({name:file, content:fs.readFileSync(fullPath, 'utf8')});

//    source[file] = {
//      content: fs.readFileSync(fullPath, 'utf8'),
//    };
  });

  return sources;
}

async function compileOne(source) {
  const name = source.name;
  const content = source.content;
  console.log(`\nprocessing contract ${name}`);

  const sources = {};
  sources[name] = { content: content };

  const input = {
    language: 'Solidity',
    sources: sources,
    settings: {
      outputSelection: {
        '*': {
          '*': [ 'abi', 'evm.bytecode' ],
        },
      },
    },
  };

  var solc;
  for (var s of SOLCS) {    
    if (content.match(s.regExp)) {
      solc = s.solc;
      break;
    }
  }
  assert(solc, `solc version not found for source ${name}`);
  console.log('solc:', solc.semver());

  const result = JSON.parse(solc.compile(JSON.stringify(input)));

  if (result.errors) {
    console.error('solc errors:');
    console.error(result.errors);
    return;
  }
  
  console.log(result.contracts[name]);
  const contract = Object.values(result.contracts[name])[0];
  assert(contract);
  assert(contract.abi);

  const fullPath = path.resolve(buildPath, `${name}.compiled.json`);
  const abiPath = path.resolve(buildPath, `${name}.abi.json`);
  console.log('writing', fullPath, '...');
  fs.outputJsonSync(fullPath, contract, { spaces: 2 });
  console.log('writing', abiPath, '...');
  fs.outputJsonSync(abiPath, contract.abi, { spaces: 2 });
  console.log('compiling OK !!!');
}

async function run() {
  const sources = await buildSources();

  for (var s of sources) await compileOne(s);
}

run();
