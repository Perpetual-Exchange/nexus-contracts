import hre from "hardhat";
import { DEFAULT_MARKET_TYPE } from "../utils/market";
import * as keys from "../utils/keys";

async function main() {

  const tokens = await hre.gmx.getTokens();
  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    if (!token.address) {
      console.log(`token ${tokenSymbol} has no address`);
    }
    console.log(`realtime feed id for ${tokenSymbol} ${token.address}:`, keys.realtimeFeedId(token.address));
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
