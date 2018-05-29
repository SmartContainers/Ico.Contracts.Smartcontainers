pragma solidity ^0.4.22;

contract ApproveAndCallReceiver  {

    address public tokenOwner;
    uint public approvedAmount;
    bytes public tokenData;
    bool public calledFallback = false;

    function receiveApproval(address _from, uint256 _amount, address _token, bytes _data) public {
        calledFallback = true;
        tokenOwner = _from;
        approvedAmount = _amount;
        tokenData = _data;
    }
}