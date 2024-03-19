import hre from "hardhat";
import * as keys from "../utils/keys";
import {hashData, hashString} from "../utils/hash";
import {getDepositCount, getDepositKeys} from "../utils/deposit";
import {createAuthenticationAdapter} from "@rainbow-me/rainbowkit";
import {encodeRealtimeData, getOracleParams, getOracleParamsForSimulation, TOKEN_ORACLE_TYPES} from "../utils/oracle";
import {bigNumberify, expandDecimals} from "../utils/math";
import {realtimeFeedId} from "../utils/keys";
import {sleep} from "react-query/types/core/utils";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {contractAt} from "../utils/deploy";
import {getWithdrawalCount, getWithdrawalKeys} from "../utils/withdrawal";
import {logGasUsage} from "../utils/gas";
// import {ethers} from "ethers";
import {parseLogs} from "../utils/event";
import {getCancellationReason, getErrorString} from "../utils/error";
import {expect} from "chai";

const { provider } = ethers;

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

async function executeWithOracleParams(overrides) {
  const {
    key,
    oracleBlocks,
    oracleBlockNumber,
    tokens,
    precisions,
    minPrices,
    maxPrices,
    execute,
    gasUsageLabel,
    realtimeFeedTokens,
    realtimeFeedData,
    priceFeedTokens,
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
    oracleSalt: hashData(["uint256", "string"], [57000, "xget-oracle-v1"]),
    minOracleBlockNumbers,
    maxOracleBlockNumbers,
    oracleTimestamps,
    blockHashes,
    signerIndexes: [],
    tokens,
    tokenOracleTypes,
    precisions,
    minPrices,
    maxPrices,
    signers: [],
    realtimeFeedTokens,
    realtimeFeedData,
    priceFeedTokens,
  };

  let oracleParams;
  if (overrides.simulate) {
    oracleParams = await getOracleParamsForSimulation(args);
  } else {
    oracleParams = await getOracleParams(args);
  }

  return await logGasUsage({
    tx: execute(key, oracleParams, {gasLimit: "3000000"}),
    label: gasUsageLabel,
  });
}
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
  const withdrawalHandler = await hre.ethers.getContract("WithdrawalHandler");
  const btcPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0xB921aEe0abD048E2FDd1E15aB2ddFBE589884522");
  const ethPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0x8f1ba66d30a1f01bd766eB3Bab0E8AfBeE164252");

  let oldKey;
  let exeCount = 0;
  let timeCount = 0;
  while(true) {
    if (timeCount % 60 == 0) {
      console.log("keeperWithdrawal time escaped: %s mins, executed: %s", timeCount / 60, exeCount);
    }
    timeCount ++;

    let withdrawalCount = await getWithdrawalCount(dataStore);
    // console.log("withdrawal count:", withdrawalCount.toString());
    if (withdrawalCount == 0) {
      continue;
    }
    const withdrawalKeys = await getWithdrawalKeys(dataStore, 0, 1);
    const withdrawalKey = withdrawalKeys[0];
    let withdrawal;
    try {
      withdrawal = await reader.getWithdrawal(dataStore.address, withdrawalKey);
    } catch (e) {
      continue;
    }
    if (withdrawal == undefined || withdrawalKey == oldKey) {
      continue;
    }
    oldKey = withdrawalKey;

    console.log("withdrawal key:", withdrawalKey);
    // console.log("withdrawal:", withdrawal);
    const withdrawalBlock = await withdrawal.numbers.updatedAtBlock;
    // console.log("withdrawalBlock:", withdrawalBlock.toString());
    const market = await reader.getMarket(dataStore.address, withdrawal.addresses.market);
    // console.log("market:", market);

    let btcPrice = await btcPriceFeed.latestAnswer()
    console.log("btc price:", btcPrice.toString());
    let ethPrice = await ethPriceFeed.latestAnswer()
    console.log("eth price:", ethPrice.toString());
    const tokenSymbol = addressToSymbol[market.longToken];
    const longTokenPrice = tokenSymbol == "BTC"? btcPrice : ethPrice;
    let block = await provider.getBlock();
    let baseRealtimeData = getBaseRealtimeData(block);
    // let longTokenMaxPrice;
    // let longTokenMinPrice;
    // if (tokenSymbol == "BTC") {
    //   longTokenMaxPrice = await btcPriceFeed.getPrice(market.longToken, true, true, false);
    //   longTokenMinPrice = await btcPriceFeed.getPrice(market.longToken, false, true, false);
    // } else if (tokenSymbol == "ETH") {
    //   longTokenMaxPrice = await ethPriceFeed.getPrice(market.longToken, true, true, false);
    //   longTokenMinPrice = await ethPriceFeed.getPrice(market.longToken, false, true, false);
    // }
    // console.log("longToken: %s maxPrice: %s minPrice: %s", tokenSymbol, longTokenMaxPrice, longTokenMinPrice);

    const oracleParams = {signerInfo: 0,
      tokens:[],compactedMinOracleBlockNumbers:[],compactedMaxOracleBlockNumbers:[],compactedOracleTimestamps:[],compactedDecimals:[],compactedMinPrices:[],compactedMinPricesIndexes:[],compactedMaxPrices: [], compactedMaxPricesIndexes: [], signatures: [], priceFeedTokens: [],
      realtimeFeedTokens:[market.longToken, market.shortToken],
      realtimeFeedData:[
        encodeRealtimeData({
          ...baseRealtimeData,
          feedId: realtimeFeedId(market.longToken),
          median: longTokenPrice,
          bid: longTokenPrice,
          ask: longTokenPrice,
          blocknumberLowerBound: withdrawalBlock,
        }),
        encodeRealtimeData({
          ...baseRealtimeData,
          feedId: realtimeFeedId(market.shortToken),
          median: expandDecimals(1, 8),
          bid: expandDecimals(1, 8),
          ask: expandDecimals(1, 8),
          blocknumberLowerBound: withdrawalBlock,
        })
      ]};
    console.log(oracleParams);
    try {
      await withdrawalHandler.executeWithdrawal(withdrawalKey, oracleParams, {gasLimit:"3000000"});
      exeCount ++;
      console.log("withdrawal executed:", withdrawalKey);
      break;
    } catch (e) {
    }

    // // const { reader, dataStore, withdrawalHandler, wnt, usdc } = fixture.contracts;
    // // const { gasUsageLabel } = overrides;
    // // const tokens = overrides.tokens || [wnt.address, usdc.address];
    // // const realtimeFeedTokens = overrides.realtimeFeedTokens || [];
    // // const realtimeFeedData = overrides.realtimeFeedData || [];
    // // const priceFeedTokens = overrides.priceFeedTokens || [];
    // // const precisions = overrides.precisions || [8, 18];
    // // const minPrices = overrides.minPrices || [expandDecimals(5000, 4), expandDecimals(1, 6)];
    // // const maxPrices = overrides.maxPrices || [expandDecimals(5000, 4), expandDecimals(1, 6)];
    // // const withdrawalKeys = await getWithdrawalKeys(dataStore, 0, 1);
    // // const withdrawal = await reader.getWithdrawal(dataStore.address, withdrawalKeys[0]);
    // //
    // const params = {
    //   key: withdrawalKey,
    //   oracleBlockNumber: withdrawal.numbers.updatedAtBlock,
    //   tokens: [market.longToken, market.shortToken],
    //   precisions: [4, 16],
    //   minPrices:[longTokenPrice, expandDecimals(1, 8)],
    //   maxPrices:[longTokenPrice, expandDecimals(1, 8)],
    //   execute: withdrawalHandler.executeWithdrawal,
    //   realtimeFeedTokens: [market.longToken, market.shortToken],
    //   realtimeFeedData: [
    //   encodeRealtimeData({
    //     ...baseRealtimeData,
    //     feedId: realtimeFeedId(market.longToken),
    //     median: longTokenPrice,
    //     bid: longTokenPrice,
    //     ask: longTokenPrice,
    //     blocknumberLowerBound: withdrawalBlock,
    //   }),
    //   encodeRealtimeData({
    //     ...baseRealtimeData,
    //     feedId: realtimeFeedId(market.shortToken),
    //     median: expandDecimals(1, 8),
    //     bid: expandDecimals(1, 8),
    //     ask: expandDecimals(1, 8),
    //     blocknumberLowerBound: withdrawalBlock,
    //   })
    // ],
    //   priceFeedTokens: [],
    // };
    //
    // const txReceipt = await executeWithOracleParams(params);
    // const logs = parseLogs(fixture, txReceipt);

    // const cancellationReason = await getCancellationReason({
    //   logs,
    //   eventName: "WithdrawalCancelled",
    // });
    //
    // if (cancellationReason) {
    //   if (overrides.expectedCancellationReason) {
    //     expect(cancellationReason.name).eq(overrides.expectedCancellationReason);
    //   } else {
    //     throw new Error(`Withdrawal was cancelled: ${getErrorString(cancellationReason)}`);
    //   }
    // } else {
    //   if (overrides.expectedCancellationReason) {
    //     throw new Error(
    //         `Withdrawal was not cancelled, expected cancellation with reason: ${overrides.expectedCancellationReason}`
    //     );
    //   }
    // }
    //
    // const result = { txReceipt, logs };
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
