import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { CoolToken } from "../typechain";

describe("CoolToken", () => {
  let token: CoolToken;
  let deployer: SignerWithAddress;
  let accounts: SignerWithAddress[];

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const CoolToken = await ethers.getContractFactory("CoolToken", deployer);
    token = await CoolToken.deploy();
    await token.deployed();
  });

  describe("mint", () => {
    it("mints 1000 tokens", async () => {
      await token.mint(1000);

      expect(await token.totalSupply()).to.be.eq(1000);
    });

    it("doesnt allow to overflow total supply", async () => {
      await token.mint(ethers.constants.MaxUint256);
      expect(await token.totalSupply()).to.be.eq(ethers.constants.MaxUint256);

      await expect(token.mint(1)).to.be.revertedWith(
        "0x11 (Arithmetic operation underflowed"
      );
    });
  });

  describe("transfer", () => {
    it("allows to transfer from one address to another", async () => {
      await token.mint(100);
      const transferReceipt = await token.transfer(accounts[0].address, 10);

      expect(await token.balanceOf(accounts[0].address)).to.be.equal(10);
      expect(await token.balanceOf(deployer.address)).to.be.equal(90);

      await expect(transferReceipt)
        .to.emit(token, "Transfer")
        .withArgs(deployer.address, accounts[0].address, 10);
    });

    it("fails to transfer with insufficient funds", async () => {
      await expect(token.transfer(accounts[0].address, 10)).to.be.revertedWith(
        "underflow"
      );
    });
  });
});
