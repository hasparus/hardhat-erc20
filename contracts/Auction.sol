// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./CoolToken.sol";

struct Bid {
  address payable bidder;
  uint256 value;
  uint256 timestamp;
}

// Participants auction for ETH using IERC20 tokens.
contract Auction {
  address payable owner;

  IERC20 public token;
  uint256 public deposit;
  Bid public latestBid;

  uint256 public constant CLOSING_WINDOW_TIME = 3 hours;

  constructor(IERC20 _token) payable {
    require(msg.value >= 0, "Reward must be greater than 0");

    // msg.sender may not be EOA if we run new Auction() from another
    // contract, right?
    owner = payable(msg.sender);

    token = _token;
  }

  function reward() public view returns (uint256) {
    return address(this).balance;
  }

  function bid(address payable bidder, uint256 value) external {
    require(value > latestBid.value, "Bid is not higher than previous bid");
    require(
      token.allowance(bidder, address(this)) >= value,
      "Insufficient allowance"
    );
    require(token.balanceOf(bidder) >= value, "Insufficient balance");

    latestBid = Bid(bidder, value, block.timestamp);
  }

  function close() external {
    require(latestBid.value > 0, "No bids received");
    require(latestBid.bidder == msg.sender, "Only the latest bidder can close");
    require(
      block.timestamp >= latestBid.timestamp + CLOSING_WINDOW_TIME,
      "Not enough time has passed"
    );

    // The winner pays their IERC20 tokens to the deployer
    token.transferFrom(latestBid.bidder, owner, latestBid.value);
    // and receives the reward
    selfdestruct(latestBid.bidder);
  }
}
