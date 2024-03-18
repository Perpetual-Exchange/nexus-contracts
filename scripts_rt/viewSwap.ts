import {contractAt, deployContract} from "../utils/deploy";
import hre from "hardhat";
import * as keys from "../utils/keys";

async function main() {
  const reader = await hre.ethers.getContract("Reader");
  const dataStore = await hre.ethers.getContract("DataStore");
  console.log("dataStore.address:", dataStore.address);
  let maxSwapPathLen = await dataStore.getUint(keys.MAX_SWAP_PATH_LENGTH);
  console.log("MAX_SWAP_PATH_LENGTH:", maxSwapPathLen.toString());


  console.log("disabled:", await dataStore.getBool(keys.createWithdrawalFeatureDisabledKey("0x25a3C9F4Fe362b3A5fcb240bc740466Ab21f7Df5")));

  dataStore.getBool()


}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });