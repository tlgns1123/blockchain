// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/StorageSlot.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

pragma solidity ^0.8.20;

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}


// File @openzeppelin/contracts/utils/ReentrancyGuard.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}


// File @openzeppelin/contracts/token/ERC20/IERC20.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

pragma solidity >=0.4.16;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}


// File contracts/interfaces/IAuction.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

interface IAuction {
    enum AuctionState { Active, Ended, Finalized }

    event AuctionStarted(uint256 indexed auctionId, address indexed seller, uint256 endTime);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event Finalized(uint256 indexed auctionId);

    function endTime() external view returns (uint256);
    function state() external view returns (AuctionState);
    function winner() external view returns (address);
    function winningAmount() external view returns (uint256);

    /// 낙찰자가 수령 완료 시 호출 → 판매자에게 정산
    function confirmReceived() external;
}


// File contracts/interfaces/IInterestCalculator.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

interface IInterestCalculator {
    /// @param principal 거래 금액 (wei)
    /// @param durationSeconds 거래 기간 (초) — 구현체에 따라 무시될 수 있음
    /// @return fee 플랫폼이 수취할 수수료 (wei)
    function calculate(uint256 principal, uint256 durationSeconds) external pure returns (uint256 fee);
}


// File contracts/trading/BlindAuction.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;




/// @notice 블라인드 경매 (Vickrey) - BKT 토큰 결제
contract BlindAuction is IAuction, ReentrancyGuard {
    struct CommitData { bytes32 commitment; uint256 deposit; bool revealed; }

    IERC20   public constant token        = IERC20(0x31D47A45d4002F3c528aa467bfD3eA2504487D48);
    address  public constant platform     = 0x2bF932102A9CC14D7afa1C3b91AFeDEe67D70E01;
    address  public constant interestCalc = 0x87E34545C63c10C78712bfbE7Bee9714Bbd11A2b;

    address public immutable seller;
    uint256 public override endTime;
    uint256 public revealEndTime;
    AuctionState public override state;
    address public override winner;
    uint256 public override winningAmount;
    uint256 public highestBid;
    uint256 public secondHighestBid;
    address public highestBidder;
    uint256 public reservePrice;

    mapping(address => CommitData) public commits;
    address[] public bidders;

    event CommitSubmitted(address indexed bidder);
    event BidRevealed(address indexed bidder, uint256 amount);
    event AuctionFinalized(address indexed winner, uint256 chargedAmount);

    constructor(uint256 _reservePrice, uint256 _commitDuration, uint256 _revealDuration, address _seller) {
        seller = _seller;
        reservePrice = _reservePrice;
        endTime = block.timestamp + _commitDuration;
        revealEndTime = endTime + _revealDuration;
        state = AuctionState.Active;
        emit AuctionStarted(0, _seller, endTime);
    }

    function commit(bytes32 commitment, uint256 deposit) external nonReentrant {
        require(state == AuctionState.Active, "Not in commit phase");
        require(block.timestamp < endTime, "Commit phase ended");
        require(deposit >= reservePrice, "Deposit below reserve");
        require(commits[msg.sender].deposit == 0, "Already committed");
        require(token.transferFrom(msg.sender, address(this), deposit), "Token transfer failed");
        commits[msg.sender] = CommitData({ commitment: commitment, deposit: deposit, revealed: false });
        bidders.push(msg.sender);
        emit CommitSubmitted(msg.sender);
    }

    function reveal(uint256 bidAmount, bytes32 secret) external nonReentrant {
        require(block.timestamp >= endTime, "Commit phase not ended");
        require(block.timestamp < revealEndTime, "Reveal phase ended");
        CommitData storage c = commits[msg.sender];
        require(c.deposit > 0, "No commit found");
        require(!c.revealed, "Already revealed");
        require(keccak256(abi.encodePacked(bidAmount, secret)) == c.commitment, "Hash mismatch");
        c.revealed = true;
        emit BidRevealed(msg.sender, bidAmount);
        if (bidAmount > highestBid) { secondHighestBid = highestBid; highestBid = bidAmount; highestBidder = msg.sender; }
        else if (bidAmount > secondHighestBid) { secondHighestBid = bidAmount; }
    }

    function finalizeAuction() external nonReentrant {
        require(block.timestamp >= revealEndTime, "Reveal not ended");
        require(state == AuctionState.Active, "Already finalized");
        state = AuctionState.Ended;
        winner = highestBidder;
        winningAmount = secondHighestBid > reservePrice ? secondHighestBid : reservePrice;
        emit AuctionEnded(0, winner, winningAmount);
        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            if (bidder == winner) continue;
            uint256 refund = commits[bidder].deposit;
            if (refund > 0) { commits[bidder].deposit = 0; require(token.transfer(bidder, refund), "Refund failed"); }
        }
        if (winner != address(0) && commits[winner].deposit > winningAmount) {
            uint256 excess = commits[winner].deposit - winningAmount;
            commits[winner].deposit = winningAmount;
            require(token.transfer(winner, excess), "Excess refund failed");
        }
    }

    function confirmReceived() external override nonReentrant {
        require(state == AuctionState.Ended, "Not ended");
        require(msg.sender == winner, "Not winner");
        state = AuctionState.Finalized;
        emit Finalized(0);
        uint256 fee = IInterestCalculator(interestCalc).calculate(winningAmount, 0);
        uint256 sellerAmount = winningAmount > fee ? winningAmount - fee : 0;
        if (fee > 0) require(token.transfer(platform, fee), "Platform fee failed");
        if (sellerAmount > 0) require(token.transfer(seller, sellerAmount), "Seller transfer failed");
        emit AuctionFinalized(winner, winningAmount);
    }
}


// File contracts/trading/DirectSale.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;


/// @notice 즉시구매 (고정가 판매) - BKT 토큰 결제
contract DirectSale is ReentrancyGuard {
    enum State { OnSale, Locked, Completed, Cancelled }

    IERC20 public constant token = IERC20(0x31D47A45d4002F3c528aa467bfD3eA2504487D48);

    address public immutable seller;
    uint256 public immutable price;
    address public buyer;
    State public state;

    event Purchased(address indexed buyer, uint256 price);
    event ReceivedConfirmed(address indexed buyer);
    event Cancelled();

    modifier onlySeller() { require(msg.sender == seller, "Not seller"); _; }
    modifier onlyBuyer()  { require(msg.sender == buyer,  "Not buyer");  _; }

    constructor(uint256 _price, address _seller) {
        require(_price > 0, "Price must be > 0");
        seller = _seller;
        price = _price;
        state = State.OnSale;
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
        require(token.transfer(seller, price), "Token transfer failed");
    }

    function cancel() external nonReentrant onlySeller {
        require(state == State.OnSale, "Cannot cancel now");
        state = State.Cancelled;
        emit Cancelled();
    }
}


// File contracts/trading/OpenAuction.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;




/// @notice 공개 경매 (English Auction) - BKT 토큰 결제
contract OpenAuction is IAuction, ReentrancyGuard {
    IERC20   public constant token        = IERC20(0x31D47A45d4002F3c528aa467bfD3eA2504487D48);
    address  public constant platform     = 0x2bF932102A9CC14D7afa1C3b91AFeDEe67D70E01;
    address  public constant interestCalc = 0x87E34545C63c10C78712bfbE7Bee9714Bbd11A2b;

    address public immutable seller;
    uint256 public override endTime;
    AuctionState public override state;
    address public override winner;
    uint256 public override winningAmount;
    address public highestBidder;
    uint256 public highestBid;
    uint256 public reservePrice;

    mapping(address => uint256) public pendingReturns;

    event BidPlaced(address indexed bidder, uint256 amount);
    event BidRefunded(address indexed bidder, uint256 amount);
    event AuctionFinalized(address indexed winner, uint256 amount);

    constructor(uint256 _reservePrice, uint256 _durationSeconds, address _seller) {
        seller = _seller;
        reservePrice = _reservePrice;
        endTime = block.timestamp + _durationSeconds;
        state = AuctionState.Active;
        emit AuctionStarted(0, _seller, endTime);
    }

    function bid(uint256 amount) external nonReentrant {
        require(state == AuctionState.Active, "Auction not active");
        require(block.timestamp < endTime, "Auction ended");
        require(amount > highestBid, "Bid too low");
        require(amount >= reservePrice, "Below reserve");
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");
        if (highestBidder != address(0)) pendingReturns[highestBidder] += highestBid;
        highestBidder = msg.sender;
        highestBid = amount;
        emit BidPlaced(msg.sender, amount);
    }

    function withdrawRefund() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingReturns[msg.sender] = 0;
        emit BidRefunded(msg.sender, amount);
        require(token.transfer(msg.sender, amount), "Refund failed");
    }

    function endAuction() external nonReentrant {
        require(state == AuctionState.Active, "Not active");
        require(block.timestamp >= endTime, "Not ended yet");
        state = AuctionState.Ended;
        winner = highestBidder;
        winningAmount = highestBid;
        emit AuctionEnded(0, winner, winningAmount);
    }

    function confirmReceived() external override nonReentrant {
        require(state == AuctionState.Ended, "Not ended");
        require(msg.sender == winner, "Not winner");
        require(winner != address(0), "No winner");
        state = AuctionState.Finalized;
        emit Finalized(0);
        emit AuctionFinalized(winner, winningAmount);
        uint256 fee = IInterestCalculator(interestCalc).calculate(winningAmount, 0);
        uint256 sellerAmount = winningAmount > fee ? winningAmount - fee : 0;
        if (fee > 0) require(token.transfer(platform, fee), "Platform fee failed");
        if (sellerAmount > 0) require(token.transfer(seller, sellerAmount), "Seller transfer failed");
    }
}


// File contracts/core/TradeFactory.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;



interface IMarketplace {
    enum SaleType { DirectSale, OpenAuction, BlindAuction }
    function listItem(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        SaleType saleType,
        address tradeContract,
        address seller
    ) external returns (uint256);
}

/// @notice 거래 컨트랙트 배포 + 마켓플레이스 등록을 1 트랜잭션으로 처리
contract TradeFactory {
    address public immutable marketplace;

    event DirectSaleCreated(address indexed seller, address indexed tradeContract, uint256 listingId);
    event OpenAuctionCreated(address indexed seller, address indexed tradeContract, uint256 listingId);
    event BlindAuctionCreated(address indexed seller, address indexed tradeContract, uint256 listingId);

    constructor(address _marketplace) {
        marketplace = _marketplace;
    }

    function createDirectSale(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        uint256 price
    ) external returns (address tradeContract, uint256 listingId) {
        tradeContract = address(new DirectSale(price, msg.sender));
        listingId = IMarketplace(marketplace).listItem(
            title, description, imageHash,
            IMarketplace.SaleType.DirectSale,
            tradeContract,
            msg.sender
        );
        emit DirectSaleCreated(msg.sender, tradeContract, listingId);
    }

    function createOpenAuction(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        uint256 reservePrice,
        uint256 durationSeconds
    ) external returns (address tradeContract, uint256 listingId) {
        tradeContract = address(new OpenAuction(reservePrice, durationSeconds, msg.sender));
        listingId = IMarketplace(marketplace).listItem(
            title, description, imageHash,
            IMarketplace.SaleType.OpenAuction,
            tradeContract,
            msg.sender
        );
        emit OpenAuctionCreated(msg.sender, tradeContract, listingId);
    }

    function createBlindAuction(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        uint256 reservePrice,
        uint256 commitDuration,
        uint256 revealDuration
    ) external returns (address tradeContract, uint256 listingId) {
        tradeContract = address(new BlindAuction(reservePrice, commitDuration, revealDuration, msg.sender));
        listingId = IMarketplace(marketplace).listItem(
            title, description, imageHash,
            IMarketplace.SaleType.BlindAuction,
            tradeContract,
            msg.sender
        );
        emit BlindAuctionCreated(msg.sender, tradeContract, listingId);
    }
}
