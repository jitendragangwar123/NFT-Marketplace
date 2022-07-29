// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard{

    //state variable
    address payable public immutable feeAccount; //the account that recieve fees
    uint public immutable feePercent; // the fee percentage on sales
    uint public itemCount;
    
    //Create a Structure
    struct Item{
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold; 
    }
    
    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );

    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    //itemID ---> Item
    mapping(uint=>Item) public items;

    //Create a Constructor
    constructor(uint _feePercent){
        feeAccount=payable(msg.sender);
        feePercent=_feePercent;
    }
    function makeItem(IERC721 _nft,uint _tokenId,uint _price) external nonReentrant{
        require(_price > 0,"Price must be greater than Zero");
        itemCount++;
        //transfer nft
        _nft.transferFrom(msg.sender,address(this),_tokenId);
        //add new item to items mapping
        items[itemCount]=Item(
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
        //emit Offered event
        emit Offered(
            itemCount,
            address(_nft), 
            _tokenId, 
            _price,
             msg.sender
        );

    }
    //Allow user to Purchase nft
    function purchaseItem(uint _itemId)external payable nonReentrant{
        uint _totalPrice=getTotalPrice(_itemId);
        Item storage item=items[_itemId];
        require(_itemId>0 && _itemId<=itemCount,"Item does not exist.");
        require(msg.value >= _totalPrice,"Not enough ether to cover item price and market fee");
        require(!item.sold,"Item already sold");
        //pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice-item.price);
        //update item to sold
        item.sold=true;
        //transfer nft to buyer
        item.nft.transferFrom(address(this),msg.sender,item.tokenId);
        //emit Bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }
    //to get price 
    function getTotalPrice(uint _itemId)view public returns(uint){
        return(items[_itemId].price*(100*feePercent)/100);
    }
}
  
