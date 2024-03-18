import {contractAt, deployContract} from "../utils/deploy";
import hre from "hardhat";
import * as keys from "../utils/keys";

async function main() {
  const reader = await hre.ethers.getContract("Reader");
  const dataStore = await hre.ethers.getContract("DataStore");
  console.log("dataStore:", dataStore.address);
  const oracle = await hre.ethers.getContract("Oracle");
  console.log("oracle.realtimeFeedVerifier:", await oracle.realtimeFeedVerifier());
  // const keys = await hre.ethers.getContract("Keys");
  console.log("wnt token(%s):", keys.WNT, await dataStore.getAddress(keys.WNT));

  const btcMarketToken = "0x4Bea6421c5C73C047d443bE318C900EB5d2379F1";
  const market = await reader.getMarket(dataStore.address, btcMarketToken);
  console.log("market:", market);
  console.log("indexToken.oracle.getPrimaryPrice:", await oracle.getPrimaryPrice(market.indexToken));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });