// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice 중앙 레지스트리 - 모든 거래 목록 관리
contract Marketplace is Ownable {
    enum SaleType {
        DirectSale,
        OpenAuction,
        BlindAuction
    }

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
    event AuthorizedCreatorUpdated(address indexed creator, bool authorized);

    uint256 private _nextListingId = 1;
    mapping(uint256 => Listing) private _listings;
    mapping(address => bool) private _authorizedCreators;

    constructor() Ownable(msg.sender) {}

    modifier onlyAuthorizedCreator() {
        require(_authorizedCreators[msg.sender] || msg.sender == owner(), "Not authorized creator");
        _;
    }

    function setAuthorizedCreator(address creator, bool authorized) external onlyOwner {
        require(creator != address(0), "Invalid creator");
        _authorizedCreators[creator] = authorized;
        emit AuthorizedCreatorUpdated(creator, authorized);
    }

    function isAuthorizedCreator(address creator) external view returns (bool) {
        return _authorizedCreators[creator];
    }

    function listItem(
        string calldata title,
        string calldata description,
        string calldata imageHash,
        SaleType saleType,
        address tradeContract,
        address seller
    ) external onlyAuthorizedCreator returns (uint256 listingId) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");
        require(seller != address(0), "Invalid seller");
        require(tradeContract != address(0), "Invalid trade contract");
        require(tradeContract.code.length > 0, "Trade contract not deployed");

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

    function getListings(uint256 offset, uint256 limit) external view returns (Listing[] memory result) {
        uint256 total = _nextListingId - 1;
        if (offset >= total) return new Listing[](0);

        uint256 end = offset + limit > total ? total : offset + limit;
        result = new Listing[](end - offset);

        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = _listings[i + 1];
        }
    }
}