import { expect } from "chai";
import { ethers } from "hardhat";

describe("CoolToken", function () {
  it("Should return the new greeting once it's changed", async function () {
    const CoolToken = await ethers.getContractFactory("CoolToken");
    const token = await CoolToken.deploy();
    await token.deployed();

    await token.mint(1000);

    expect(await token.totalSupply()).to.be.eq(1000);
  });
});
