import hre from "hardhat";
import {contractAt, deployContract} from "../utils/deploy";

async function main() {
  const {deployer} = await hre.getNamedAccounts()
  console.log("deployer:", deployer)

  // const supraContract =  "0x6Cd59830AAD978446e6cc7f6cc173aF7656Fb917"; AdapterSupra: 0x1B6ebaC680933094e880172D58839d4640f706d3
  const supraContract =  "0x14Dbb98a8e9A77cE5B946145bb0194aDE5dA7611";

  // const adapterSupra = await deployContract("AdapterSupra", [supraContract]);
  const adapterSupra = await contractAt("AdapterSupra", "0xf35E13deFb1B6362Ef3f52Ab0a2Bf86A0D24E964");
  console.log(`AdapterSupra deployed to ${adapterSupra.address}`);
  const [round, decimals, timestamp, price] = await adapterSupra.latestPrices(2, 8);
  console.log("round:", round.toString());
  console.log("decimals:", decimals.toString());
  console.log("timestamp:", timestamp.toString());
  console.log("price:", price.toString());
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
