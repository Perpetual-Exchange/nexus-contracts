import hre from "hardhat";
import * as keys from "../utils/keys";
import {hashString} from "../utils/hash";
import {expandDecimals} from "../utils/math";

async function main() {
  const tokens = await hre.gmx.getTokens();
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

  const btcMarket = "0x4Bea6421c5C73C047d443bE318C900EB5d2379F1";
  const reader = await hre.ethers.getContract("Reader");
  const dataStore = await hre.ethers.getContract("DataStore");
  let minFirstDeposit = await dataStore.getUint(keys.minMarketTokensForFirstDeposit(btcMarket));
  console.log("minMarketTokensForFirstDeposit1:", minFirstDeposit.toString());
  // await dataStore.setUint(keys.minMarketTokensForFirstDeposit(btcMarket), expandDecimals(0, 18));

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
