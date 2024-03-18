import hre from "hardhat";
import * as keys from "../utils/keys";
import {hashString} from "../utils/hash";
import {getDepositCount, getDepositKeys} from "../utils/deposit";
import {createAuthenticationAdapter} from "@rainbow-me/rainbowkit";
import {encodeRealtimeData} from "../utils/oracle";
import {expandDecimals} from "../utils/math";
import {realtimeFeedId} from "../utils/keys";
import {sleep} from "react-query/types/core/utils";
import {time} from "@nomicfoundation/hardhat-network-helpers";
import {contractAt} from "../utils/deploy";

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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    console.log(tokenSymbol, address);
  }

  const {AddressZero, HashZero} = ethers.constants;
  const dataStore = await hre.ethers.getContract("DataStore");
  console.log("dataStore.address:", dataStore.address);
  const depositHandler = await hre.ethers.getContract("DepositHandler");
  console.log("depositHandler.oracle:", await depositHandler.oracle());
  const reader = await hre.ethers.getContract("Reader");
  const marketStoreUtils = await hre.ethers.getContract("MarketStoreUtils");
  const oracle = await hre.ethers.getContract("Oracle");
  // indexToken: 0xfA600253bB6fE44CEAb0538000a8448807e50c85
  // longToken: 0xfA600253bB6fE44CEAb0538000a8448807e50c85
  // shortToken:
  const btcPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0xB921aEe0abD048E2FDd1E15aB2ddFBE589884522");
  const ethPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0x8f1ba66d30a1f01bd766eB3Bab0E8AfBeE164252");

  let exeCount = 0;
  let timeCount = 0;
  let oldKey;
  while (true) {
    if (timeCount % 60 == 0) {
      console.log("keeperDeposit time escaped: %s mins, executed: %s", timeCount / 60, exeCount);
    }
    timeCount ++;

    const depositCount = await getDepositCount(dataStore);
    // console.log("depositCount:", depositCount.toString());
    if (depositCount > 0) {
      let depositKeys = await getDepositKeys(dataStore, 0, 1);
      // console.log("111:");
      const deposit = await reader.getDeposit(dataStore.address, depositKeys[0]);
      if (deposit == undefined || depositKeys[0] == oldKey) {
        continue;
      }
      // console.log("222:");
      oldKey = depositKeys[0];

      // console.log("333:");
      let block = await provider.getBlock();
      // console.log("444:");
      let baseRealtimeData = getBaseRealtimeData(block);
      // console.log("555:");

      // console.log("deposit.initialLongToken:", addressToSymbol[deposit.addresses.initialLongToken], deposit.addresses.initialLongToken);
      // console.log("deposit.initialShortToken:", addressToSymbol[deposit.addresses.initialShortToken], deposit.addresses.initialShortToken);
      const depositBlock = await deposit.numbers.updatedAtBlock;
      // console.log("666:");
      // console.log("depositBlock:", depositBlock.toString());
      // console.log("market.address:", await deposit.addresses.market);
      // console.log("dataStore.address:", dataStore.address);
      // // console.log("market props:", await marketStoreUtils.get(dataStore, await deposit.addresses.market));
      // console.log("disable:", await dataStore.getBool(keys.isMarketDisabledKey(deposit.addresses.market)));
      // console.log("minMarketTokensForFirstDeposit1:", await dataStore.getUint(keys.minMarketTokensForFirstDeposit(deposit.addresses.market)));

      // console.log("deposit:", deposit);

      // const market = await reader.getMarket(dataStore, deposit.addresses.market);
      // console.log("market.indexToken:", await market.indexToken);

      // await dataStore.setUint(keys.minMarketTokensForFirstDeposit(deposit.addresses.market), expandDecimals(10, 18));
      // console.log("minMarketTokensForFirstDeposit2:", await dataStore.getUint(keys.minMarketTokensForFirstDeposit(deposit.addresses.market)));

      //
      // console.log("depositHandler.cancelDeposit:", depositKeys[0]);
      // await depositHandler.cancelDeposit(depositKeys[0], {gasLimit: "1000000"});

      console.log("deposit key:", depositKeys[0]);
      // console.log("777:");
      const _executeDepositFeatureDisabledKey = keys.executeDepositFeatureDisabledKey(depositHandler.address);
      // await dataStore.setBool(_executeDepositFeatureDisabledKey, false, {gasLimit:"1000000"});

      // console.log("888:");
      let btcPrice = await btcPriceFeed.latestAnswer()
      console.log("btc price:", btcPrice.toString());
      let ethPrice = await ethPriceFeed.latestAnswer()
      console.log("eth price:", ethPrice.toString());
      const tokenSymbol = addressToSymbol[deposit.addresses.initialLongToken];
      const longTokenPrice = tokenSymbol == "BTC"? btcPrice : ethPrice;
      // console.log("999:");
      try {
        await depositHandler.executeDeposit(depositKeys[0], {signerInfo: 0,
          tokens:[],compactedMinOracleBlockNumbers:[],compactedMaxOracleBlockNumbers:[],compactedOracleTimestamps:[],compactedDecimals:[],compactedMinPrices:[],compactedMinPricesIndexes:[],compactedMaxPrices: [], compactedMaxPricesIndexes: [], signatures: [], priceFeedTokens: [],
          realtimeFeedTokens:[deposit.addresses.initialLongToken, deposit.addresses.initialShortToken],
          realtimeFeedData:[
            encodeRealtimeData({
              ...baseRealtimeData,
              feedId: realtimeFeedId(deposit.addresses.initialLongToken),
              median: longTokenPrice,
              bid: longTokenPrice,
              ask: longTokenPrice,
              blocknumberLowerBound: depositBlock,
            }),
            encodeRealtimeData({
              ...baseRealtimeData,
              feedId: realtimeFeedId(deposit.addresses.initialShortToken),
              median: expandDecimals(1, 8),
              bid: expandDecimals(1, 8),
              ask: expandDecimals(1, 8),
              blocknumberLowerBound: depositBlock,
            })
          ]}, {gasLimit:"3000000"});
        console.log("deposit executed:", depositKeys[0]);
        exeCount ++;
        // await dataStore.setBool(_executeDepositFeatureDisabledKey, true, {gasLimit:"1000000"});
        // break;
      } catch (e) {
      }
    }

    // await sleep(1000);
  }

  // const tokens = await hre.gmx.getTokens();
  // const marketFactory = await hre.ethers.getContract("MarketFactory");
  // const defaultType = hashString("default_cp");
  // await marketFactory.createMarket(tokens.BTC.address, tokens.BTC.address, tokens.USDT.address, defaultType, {gasLimit:"3000000"});
  //
  // const addressToSymbol: { [address: string]: string } = {};
  // for (const [tokenSymbol, tokenConfig] of Object.entries(tokens)) {
  //   let address = tokenConfig.address;
  //   if (!address) {
  //     address = (await hre.ethers.getContract(tokenSymbol)).address;
  //   }
  //   addressToSymbol[address] = tokenSymbol;
  // }
  //
  // const reader = await hre.ethers.getContract("Reader");
  // const dataStore = await hre.ethers.getContract("DataStore");
  // console.log("reading data from DataStore %s Reader %s", dataStore.address, reader.address);
  // const markets = [...(await reader.getMarkets(dataStore.address, 0, 100))];
  // markets.sort((a, b) => a.indexToken.localeCompare(b.indexToken));
  // for (const market of markets) {
  //   const isDisabled = await dataStore.getBool(keys.isMarketDisabledKey(market.marketToken));
  //   const indexTokenSymbol = addressToSymbol[market.indexToken];
  //   const longTokenSymbol = addressToSymbol[market.longToken];
  //   const shortTokenSymbol = addressToSymbol[market.shortToken];
  //   console.log(
  //     "%s index: %s long: %s short: %s is disabled: %s",
  //     market.marketToken,
  //     indexTokenSymbol?.padEnd(5) || "(swap only)",
  //     longTokenSymbol?.padEnd(5),
  //     shortTokenSymbol?.padEnd(5),
  //     isDisabled
  //   );
  // }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
