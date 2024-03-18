import hre from "hardhat";
import {DeployOptions} from "hardhat-deploy/dist/types";

async function main() {
  const { deployments } = hre;
  await deployments.delete("Oracle");
  // const option = DeployOptions
  // await deployments.deploy("MarketFactory");
  const allDeployments = await deployments.all();
  for (const [contractName, { address }] of Object.entries(allDeployments)) {
    if (process.env.TABLE_FORMAT) {
      console.log(`${process.env.EXPLORER_URL}/address/${address},${contractName}`);
    } else {
      console.log(contractName, address);
    }
  }
  // await deployments.delete("MarketFactory");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((ex) => {
    console.error(ex);
    process.exit(1);
  });
