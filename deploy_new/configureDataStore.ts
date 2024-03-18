import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as keys from "../utils/keys";
import { setAddressIfDifferent, setUintIfDifferent } from "../utils/dataStore";
import {gm} from "prb-math";
import hre from "hardhat";
import {tokenTransferGasLimit} from "../utils/keys";

const network = hre.network.name;
async function getRoTestValues() {
  const wnt = "0xcAc0759160d57A33D332Ed36a555C10957694407";
  const usdt= "0x9D973BAc12BB62A55be0F9f7Ad201eEA4f9B8428";
  const usdc = "0xf111Aa386823C4CF33F349597f1E772973Ac0913";
  const btc = "0xfA600253bB6fE44CEAb0538000a8448807e50c85";
  const eth = "0x5eD4813824E5e2bAF9BBC211121b21aB38E02522";
  const psys = "0xD451237dceE3395B63d84FF0DDC0a4dbCf005Cc1"
  const gasLimit = 1000000;

  return { wnt, usdt, usdc, btc, eth, psys, gasLimit }
}
async function getValues() {
  if (network === "rolluxtest") {
    return getRoTestValues()
  }
  console.log("Unsupported network for", network);
}

const func = async ({ deployments, getNamedAccounts, gmx }: HardhatRuntimeEnvironment) => {
  // const { read, execute, log } = deployments;
  // const { deployer } = await getNamedAccounts();
  // const oracleConfig = await gmx.getOracle();
  // const oracleSigners = oracleConfig.signers.map((s) => ethers.utils.getAddress(s));
  //
  // const existingSignersCount = await read("OracleStore", "getSignerCount");
  // const existingSigners = await read("OracleStore", "getSigners", 0, existingSignersCount);
  // log("existing signers", existingSigners.join(","));
  //
  // for (const oracleSigner of oracleSigners) {
  //   if (!existingSigners.includes(oracleSigner)) {
  //     log("adding oracle signer", oracleSigner);
  //     await execute("OracleStore", { from: deployer, log: true }, "addSigner", oracleSigner);
  //   }
  // }
  //
  // for (const existingSigner of existingSigners) {
  //   if (!oracleSigners.includes(existingSigner)) {
  //     log("removing oracle signer", existingSigner);
  //     await execute("OracleStore", { from: deployer, log: true }, "removeSigner", existingSigner);
  //   }
  // }
  // @ts-ignore
  const { wnt, usdt, usdc, btc, eth, psys, gasLimit } = await getValues();
  await setAddressIfDifferent(keys.WNT, wnt, "address of the WNT token");

  await setUintIfDifferent(keys.tokenTransferGasLimit(wnt), gasLimit, "token transfer gas limit");
  await setUintIfDifferent(keys.tokenTransferGasLimit(usdt), gasLimit, "token transfer gas limit");
  await setUintIfDifferent(keys.tokenTransferGasLimit(usdc), gasLimit, "token transfer gas limit");
  await setUintIfDifferent(keys.tokenTransferGasLimit(btc), gasLimit, "token transfer gas limit");
  await setUintIfDifferent(keys.tokenTransferGasLimit(eth), gasLimit, "token transfer gas limit");
  await setUintIfDifferent(keys.tokenTransferGasLimit(psys), gasLimit, "token transfer gas limit");
};
func.tags = ["DataStoreConfig"];
func.dependencies = ["RoleStore", "DataStore"];
export default func;
