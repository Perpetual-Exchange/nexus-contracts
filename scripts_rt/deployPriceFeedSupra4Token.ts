import hre from "hardhat";
import {deployContract} from "../utils/deploy";

async function main() { // !!!
  // const {deployer} = await hre.getNamedAccounts()
  // console.log("deployer:", deployer)

  const adapterSupra = "0xf35E13deFb1B6362Ef3f52Ab0a2Bf86A0D24E964"
  const decimals = 8
  const description = '/USD'
  const tokens= await hre.gmx.getTokens()
  let count = 0
  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    count ++
    if (token.supraPairIdx >= 0) {
      const s_description = tokenSymbol + description
      const priceFeed = await deployContract("ChainlinkAggregator4Supra", [decimals, s_description]);
      await priceFeed.setEnableAdapter(true);
      await priceFeed.setAdapterInfo(adapterSupra, token.supraPairIdx)
      console.log(`ChainlinkAggregator4Supra with decimals: ${decimals}, s_description: ${s_description} deployed to ${priceFeed.address}`)
      // console.log("symbol:", tokenSymbol)
    }
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
