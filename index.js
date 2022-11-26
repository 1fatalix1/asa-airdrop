'use strict'
const algosdk = require("algosdk");
const conf = require("./config.js");
let fs = require('fs');
require('dotenv').config();
const schedule = require('node-schedule');

let airdropAccountMnemonic = null;
let airdropAccount = null;
let airdropAsset = null;
let algodClient = null;
let algoIndexer = null;
let assetsJsonData = null;

// Uncomment if you want to log output to text file instead of console
// let util = require('util');
// let logFile = fs.createWriteStream('log.txt', { flags: 'a' });
// // Or 'w' to truncate the file every time the process starts.
// var logStdout = process.stdout;

// console.log = function () {
//   // Storing without color codes
//   logFile.write(util.format.apply(null, arguments).replace(/\033\[[0-9;]*m/g, "") + '\n');
//   // Display normally, with colors to Stdout
//   logStdout.write(util.format.apply(null, arguments) + '\n');
// }

var serialize = function (object) {
  return JSON.stringify(object, null, 2)
}

async function createTransferTransaction(from, to, assetIndex, amount) {
  const suggestedParams = await algodClient.getTransactionParams().do();
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: from,
    suggestedParams: suggestedParams,
    to: to,
    amount: amount,
    assetIndex: assetIndex,
  });

  return txn;
}

function setAlgodClient(network) {
  if (network === 'testnet') {
    algodClient = new algosdk.Algodv2(
      conf.NODE_TOKEN_TESTNET,
      conf.NODE_ENDPOINT_TESTNET,
      conf.NODE_PORT_TESTNET
    );
  }
  if (network === 'mainnet') {
    algodClient = new algosdk.Algodv2(
      conf.NODE_TOKEN_MAINNET,
      conf.NODE_ENDPOINT_MAINNET,
      conf.NODE_PORT_MAINNET
    );
  }
}

function setAlgoIndexer(network) {
  if (network === 'testnet') {
    algoIndexer = new algosdk.Indexer(
      conf.INDEXER_TOKEN_TESTNET,
      conf.INDEXER_ENDPOINT_TESTNET,
      conf.INDEXER_PORT_TESTNET
    );
  }
  if (network === 'mainnet') {
    algoIndexer = new algosdk.Indexer(
      conf.INDEXER_TOKEN_MAINNET,
      conf.INDEXER_ENDPOINT_MAINNET,
      conf.INDEXER_PORT_MAINNET
    );
  }
}

function setAirdropAddress(network) {
  if (network === 'testnet') {
    airdropAccountMnemonic = algosdk.mnemonicToSecretKey(
      process.env.AIRDROP_MNEMONIC_TESTNET
    );
    airdropAccount = process.env.AIRDROP_ACCOUNT_TESTNET;
    airdropAsset = parseInt(process.env.AIRDROP_ASSET_TESTNET)
  }
  if (network === 'mainnet') {
    airdropAccountMnemonic = algosdk.mnemonicToSecretKey(
      process.env.AIRDROP_MNEMONIC_MAINNET
    );
    airdropAccount = process.env.AIRDROP_ACCOUNT_MAINNET;
    airdropAsset = parseInt(process.env.AIRDROP_ASSET_MAINNET)
  }
}

function getAssets(network) {
  if (network === 'testnet') {
    assetsJsonData = require('./assets-testnet.json');
  }
  if (network === 'mainnet') {
    assetsJsonData = require('./assets-mainnet.json');
  }
}

// Handler
exports.handler = async function (network, dryRun) {
  try {
    setAlgodClient(network);
    setAirdropAddress(network);
    setAlgoIndexer(network);
    getAssets(network);

    let holders = [];
    for (let asset of assetsJsonData) {
      let balances = [];
      let lookupAssetBalancesRes = await algoIndexer.lookupAssetBalances(asset.index).currencyGreaterThan(0).includeAll(false).do();
      balances = balances.concat(lookupAssetBalancesRes.balances);
      let nextToken = lookupAssetBalancesRes['next-token'];
      while (nextToken !== undefined) {
        let lookupAssetBalancesNextRes = await algoIndexer.lookupAssetBalances(asset.index).currencyGreaterThan(0).nextToken(nextToken).do();
        balances = balances.concat(lookupAssetBalancesNextRes.balances);
        nextToken = lookupAssetBalancesNextRes['next-token'];
      }
      balances = balances.filter(x => x.amount > 0);
      for (let balance of balances) {
        if (holders.find(x => x.address === balance.address) === undefined) {
          holders.push({ address: balance.address, amount: asset.airdropamt });
        } else {
          holders.find(x => x.address === balance.address).amount += asset.airdropamt;
        }
      }
    }
    console.log(`## distributing ${holders.reduce((partialSum, a) => partialSum + a.amount, 0)} asset to ${holders.length} holders.`)
    console.log(`## holders: ${serialize(holders)}`)
    for (let holder of holders) {
      if (!dryRun) {
        let createTransferTransactionTx = await createTransferTransaction(airdropAccount, holder.address, airdropAsset, holder.amount * process.env.AIRDROP_ASSET_MULTIPLIER);
        let createTransferTransactionTxSigned = createTransferTransactionTx.signTxn(airdropAccountMnemonic.sk);
        try {
          console.log(`## sending transaction to: ${holder.address}, amount: ${holder.amount}`)
          let tx = await algodClient.sendRawTransaction(createTransferTransactionTxSigned).do();
          // Wait for transaction to be confirmed
          let confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 6);
          console.log('## transaction success: ' + confirmedTxn['confirmed-round']);
        } catch (err) {
          console.log('## transaction error: ' + err);
        }
      }
    }
    return true;
  } catch (err) {
    console.log('## ERROR: ' + err);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// use rule
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [1];// monday
rule.hour = 17;
rule.minute = 0;

// use cron expression
const cron = '*/30 * * * * *'// every 30 seconds

var start = async function (network, dryRun, scheduleType) {
  let job = schedule.scheduleJob(scheduleType, async function () {
    let nextJob = job.nextInvocation();
    await exports.handler(network, dryRun);
    console.log(`Next invocation: ${nextJob}`);
  });

  console.log(`Next invocation: ${job.nextInvocation()}`);
  while (true) {
    await sleep(1000)
  }
}

// available params
// network: 'mainnet' or 'testnet'
// dryRun: true or false
// scheduleType: rule or cron
start('testnet', true, rule);