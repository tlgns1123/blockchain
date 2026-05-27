// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IInterestCalculator.sol";

/// @notice 즉시구매 (고정가 판매) - BKT 토큰 결제
contract DirectSale is ReentrancyGuard {
    enum State { OnSale, Locked, Completed, Cancelled, MutualCancelled, Disputed }

    IERC20                public immutable token;
    address               public immutable platform;
    IInterestCalculator   public immutable interestCalc;

    address public immutable seller;
    uint256 public immutable price;
    address public buyer;
    State public state;

    bool public sellerAgreeCancel;
    bool public buyerAgreeCancel;

    event Purchased(address indexed buyer, uint256 price);
    event ReceivedConfirmed(address indexed buyer);
    event Cancelled();
    event CancelRequested(address indexed requester);
    event MutualCancelled(address indexed buyer, uint256 refund);
    event DisputeRaised(address indexed requester);
    event AdminResolved(address indexed winner, uint256 amount);

    modifier onlySeller()   { require(msg.sender == seller,   "Not seller");   _; }
    modifier onlyBuyer()    { require(msg.sender == buyer,    "Not buyer");    _; }
    modifier onlyPlatform() { require(msg.sender == platform, "Not platform"); _; }

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

    /// @notice Locked 상태에서 판매자 또는 구매자가 취소에 동의
    function agreeCancel() external nonReentrant {
        require(state == State.Locked, "Not locked");
        require(msg.sender == seller || msg.sender == buyer, "Not a party");

        if (msg.sender == seller) {
            require(!sellerAgreeCancel, "Already agreed");
            sellerAgreeCancel = true;
        } else {
            require(!buyerAgreeCancel, "Already agreed");
            buyerAgreeCancel = true;
        }
        emit CancelRequested(msg.sender);

        if (sellerAgreeCancel && buyerAgreeCancel) {
            state = State.MutualCancelled;
            uint256 refund = token.balanceOf(address(this));
            if (refund > 0) require(token.transfer(buyer, refund), "Refund failed");
            emit MutualCancelled(buyer, refund);
        }
    }

    /// @notice Locked 또는 MutualCancelled 협의 중 분쟁 신청 (판매자 또는 구매자)
    function raiseDispute() external nonReentrant {
        require(state == State.Locked, "Cannot dispute now");
        require(msg.sender == seller || msg.sender == buyer, "Not a party");
        state = State.Disputed;
        emit DisputeRaised(msg.sender);
    }

    /// @notice 관리자(platform)가 분쟁을 해결
    /// @param refundBuyer true → 구매자 전액 환불 / false → 판매자 정산 (수수료 차감)
    function adminResolve(bool refundBuyer) external nonReentrant onlyPlatform {
        require(state == State.Disputed, "Not disputed");
        state = State.Completed;
        uint256 balance = token.balanceOf(address(this));
        if (refundBuyer) {
            if (balance > 0) require(token.transfer(buyer, balance), "Refund failed");
            emit AdminResolved(buyer, balance);
        } else {
            uint256 fee = interestCalc.calculate(balance, 0);
            uint256 sellerAmount = balance > fee ? balance - fee : 0;
            if (fee > 0)          require(token.transfer(platform, fee),         "Fee failed");
            if (sellerAmount > 0) require(token.transfer(seller, sellerAmount),  "Seller transfer failed");
            emit AdminResolved(seller, sellerAmount);
        }
    }
}
