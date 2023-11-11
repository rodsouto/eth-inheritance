// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

contract OwnerHeir {
    address public owner = msg.sender;
    address public heir;
    uint256 public nextTakeOverTime;

    event Withdrawal(address indexed owner, uint256 amount);
    event HeirTakeOver(
        address indexed oldOwner,
        address indexed newOwner,
        address indexed newHeir
    );

    constructor(address _heir) payable {
        heir = _heir;
        nextTakeOverTime = block.timestamp + 30 days;
    }

    function withdraw(uint256 amount) public {
        require(msg.sender == owner, "Only owner can withdraw");

        // require not needed because we are checking the return value of owner.call() and it will fail there
        //require(address(this).balance >= amount, "Insufficient balance");

        // reset timestamp
        nextTakeOverTime = block.timestamp + 30 days;

        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Failed to withdraw");

        emit Withdrawal(owner, amount);
    }

    function takeOver(address _newHeir) external {
        require(msg.sender == heir, "Only heir can take over");
        require(block.timestamp > nextTakeOverTime, "Too soon");
        require(_newHeir != address(0), "Invalid heir address");

        address oldOwner = owner;
        owner = msg.sender;
        heir = _newHeir;

        // reset timestamp
        nextTakeOverTime = block.timestamp + 30 days;

        emit HeirTakeOver(oldOwner, owner, heir);
    }

    receive() external payable {}
}
