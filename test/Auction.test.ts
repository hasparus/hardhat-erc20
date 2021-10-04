import { BigNumberish } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";

import { Auction, CoolToken, IERC20 } from "../typechain";

describe("Auction", () => {
  let deployer: SignerWithAddress;
  let accounts: SignerWithAddress[];

  let token: CoolToken;

  beforeEach(async () => {
    [deployer, ...accounts] = await ethers.getSigners();

    const CoolToken = await ethers.getContractFactory("CoolToken");
    token = await CoolToken.deploy();
    await token.deployed();
  });

  describe("integration tests", () => {
    it("scenario #1", async () => {
      // At the beginning,
      //   Alice has 1000 CoolTokens,
      //   Bob has 2000 CoolTokens
      //   and Charlie has 4000 CoolTokens.

      token.mint(10_000);
      const [alice, bob, charlie] = accounts;

      await token.transfer(alice.address, 1000);
      await token.transfer(bob.address, 2000);
      await token.transfer(charlie.address, 4000);

      // Alice starts an auction for 20 ETH and bids 100 CoolTokens.
      const auction = await deployAuction({
        deployer: alice,
        token,
        value: ethToWei(20),
      });

      await token.connect(alice).approve(auction.address, 100);
      await auction.bid(alice.address, 100);

      let latestBid = await auction.latestBid();

      expect(latestBid.bidder).to.eq(alice.address);
      expect(latestBid.value.toNumber()).to.eq(100);

      // Bob tries to bid 90 CoolTokens and gets a revert.
      await token.connect(bob).approve(auction.address, 90);
      await expect(auction.bid(bob.address, 90)).to.be.revertedWith(
        "Bid is not higher than previous bid"
      );

      // The latest bidder is obviously still Alice.
      latestBid = await auction.latestBid();
      expect(latestBid.bidder).to.eq(alice.address);
      expect(latestBid.value.toNumber()).to.eq(100);

      // Bob bids 200 CoolTokens and becomes latest bidder.
      await token.connect(bob).approve(auction.address, 200);
      await auction.bid(bob.address, 200);

      latestBid = await auction.latestBid();
      expect(latestBid.bidder).to.eq(bob.address);
      expect(latestBid.value.toNumber()).to.eq(200);

      // Charlie bids 2000 CoolTokens.
      await token.connect(charlie).approve(auction.address, 2000);
      await auction.bid(charlie.address, 2000);

      // Neither Alice nor Bob can stop him from winning the auction.
      await expect(auction.bid(alice.address, 3000)).to.be.revertedWith(
        "Insufficient allowance"
      );
      await token.connect(alice).approve(auction.address, 3000);
      await expect(auction.bid(alice.address, 3000)).to.be.revertedWith(
        "Insufficient balance"
      );

      await token.connect(bob).approve(auction.address, 2000);
      await expect(auction.bid(bob.address, 2000)).to.be.revertedWith(
        "Bid is not higher than previous"
      );

      // Charlie tries to close, but it's too early yet.
      await expect(auction.connect(charlie).close()).to.be.revertedWith(
        "Not enough time has passed"
      );

      await network.provider.send("evm_increaseTime", [hoursToMs(3)]);

      const closing = await auction.connect(charlie).close();

      // Charlie is 2000 CoolTokens poorer
      expect((await token.balanceOf(charlie.address)).toNumber()).to.eq(2000);
      // but he gained 20 ETH
      await expect(closing).to.changeEtherBalance(charlie, ethToWei(20));
    });
  });
});

async function deployAuction({
  deployer,
  token,
  value,
}: {
  deployer: SignerWithAddress;
  token: IERC20;
  value: BigNumberish;
}) {
  const Auction = await ethers.getContractFactory("Auction", deployer);
  const auction = await Auction.deploy(token.address, { value });
  return await auction.deployed();
}

const ethToWei = (eth: number) => ethers.constants.WeiPerEther.mul(eth);

const hoursToMs = (hours: number) => hours * 60 * 60 * 1000;
