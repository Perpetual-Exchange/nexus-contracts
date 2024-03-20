import {contractAt, deployContract} from "../utils/deploy";
import hre from "hardhat";
import * as keys from "../utils/keys";

async function main() {
  const dataStore = await hre.ethers.getContract("DataStore");
  console.log("dataStore:", dataStore.address);
  // const keys = await hre.ethers.getContract("Keys");
  console.log("wnt token(%s):", keys.WNT, await dataStore.getAddress(keys.WNT));
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });