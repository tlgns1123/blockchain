// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice 블록마켓 전용 토큰 - ETH로 환전 가능
/// Exchange 컨트랙트만 mint/burn 가능
contract BlockToken is ERC20, Ownable {
    address public exchange;

    event ExchangeSet(address indexed exchange);

    constructor() ERC20("Block Token", "BKT") Ownable(msg.sender) {}

    function setExchange(address _exchange) external onlyOwner {
        exchange = _exchange;
        emit ExchangeSet(_exchange);
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == exchange, "Only exchange");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == exchange, "Only exchange");
        _burn(from, amount);
    }
}
