import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "GovToken",
  id: "GovToken_1",
  dependencyNames: ["RoleStore"],
  getDeployArgs: async ({ dependencyContracts }) => {
    return [
      dependencyContracts.RoleStore.address, // roleStore
      "NOX DAO", // name !!!
      "NOX_DAO", // symbol !!!
      18, // decimals
    ];
  },
});

export default func;
