import { createDeployFunction } from "../utils/deploy";
import { expandDecimals } from "../utils/math";

const func = createDeployFunction({
  contractName: "ProtocolGovernor",
  id: "ProtocolGovernor_1",
  dependencyNames: ["GovToken", "GovTimelockController"],
  getDeployArgs: async ({ dependencyContracts }) => {
    return [
      dependencyContracts.GovToken.address, // token
      dependencyContracts.GovTimelockController.address, // timelock
      "NOX Governor", // name !!!
      "v2.0", // version
      60, // votingDelay 24 * 60 * 60 !!!
      30 * 60, // votingPeriod 5 * 24 * 60 * 60 !!!
      expandDecimals(30_000, 18), // proposalThreshold
      4, // quorumNumeratorValue
    ];
  },
});

export default func;
