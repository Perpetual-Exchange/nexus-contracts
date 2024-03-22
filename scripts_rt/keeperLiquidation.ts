import hre from "hardhat";
import * as keys from "../utils/keys";
import {hashData, hashString} from "../utils/hash";
import {getDepositCount, getDepositKeys} from "../utils/deposit";
import {createAuthenticationAdapter} from "@rainbow-me/rainbowkit";
import {
  encodeRealtimeData,
  getCompactedDecimals,
  getCompactedOracleBlockNumbers,
  getCompactedOracleTimestamps, getCompactedPriceIndexes,
  getCompactedPrices,
  getOracleParams,
  getOracleParamsForSimulation,
  getSignerInfo,
  signPrice,
  TOKEN_ORACLE_TYPES
} from "../utils/oracle";
import {bigNumberify, expandDecimals} from "../utils/math";
import {realtimeFeedId} from "../utils/keys";
import {sleep} from "react-query/types/core/utils";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {contractAt} from "../utils/deploy";
import {getWithdrawalCount, getpositionKeys} from "../utils/withdrawal";
import {logGasUsage} from "../utils/gas";
// import {ethers} from "ethers";
import {getEventDataFromLog, parseLogs} from "../utils/event";
import {getCancellationReason, getErrorString} from "../utils/error";
import {expect} from "chai";
import {getpositionCount, getpositionKeys} from "../utils/order";
import {getPositionCount, getPositionKeys} from "../utils/position";

const { provider } = ethers;
const { AddressZero, HashZero } = ethers.constants;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getBaseRealtimeData = (block) => {
  return {
    feedId: hashString("feedId"),
    observationsTimestamp: block.timestamp,
    median: expandDecimals(5000, 8),
    bid: expandDecimals(5000, 8),
    ask: expandDecimals(5000, 8),
    blocknumberUpperBound: block.number,
    upperBlockhash: block.hash,
    blocknumberLowerBound: block.number,
    currentBlockTimestamp: block.timestamp,
  };
};

async function main() {
  const {deployer} = await hre.getNamedAccounts()
  console.log("signer:", deployer);

  const orderTypeName: { [orderType: number]: string } = {};
  orderTypeName[0] = "MarketSwap      ";
  orderTypeName[1] = "LimitSwap       ";
  orderTypeName[2] = "MarketIncrease  ";
  orderTypeName[3] = "LimitIncrease   ";
  orderTypeName[4] = "MarketDecrease  ";
  orderTypeName[5] = "LimitDecrease   ";
  orderTypeName[6] = "StopLossDecrease";
  orderTypeName[7] = "Liquidation     ";

  const tokens = await hre.gmx.getTokens();
  const addressToSymbol: { [address: string]: string } = {};
  for (const [tokenSymbol, tokenConfig] of Object.entries(tokens)) {
    let address = tokenConfig.address;
    if (!address) {
      address = (await hre.ethers.getContract(tokenSymbol)).address;
    }
    addressToSymbol[address] = tokenSymbol;
    // console.log(tokenSymbol, address);
  }

  const dataStore = await hre.ethers.getContract("DataStore");
  console.log("dataStore.address:", dataStore.address);
  const reader = await hre.ethers.getContract("Reader");
  const liquidationHandler = await hre.ethers.getContract("LiquidationHandler");
  const btcToken = "0xfA600253bB6fE44CEAb0538000a8448807e50c85";
  const ethToken = "0x5eD4813824E5e2bAF9BBC211121b21aB38E02522";
  const usdtToken = "0x9D973BAc12BB62A55be0F9f7Ad201eEA4f9B8428";
  const btcPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0xB921aEe0abD048E2FDd1E15aB2ddFBE589884522");
  const ethPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0x8f1ba66d30a1f01bd766eB3Bab0E8AfBeE164252");
  const btcMarket = "0x4Bea6421c5C73C047d443bE318C900EB5d2379F1";
  const ethMarket = "0x8fb124125AdAfF6C7DF5b4754bB245c92B6eC66A";
  // const eventEmitter = await hre.ethers.getContract("EventEmitter");

  const oracle = await hre.ethers.getContract("Oracle");
  console.log("oracle:", await oracle.address);

  let exeCount = 0;
  const retryCount = 3;
  var failedOrders = new Map();

  const sec = 1000;
  const min = 60 * sec;
  const hour = 60 * min;
  const day = 24 * hour;
  const step = 1 * min;
  const limitStep = 1 * min;
  const start = new Date();
  let stepCount = 0;
  let limitCount = 0;
  while(true) {
    let oldKey = "";
    let unexeCount = 0;

    const dateNow = new Date();
    let gap = dateNow - start;
    const stepNow = parseInt(gap / step);
    if (stepNow > stepCount) {
      stepCount = stepNow;
      let days = parseInt(gap / day);
      gap = gap - days * day;
      let hours = parseInt(gap / hour);
      gap = gap - hours * hour;
      let mins = parseInt(gap / min);
      console.log("keeperOrder running %s days %s hours %s mins, executed: %s, unexecuted: %s", days, hours, mins, exeCount, unexeCount);
    }

    let limitDisable = true;
    gap = dateNow - start;
    const limitNow = parseInt(gap / limitStep);
    if (limitNow > limitCount) {
      limitCount = limitNow;
      limitDisable = false;
    }

    let positionCount = await getPositionCount(dataStore);
    if (positionCount == 0) {
      await sleep(60000);
      continue;
    }
    console.log("positionCount count:", positionCount.toString());

    unexeCount = 0;
    const positionKeys = await getPositionKeys(dataStore, 0, positionCount);
    // console.log("positionKeys.length:", positionKeys.length);

    for (let i = 0; i < positionKeys.length; i ++) {
      const positionKey = positionKeys[i];

      let position;
      let failedCount = 0;
      try {
        position = await reader.getPosition(dataStore.address, positionKey);
      } catch (e) {
        failedCount ++;
      }
      if (position == undefined) {
        failedCount ++;
      } else if (positionKey == oldKey) {
        continue;
      }

      if (failedCount > 0) {
        if (failedOrders.has(positionKey)) {
          failedCount += failedOrders.get(positionKey);
        }
        failedOrders.set(positionKey, failedCount);
        if (failedCount >= retryCount) {
          // console.log("stop order key:", positionKey);
          unexeCount ++;
        }
        continue;
      }
      oldKey = positionKey;

      console.log("%s/%s", (i+1), positionKeys.length, "key:", positionKey);
      // console.log("position:", position);

      let btcPrice = await btcPriceFeed.latestAnswer();
      let ethPrice = await ethPriceFeed.latestAnswer()
      console.log("btc price: %s, eth price: %s", btcPrice.toString(), ethPrice.toString());

      const positionBlock = position.numbers.increasedAtBlock>position.numbers.decreasedAtBlock?position.numbers.increasedAtBlock:position.numbers.decreasedAtBlock;
      let oracleBlockNumber = positionBlock;
      oracleBlockNumber = bigNumberify(oracleBlockNumber);
      // console.log("positionBlock:", positionBlock.toString());
      let block = await provider.getBlock();
      let baseRealtimeData = getBaseRealtimeData(block);

      const tokens = [btcToken, ethToken, usdtToken];
      const precisions = [4, 4, 16];
      let minPrices = [btcPrice, ethPrice, expandDecimals(1, 8)];
      let maxPrices = [btcPrice, ethPrice, expandDecimals(1, 8)];
      const oracleSalt = hashData(["uint256", "string"], [57000, "xget-oracle-v1"]);

      const oracleParams = {
        signerInfo: 0,
        tokens:[],
        compactedMinOracleBlockNumbers:[],
        compactedMaxOracleBlockNumbers:[],
        compactedOracleTimestamps:[],
        compactedDecimals:[],
        compactedMinPrices:[],
        compactedMinPricesIndexes:[],
        compactedMaxPrices:[],
        compactedMaxPricesIndexes:[],
        signatures:[],
        priceFeedTokens:[],
        realtimeFeedTokens: [btcToken, ethToken, usdtToken],
        realtimeFeedData: [
          encodeRealtimeData({
            ...baseRealtimeData,
            feedId: realtimeFeedId(btcToken),
            median: btcPrice,
            bid: btcPrice,
            ask: btcPrice,
            blocknumberLowerBound: positionBlock,
          }),
          encodeRealtimeData({
            ...baseRealtimeData,
            feedId: realtimeFeedId(ethToken),
            median: ethPrice,
            bid: ethPrice,
            ask: ethPrice,
            blocknumberLowerBound: positionBlock,
          }),
          encodeRealtimeData({
            ...baseRealtimeData,
            feedId: realtimeFeedId(usdtToken),
            median: expandDecimals(1, 8),
            bid: expandDecimals(1, 8),
            ask: expandDecimals(1, 8),
            blocknumberLowerBound: positionBlock,
          })
        ]};

      try {
        // await orderHandler.cancelOrder(positionKey);

        const result = await liquidationHandler.executeLiquidation(
            position.addresses.account,
            position.addresses.market,
            position.addresses.collateralToken,
            position.flags.isLong, oracleParams, {gasLimit:"20000000"});

        // const result = await orderHandler.simulateExecuteOrder(positionKey, await getOracleParamsForSimulation(args), {gasLimit:"3000000"});
        // const txReceipt = await provider.getTransactionReceipt(result.hash);

        // const { logs } = txReceipt;
        // for (let i = 0; i < logs.length; i++) {
        //   try {
        //     const log = logs[i];
        //     const parsedLog = eventEmitter.interface.parseLog(log);
        //     // if the log could not be parsed, an error would have been thrown above
        //     // and the below lines will be skipped
        //     log.parsedEventInfo = {
        //       msgSender: parsedLog.args[0],
        //       eventName: parsedLog.args[1],
        //     };
        //     log.parsedEventData = getEventDataFromLog(parsedLog);
        //   } catch (e) {
        //     // ignore error
        //   }
        // }
        //
        // const cancellationReason = await getCancellationReason({
        //   logs,
        //   eventName: "OrderCancelled",
        // });
        //
        // console.log("************************** Reason\n", cancellationReason);

        exeCount ++;
        // failedOrders.set(positionKey, ++failedCount);
        console.log("position liquidated: %s\n", positionKey);
      } catch (e) {
        // failedOrders.set(positionKey, ++failedCount);
        console.log(e.toString());
      }
    }
    // break;
    await sleep(60000);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
