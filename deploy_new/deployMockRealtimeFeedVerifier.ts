import { HardhatRuntimeEnvironment } from "hardhat/types";
import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "MockRealtimeFeedVerifier",
});

// func.skip = async ({ network }: HardhatRuntimeEnvironment) => {
//   const shouldDeployForNetwork = ["hardhat"];
//   return !shouldDeployForNetwork.includes(network.name);
// };
func.tags = ["MockRealtimeFeedVerifier"];
export default func;
