import {contractAt, deployContract} from "../utils/deploy";
import hre from "hardhat";

async function main() {
    const {deployer} = await hre.getNamedAccounts()
    console.log("deployer:", deployer)
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

  const sysPriceFeed = await contractAt("ChainlinkAggregator4Supra", "0x9Dff2CeBccA79F9090340604b58612fc3e818DCb");
  const price = await sysPriceFeed.latestAnswer();
  const timestamp = await sysPriceFeed.latestTimestamp();
  console.log("sys price:", price.toString(), "timestamp:", timestamp.toString());
  const price2 = await sysPriceFeed.latestAnswerOracle();
  const timestamp2 = await sysPriceFeed.latestTimestampOracle();
  console.log("sys priceOracle:", price2.toString(), "timestamp:", timestamp2.toString());

  const oracleKeeper = "0x39AD2809F73086A63Ab2F0D8D689D1cc02579abA";
  console.log("oracleKeeper:", oracleKeeper);
  const priceFeedArr = [ "0xB921aEe0abD048E2FDd1E15aB2ddFBE589884522",  // RBTC
                              "0x8f1ba66d30a1f01bd766eB3Bab0E8AfBeE164252",     // RWETH
                              "0x9Dff2CeBccA79F9090340604b58612fc3e818DCb",     // WTSYS
                              "0xf631C28F3cb32301Cd6fe005feccbF24F1bba3c4",     // RUSDT
                              "0x2530CbF4c00BC1839f76f5524DE92825bF045090"      // RUSDC
                            ];
  // let count = 0;
  // for (const contractAddress of priceFeedArr) {
  //     if (++count > 1) {
  //         break;
  //     }
  //   // const method = "transferOwnership";          // Step 1
  //   // const method = "acceptOwnership";       // Step 2
  //   // console.log(`${method}:`, contractAddress);
  //   const priceFeed = await contractAt("ChainlinkAggregator4Supra", contractAddress);
  //   // await priceFeed.transferOwnership(oracleKeeper);     // Step 1
  //   // await priceFeed.acceptOwnership();          // Step 2
  //   // console.log("owner:", await priceFeed.owner());
  //     sleep(10000);
  //     let roundData = await priceFeed.latestRoundData();
  //     console.log("latestRoundData:", roundData.toString());
  // }
  const priceFeed = await contractAt("ChainlinkAggregator4Supra", priceFeedArr[0]);
  for (let i=0;i<100000000000000;i++) {

      // sleep(10000);
      if (i % 10000000 === 0) {
          let roundData = await priceFeed.latestRoundData();
          console.log(" latestRoundData:", roundData.toString());
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