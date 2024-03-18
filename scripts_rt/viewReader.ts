import {contractAt, deployContract} from "../utils/deploy";
import hre from "hardhat";

async function main() {
  const { provider } = hre.ethers;
  const gasPrice = await provider.getGasPrice();
  console.log("provider.getGasPrice:", gasPrice.toString());

  // let reader = await contractAt("Reader", "0x4F5622A4d077BDcdaD12fbEE2aC0B6D2251CC284");
  const dataStore = await hre.ethers.getContract("DataStore");
  const reader = await hre.ethers.getContract("Reader");
  // const dataStore = await contractAt("DataStore", "0x66B39B1A5D33BCAE662796a0fB9c2246803c4f96");
  const markets = await reader.getMarkets("0x66B39B1A5D33BCAE662796a0fB9c2246803c4f96", 0, 100);
  console.log("markets:", markets);
  // const dataStore = await contractAt("DataStore", "0x8a17a202C2fb0D48c3444492e548bBF4bC4B1940");
  // const roleStore = await dataStore.roleStore();
  // console.log("roleStore:", await roleStore.address);

  // const AdapterPyth = await contractAt("AdapterPyth", "0xbA350432A1ab209f17E9A36712F98Fca4a90B7e8");
  // const [price, timestamp] = await AdapterPyth.latestPrice("0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", 7);
  // console.log("btc price:", price.toString(), " timestamp:", timestamp.toString());
  // const [price2, timestamp2] = await AdapterPyth.latestPrice("0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", 7);
  // console.log("eth price:", price2.toString(), " timestamp:", timestamp2.toString());

  // const usdcPriceFeed = await contractAt("ChainlinkAggregatorAdapter", "0x5D5E546F897b45b764367E76aF3E0761fD07257e");
  // const price = await usdcPriceFeed.latestAnswer();
  // const timestamp = await usdcPriceFeed.latestTimestamp();
  // console.log("usdc price:", price.toString(), "timestamp:", timestamp.toString());
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });