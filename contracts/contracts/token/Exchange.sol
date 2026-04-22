// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/// @notice ETH ↔ BKT 환전소
/// 교환 비율: 0.001 ETH = 100,000 BKT
/// 즉, 1 ETH = 100,000,000 BKT (1억)
/// 금액은 모두 wei/raw 단위 (BKT 18 decimals)
contract Exchange is ReentrancyGuard {
    IERC20 public immutable token;
    IMintable public immutable mintable;

    /// @dev 1 ETH(1e18 wei) = 100,000,000 BKT(100_000_000 * 1e18 raw)
    /// 계산: rawBkt = ethWei * RATE
    /// 예: 0.001 ETH(1e15 wei) → 100,000 BKT(100_000 * 1e18 raw)
    uint256 public constant RATE = 100_000_000;

    event Exchanged(address indexed user, uint256 ethWei, uint256 bktRaw);
    event Redeemed(address indexed user, uint256 bktRaw, uint256 ethWei);

    constructor(address _token) {
        token = IERC20(_token);
        mintable = IMintable(_token);
    }

    /// @notice ETH → BKT
    function exchange() external payable nonReentrant {
        require(msg.value > 0, "Send ETH");
        uint256 rawBkt = msg.value * RATE;
        mintable.mint(msg.sender, rawBkt);
        emit Exchanged(msg.sender, msg.value, rawBkt);
    }

    /// @notice BKT → ETH
    /// @param rawBkt BKT raw 단위 (18 decimals 포함)
    function redeem(uint256 rawBkt) external nonReentrant {
        require(rawBkt > 0, "Amount must be > 0");
        uint256 ethWei = rawBkt / RATE;
        require(ethWei > 0, "Amount too small");
        require(address(this).balance >= ethWei, "Insufficient ETH reserve");
        token.transferFrom(msg.sender, address(this), rawBkt);
        mintable.burn(address(this), rawBkt);
        (bool ok, ) = msg.sender.call{value: ethWei}("");
        require(ok, "ETH transfer failed");
        emit Redeemed(msg.sender, rawBkt, ethWei);
    }

    receive() external payable {}
}
