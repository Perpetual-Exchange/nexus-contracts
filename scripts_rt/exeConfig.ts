import hre from "hardhat";
import * as keys from "../utils/keys";
import {hashString} from "../utils/hash";
import {decimalToFloat, expandDecimals} from "../utils/math";
import {expect} from "chai";

const { AddressZero } = ethers.constants;
async function main() {
  const dataStore = await hre.ethers.getContract("DataStore");
  const config = await hre.ethers.getContract("Config");
  const getValue = ({ type, initial, index }) => {
    if (type === "Address") {
      return user1.address;
    }
    if (type === "Bool") {
      return !initial;
    }
    return index + 1;
  };

  const list = [
    // {
    //   key: keys.HOLDING_ADDRESS,
    //   initial: AddressZero,
    //   type: "Address",
    // },
    // {
    //   key: keys.MIN_HANDLE_EXECUTION_ERROR_GAS,
    //   initial: 1_200_000,
    //   type: "Uint",
    // },
    {
      key: keys.MAX_SWAP_PATH_LENGTH,
      initial: 5,
      type: "Uint",
    },
    // {
    //   key: keys.MAX_CALLBACK_GAS_LIMIT,
    //   initial: 2_000_000,
    //   type: "Uint",
    // },
    // {
    //   key: keys.MIN_POSITION_SIZE_USD,
    //   initial: decimalToFloat(1),
    //   type: "Uint",
    // },
    // {
    //   key: keys.MIN_ORACLE_BLOCK_CONFIRMATIONS,
    //   initial: 255,
    //   type: "Uint",
    // },
    // {
    //   key: keys.MAX_ORACLE_PRICE_AGE,
    //   initial: 3600,
    //   type: "Uint",
    // },
    // {
    //   key: keys.MAX_ORACLE_REF_PRICE_DEVIATION_FACTOR,
    //   initial: decimalToFloat(5, 1),
    //   type: "Uint",
    // },
    // {
    //   key: keys.POSITION_FEE_RECEIVER_FACTOR,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.SWAP_FEE_RECEIVER_FACTOR,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.BORROWING_FEE_RECEIVER_FACTOR,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.ESTIMATED_GAS_FEE_BASE_AMOUNT,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.SINGLE_SWAP_GAS_LIMIT,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.INCREASE_ORDER_GAS_LIMIT,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.DECREASE_ORDER_GAS_LIMIT,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.SWAP_ORDER_GAS_LIMIT,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.NATIVE_TOKEN_TRANSFER_GAS_LIMIT,
    //   initial: 50_000,
    //   type: "Uint",
    // },
    // {
    //   key: keys.REQUEST_EXPIRATION_BLOCK_AGE,
    //   initial: 0,
    //   type: "Uint",
    // },
    // {
    //   key: keys.MAX_UI_FEE_FACTOR,
    //   initial: decimalToFloat(5, 5),
    //   type: "Uint",
    // },
    // {
    //   key: keys.SKIP_BORROWING_FEE_FOR_SMALLER_SIDE,
    //   initial: false,
    //   type: "Bool",
    // },
  ];

  for (let i = 0; i < list.length; i++) {
    const { key, initial, type } = list[i];
    const getMethod = `get${type}`;
    const setMethod = `set${type}`;

    const value = getValue({ type, initial, index: i });
    console.log(i, type, key, initial)
    // await config[setMethod](key, "0x", value, {gasLimit: "1000000"});
    await dataStore.setUint(key, initial);
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
