//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";

import "./IERC20.sol";

contract CoolToken is IERC20 {
  uint256 public override totalSupply;
  address public owner;
  mapping(address => uint256) private balances;
  mapping(address => mapping(address => uint256)) public override allowance;

  constructor() {
    owner = msg.sender;
  }

  modifier isOwner() {
    require(msg.sender == owner, "Only owner can mint");
    _;
  }

  function mint(uint256 amount) external isOwner {
    totalSupply += amount;
    balances[owner] += amount;
    emit Transfer(address(0), owner, amount);
  }

  function burn(address victim, uint256 amount) external isOwner {
    totalSupply -= amount;
    balances[victim] -= amount;
    emit Transfer(victim, address(0), amount);
  }

  function balanceOf(address account) external view override returns (uint256) {
    return balances[account];
  }

  // todo: should this be external?

  function transfer(address to, uint256 value)
    external
    override
    returns (bool)
  {
    balances[msg.sender] -= value;
    balances[to] += value;

    emit Transfer(msg.sender, to, value);

    return true;
  }

  function approve(address spender, uint256 amount)
    external
    override
    returns (bool)
  {
    allowance[msg.sender][spender] = amount;

    emit Approval(msg.sender, spender, amount);

    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 value
  ) external override returns (bool) {
    require(value <= allowance[from][msg.sender]);

    balances[msg.sender] -= value;
    balances[to] += value;

    emit Transfer(msg.sender, to, value);

    allowance[from][msg.sender] -= value;
    return true;
  }
}
