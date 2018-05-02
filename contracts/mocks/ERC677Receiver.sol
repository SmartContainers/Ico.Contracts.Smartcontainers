pragma solidity ^0.4.21;

contract ERC677Receiver {

    address public tokenSender;
    uint public sentValue;
    bytes public tokenData;
    bool public calledFallback = false;

    function tokenFallback(address _sender, uint _value, bytes _data) public returns (bool){
        calledFallback = true;
        tokenSender = _sender;
        sentValue = _value;
        tokenData = _data;
        return true;
    }
}