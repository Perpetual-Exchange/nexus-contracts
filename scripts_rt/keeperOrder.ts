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
import {getWithdrawalCount, getorderKeys} from "../utils/withdrawal";
import {logGasUsage} from "../utils/gas";
// import {ethers} from "ethers";
import {parseLogs} from "../utils/event";
import {getCancellationReason, getErrorString} from "../utils/error";
import {expect} from "chai";
import {getOrderCount, getOrderKeys} from "../utils/order";

const { provider } = ethers;
const { AddressZero, HashZero } = ethers.constants;

async function getOracleParams({
                                 oracleSalt,
                                 minOracleBlockNumbers,
                                 maxOracleBlockNumbers,
                                 oracleTimestamps,
                                 blockHashes,
                                 signerIndexes,
                                 tokens,
                                 tokenOracleTypes,
                                 precisions,
                                 minPrices,
                                 maxPrices,
                                 signers,
                                 realtimeFeedTokens,
                                 realtimeFeedData,
                                 priceFeedTokens,
                               }) {
  const signerInfo = getSignerInfo(signerIndexes);
  const allMinPrices = [];
  const allMaxPrices = [];
  const minPriceIndexes = [];
  const maxPriceIndexes = [];
  const signatures = [];

  for (let i = 0; i < tokens.length; i++) {
    const minOracleBlockNumber = minOracleBlockNumbers[i];
    const maxOracleBlockNumber = maxOracleBlockNumbers[i];
    const oracleTimestamp = oracleTimestamps[i];
    const blockHash = blockHashes[i];
    const token = tokens[i];
    const tokenOracleType = tokenOracleTypes[i];
    const precision = precisions[i];

    const minPrice = minPrices[i];
    const maxPrice = maxPrices[i];

    for (let j = 0; j < signers.length; j++) {
      const signature = await signPrice({
        signer: signers[j],
        salt: oracleSalt,
        minOracleBlockNumber,
        maxOracleBlockNumber,
        oracleTimestamp,
        blockHash,
        token,
        tokenOracleType,
        precision,
        minPrice,
        maxPrice,
      });
      allMinPrices.push(minPrice.toString());
      minPriceIndexes.push(j);
      allMaxPrices.push(maxPrice.toString());
      maxPriceIndexes.push(j);
      signatures.push(signature);
    }
  }

  return {
    signerInfo,
    tokens,
    compactedMinOracleBlockNumbers: getCompactedOracleBlockNumbers(minOracleBlockNumbers),
    compactedMaxOracleBlockNumbers: getCompactedOracleBlockNumbers(maxOracleBlockNumbers),
    compactedOracleTimestamps: getCompactedOracleTimestamps(oracleTimestamps),
    compactedDecimals: getCompactedDecimals(precisions),
    compactedMinPrices: getCompactedPrices(allMinPrices),
    compactedMinPricesIndexes: getCompactedPriceIndexes(minPriceIndexes),
    compactedMaxPrices: getCompactedPrices(allMaxPrices),
    compactedMaxPricesIndexes: getCompactedPriceIndexes(maxPriceIndexes),
    signatures,
    priceFeedTokens,
    realtimeFeedTokens,
    realtimeFeedData,
  };
}

async function getExecuteParams(overrides) {
  const {
    oracleBlocks,
    oracleBlockNumber,
    tokens,
    precisions,
    minPrices,
    maxPrices,
    realtimeFeedTokens,
    realtimeFeedData,
    priceFeedTokens,
    oracleSalt,
    signers,
    signerIndexes,
  } = overrides;

  const block = await provider.getBlock(bigNumberify(oracleBlockNumber).toNumber());
  const tokenOracleTypes =
      overrides.tokenOracleTypes || Array(tokens.length).fill(TOKEN_ORACLE_TYPES.DEFAULT, 0, tokens.length);

  let minOracleBlockNumbers = [];
  let maxOracleBlockNumbers = [];
  let oracleTimestamps = [];
  let blockHashes = [];

  if (oracleBlocks) {
    for (let i = 0; i < oracleBlocks.length; i++) {
      const oracleBlock = oracleBlocks[i];
      minOracleBlockNumbers.push(oracleBlock.number);
      maxOracleBlockNumbers.push(oracleBlock.number);
      oracleTimestamps.push(oracleBlock.timestamp);
      blockHashes.push(oracleBlock.hash);
    }
  } else {
    minOracleBlockNumbers =
        overrides.minOracleBlockNumbers || Array(tokens.length).fill(block.number, 0, tokens.length);

    maxOracleBlockNumbers =
        overrides.maxOracleBlockNumbers || Array(tokens.length).fill(block.number, 0, tokens.length);

    oracleTimestamps = overrides.oracleTimestamps || Array(tokens.length).fill(block.timestamp, 0, tokens.length);

    blockHashes = Array(tokens.length).fill(block.hash, 0, tokens.length);
  }
  const args = {
    oracleSalt,
    minOracleBlockNumbers,
    maxOracleBlockNumbers,
    oracleTimestamps,
    blockHashes,
    signerIndexes,
    tokens,
    tokenOracleTypes,
    precisions,
    minPrices,
    maxPrices,
    signers,
    realtimeFeedTokens,
    realtimeFeedData,
    priceFeedTokens,
  };
  return await getOracleParams(args);

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
  const orderHandler = await hre.ethers.getContract("OrderHandler");
  const btcToken = "0xfA600253bB6fE44CEAb0538000a8448807e50c85";
  const ethToken = "0x5eD4813824E5e2bAF9BBC211121b21aB38E02522";
  const usdtToken = "0x9D973BAc12BB62A55be0F9f7Ad201eEA4f9B8428";
  const btcPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0xB921aEe0abD048E2FDd1E15aB2ddFBE589884522");
  const ethPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0x8f1ba66d30a1f01bd766eB3Bab0E8AfBeE164252");

  const oracle = await hre.ethers.getContract("Oracle");
  console.log("oracle:", await oracle.address);

  let oldKey;
  let exeCount = 0;
  let timeCount = 0;
  const retryCount = 3;
  var failedOrders = new Map();
  while(true) {
    if (timeCount % 60 == 0) {
      console.log("keeperOrder time escaped: %s mins, executed: %s", timeCount / 60, exeCount);
    }
    timeCount ++;

    let orderCount = await getOrderCount(dataStore);
    if (orderCount == 0) {
      continue;
    }
    console.log("orderCount count:", orderCount.toString());
    const orderKeys = await getOrderKeys(dataStore, 0, 100);
    // let order;
    // for (let i = 0; i < orderKeys.length; i++) {
    //   const orderKey = orderKeys[i];
    //   console.log("\n-------------------------------------------------%s\norder key:", i, orderKey);
    //   order = await reader.getOrder(dataStore.address, orderKeys[i]);
    //   console.log("orderType:", order.numbers.orderType, "market:", order.addresses.market);
    //   // if (order.addresses.market === AddressZero) {
    //   //   console.log("address zero");
    //   // }
    //   console.log(order);
    // }
    // return
    for (let i = 0; i < orderKeys.length; i ++) {
      const orderKey = orderKeys[i];
      let failedCount = 0;
      if (failedOrders.has(orderKey)) {
        failedCount = failedOrders.get(orderKey);
        if (failedCount >= retryCount) {
          console.log("stop order key:", orderKey);
          continue;
        }
      }

      let order;
      try {
        order = await reader.getOrder(dataStore.address, orderKey);
      } catch (e) {
        failedOrders.set(orderKey, ++failedCount);
        continue
      }
      if (order == undefined || orderKey == oldKey) {
        failedOrders.set(orderKey, ++failedCount);
        continue;
      }
      oldKey = orderKey;

      console.log("orderType:", order.numbers.orderType, "order key:", orderKey);
      // console.log("order:", order);

      // console.log("orderBlock:", orderBlock.toString());
      const market = await reader.getMarket(dataStore.address, order.addresses.market);

      let btcPrice = await btcPriceFeed.latestAnswer();
      console.log("btc price:", btcPrice.toString());
      let ethPrice = await ethPriceFeed.latestAnswer()
      console.log("eth price:", ethPrice.toString());
      const tokenSymbol = addressToSymbol[market.longToken];
      const longTokenPrice = tokenSymbol == "BTC"? btcPrice : ethPrice;

      const orderBlock = await order.numbers.updatedAtBlock;
      let oracleBlockNumber = orderBlock;
      oracleBlockNumber = bigNumberify(oracleBlockNumber);
      let block = await provider.getBlock();
      let baseRealtimeData = getBaseRealtimeData(block);

      const tokens = [btcToken, ethToken, usdtToken];
      const precisions = [4, 4, 16];
      const minPrices = [btcPrice, ethPrice, expandDecimals(1, 8)];
      const maxPrices = [btcPrice, ethPrice, expandDecimals(1, 8)];
      const oracleSalt = hashData(["uint256", "string"], [57000, "xget-oracle-v1"]);

      const params = {
        oracleBlockNumber,
        tokens: [],
        precisions: [],
        minPrices,
        maxPrices,
        oracleBlocks: [],
        minOracleBlockNumbers: [],
        maxOracleBlockNumbers: [],
        oracleTimestamps: [],
        blockHashes: [],
        realtimeFeedTokens:[btcToken, ethToken, usdtToken],
        realtimeFeedData:[
          encodeRealtimeData({
            ...baseRealtimeData,
            feedId: realtimeFeedId(btcToken),
            median: btcPrice,
            bid: btcPrice,
            ask: btcPrice,
            blocknumberLowerBound: orderBlock,
          }),
          encodeRealtimeData({
            ...baseRealtimeData,
            feedId: realtimeFeedId(ethToken),
            median: ethPrice,
            bid: ethPrice,
            ask: ethPrice,
            blocknumberLowerBound: orderBlock,
          }),
          encodeRealtimeData({
            ...baseRealtimeData,
            feedId: realtimeFeedId(usdtToken),
            median: expandDecimals(1, 8),
            bid: expandDecimals(1, 8),
            ask: expandDecimals(1, 8),
            blocknumberLowerBound: orderBlock,
          })
        ],
        priceFeedTokens: [],
        oracleSalt,
        signers: [],
        signerIndexes: [],
      };

      // console.log(params);
      // console.log("\n----------------------------------------------------------------\n");
      // console.log(await getExecuteParams(params));
      // return

      try {
        // await orderHandler.cancelOrder(orderKey);
        // getExecuteParams(params)
        await orderHandler.executeOrder(orderKey, await getExecuteParams(params), {gasLimit:"3000000"});

        // await orderHandler.executeOrder(orderKey, {signerInfo: 0,
        //   tokens:[],
        //   compactedMinOracleBlockNumbers:[],
        //   compactedMaxOracleBlockNumbers:[],
        //   compactedOracleTimestamps:[],
        //   compactedDecimals:[],
        //   compactedMinPrices:[],
        //   compactedMinPricesIndexes:[],
        //   compactedMaxPrices:[],
        //   compactedMaxPricesIndexes:[],
        //   signatures:[],
        //   priceFeedTokens:[],
        //   realtimeFeedTokens:[market.longToken, market.shortToken],
        //   realtimeFeedData:[
        //     encodeRealtimeData({
        //       ...baseRealtimeData,
        //       feedId: realtimeFeedId(market.longToken),
        //       median: longTokenPrice,
        //       bid: longTokenPrice,
        //       ask: longTokenPrice,
        //       blocknumberLowerBound: orderBlock,
        //     }),
        //     encodeRealtimeData({
        //       ...baseRealtimeData,
        //       feedId: realtimeFeedId(market.shortToken),
        //       median: expandDecimals(1, 8),
        //       bid: expandDecimals(1, 8),
        //       ask: expandDecimals(1, 8),
        //       blocknumberLowerBound: orderBlock,
        //     })
        //   ]}, {gasLimit:"3000000"});
        exeCount ++;
        failedOrders.set(orderKey, ++failedCount);
        console.log("order executed:", orderKey);
      } catch (e) {
        failedOrders.set(orderKey, ++failedCount);
        console.log(e.toString());
      }
    }

    setTimeout(() => {
      console.log("this is the first message");
    }, 5000);
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
