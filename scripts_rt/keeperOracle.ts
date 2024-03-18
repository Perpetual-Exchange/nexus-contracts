import hre from "hardhat";
import * as keys from "../utils/keys";
import {hashString} from "../utils/hash";
import {getDepositCount, getDepositKeys} from "../utils/deposit";
import {createAuthenticationAdapter} from "@rainbow-me/rainbowkit";
import {encodeRealtimeData} from "../utils/oracle";
import {expandDecimals} from "../utils/math";
import {realtimeFeedId} from "../utils/keys";
import {sleep} from "react-query/types/core/utils";

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
async function main() {
  const {AddressZero, HashZero} = ethers.constants;
  const dataStore = await hre.ethers.getContract("DataStore");
  console.log("dataStore.address:", dataStore.address);
  const depositHandler = await hre.ethers.getContract("DepositHandler");
  console.log("depositHandler.oracle:", await depositHandler.oracle());
  const reader = await hre.ethers.getContract("Reader");
  const marketStoreUtils = await hre.ethers.getContract("MarketStoreUtils");
  const oracle = await hre.ethers.getContract("Oracle");
  // await oracle.setPrimaryPrice("0xfA600253bB6fE44CEAb0538000a8448807e50c85", { min: expandDecimals(67139, 12), max: expandDecimals(67154, 12) });
  console.log("indexTokenPrice:", await oracle.getPrimaryPrice("0xfA600253bB6fE44CEAb0538000a8448807e50c85"));
  // await oracle.setPrimaryPrice("0x9D973BAc12BB62A55be0F9f7Ad201eEA4f9B8428", { min: expandDecimals(1, 24), max: expandDecimals(1, 24) });
  console.log("shortTokenPrice:", await oracle.getPrimaryPrice("0x9D973BAc12BB62A55be0F9f7Ad201eEA4f9B8428"));
  // indexToken: 0xfA600253bB6fE44CEAb0538000a8448807e50c85
  // longToken: 0xfA600253bB6fE44CEAb0538000a8448807e50c85
  // shortToken:0x9D973BAc12BB62A55be0F9f7Ad201eEA4f9B8428
  await oracle.clearAllPrices();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
