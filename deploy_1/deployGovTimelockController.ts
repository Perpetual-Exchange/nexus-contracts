import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "GovTimelockController",
  id: "GovTimelockController_1",
  getDeployArgs: async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    return [
      "NOX Gov Timelock Controller", // name !!!
      60, // minDelay 24 * 60 * 60 !!!
      [deployer], // proposers
      [deployer], // executors
      deployer,
    ];
  },
});

export default func;
