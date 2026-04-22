// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.6.1

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File contracts/core/Marketplace.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.24;

/// @notice 중앙 레지스트리 - 모든 거래 목록 관리
contract Marketplace is Ownable {
    enum SaleType { DirectSale, OpenAuction, BlindAuction }

    struct Listing {
        uint256 id;
        address seller;
        string title;
        string description;
        string imageHash;
        SaleType saleType;
        address tradeContract;
        bool active;
    }

    event ItemListed(uint256 indexed listingId, address indexed seller, SaleType saleType);
    event ItemDelisted(uint256 indexed listingId);

    uint256 private _nextListingId = 1;
    mapping(uint256 => Listing) private _listings;

    constructor() Ownable(msg.sender) {}

    function listItem(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        SaleType saleType,
        address tradeContract,
        address seller
    ) external returns (uint256 listingId) {
        listingId = _nextListingId++;
        _listings[listingId] = Listing({
            id: listingId,
            seller: seller,
            title: title,
            description: description,
            imageHash: imageHash,
            saleType: saleType,
            tradeContract: tradeContract,
            active: true
        });
        emit ItemListed(listingId, seller, saleType);
    }

    function delistItem(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        require(listing.seller == msg.sender || msg.sender == owner(), "Not authorized");
        require(listing.active, "Already delisted");
        listing.active = false;
        emit ItemDelisted(listingId);
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function getListings(uint256 offset, uint256 limit)
        external
        view
        returns (Listing[] memory result)
    {
        uint256 total = _nextListingId - 1;
        if (offset >= total) return new Listing[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        result = new Listing[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = _listings[i + 1];
        }
    }
}
