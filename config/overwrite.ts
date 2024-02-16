export function getExistingContractAddresses(network) {
  if (network.name === "arbitrum") {
    return {
      ReferralStorage: { address: "0xe6fab3f0c7199b0d34d7fbe83394fc0e0d06e99d" },
    };
  }

  if (network.name === "avalanche") {
    return {
      ReferralStorage: { address: "0x827ed045002ecdabeb6e2b0d1604cf5fc3d322f8" },
    };
  }

  // !!!
  if (network.name === "zktest") {
    return {
      ReferralStorage: { address: "0x6a9c73B4AeD80b4b173c9Ce47ED940F0Ab609159" },
    };
  }

  // !!!
  if (network.name === "rolluxtest") {
    return {
      ReferralStorage: { address: "0xac8c7A57335554F0E93Ba6272f0cB093524D4E3e" },
    };
  }

  return {};
}
