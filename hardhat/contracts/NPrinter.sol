// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;    

interface INPublication {
    function acceptOffer(address author, address publication, string calldata cid) external returns (bool);
}

contract NPrinter  {        
    
    event NPublish(address indexed author, address indexed publication, string cid);

    struct Offer {
        address author;
        address publication;
        string content;
        bool accepted;
    }

    Offer[] public offers; 

    constructor() {}

    function makeOffer(address _publication, string calldata _cid) external {

        Offer memory newOffer = Offer({
            author: msg.sender,
            publication: _publication,
            content: _cid,
            accepted: false
        });

        INPublication pContract = INPublication(_publication);

        bool _permission = pContract.acceptOffer(msg.sender, _publication, _cid);

        if(_permission == true) {
            emit NPublish(msg.sender, _publication, _cid);
            newOffer.accepted = true;
        }
        
        offers.push(newOffer);
    }   

    function offerCount() public view returns (uint) {
        return offers.length;
    }
} 
