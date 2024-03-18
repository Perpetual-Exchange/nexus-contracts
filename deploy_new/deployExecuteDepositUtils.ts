import { createDeployFunction } from "../utils/deploy";

const func = createDeployFunction({
  contractName: "ExecuteDepositUtils",
  libraryNames: [
    "GasUtils",
    "FeeUtils",
    "MarketUtils",
    "MarketStoreUtils",
    "MarketEventUtils",
    "DepositStoreUtils",
    "DepositEventUtils",
    "SwapUtils",
    "SwapPricingUtils",
  ],
  id: "ExecuteDepositUtils_3",
});

func.tags = ["ExecuteDepositUtils"];
export default func;
