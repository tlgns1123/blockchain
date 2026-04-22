// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IInterestCalculator.sol";

/// @notice 즉시구매 (고정가 판매) - BKT 토큰 결제
contract DirectSale is ReentrancyGuard {
    enum State { OnSale, Locked, Completed, Cancelled }

    IERC20                public immutable token;
    address               public immutable platform;
    IInterestCalculator   public immutable interestCalc;

    address public immutable seller;
    uint256 public immutable price;
    address public buyer;
    State public state;

    event Purchased(address indexed buyer, uint256 price);
    event ReceivedConfirmed(address indexed buyer);
    event Cancelled();

    modifier onlySeller() { require(msg.sender == seller, "Not seller"); _; }
    modifier onlyBuyer()  { require(msg.sender == buyer,  "Not buyer");  _; }

    constructor(
        uint256 _price,
        address _seller,
        address _token,
        address _platform,
        address _interestCalc
    ) {
        require(_price > 0, "Price must be > 0");
        seller       = _seller;
        price        = _price;
        token        = IERC20(_token);
        platform     = _platform;
        interestCalc = IInterestCalculator(_interestCalc);
        state        = State.OnSale;
    }

    function purchase() external nonReentrant {
        require(state == State.OnSale, "Not on sale");
        require(token.transferFrom(msg.sender, address(this), price), "Token transfer failed");
        buyer = msg.sender;
        state = State.Locked;
        emit Purchased(msg.sender, price);
    }

    function confirmReceived() external nonReentrant onlyBuyer {
        require(state == State.Locked, "Not locked");
        state = State.Completed;
        emit ReceivedConfirmed(msg.sender);
        uint256 fee = interestCalc.calculate(price, 0);
        uint256 sellerAmount = price > fee ? price - fee : 0;
        if (fee > 0)         require(token.transfer(platform, fee),        "Platform fee failed");
        if (sellerAmount > 0) require(token.transfer(seller, sellerAmount), "Seller transfer failed");
    }

    function cancel() external nonReentrant onlySeller {
        require(state == State.OnSale, "Cannot cancel now");
        state = State.Cancelled;
        emit Cancelled();
    }
}
