import {contractAt, deployContract} from "../utils/deploy";
import hre from "hardhat";
import * as keys from "../utils/keys";

async function main() {
  // const dataStore = await hre.ethers.getContract("DataStore");
  const dataStore = await contractAt("DataStore", "0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8");
  console.log("dataStore:", dataStore.address);
  // const keys = await hre.ethers.getContract("Keys");
  console.log("wnt token(%s):", keys.WNT, await dataStore.getAddress(keys.WNT));
  const maxPnlFactorForTraders = await dataStore.getUint(keys.MAX_PNL_FACTOR_FOR_TRADERS)
  console.log("MAX_PNL_FACTOR_FOR_TRADERS:", maxPnlFactorForTraders.toString());
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });