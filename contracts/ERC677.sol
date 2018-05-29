pragma solidity ^0.4.22;

import "./MiniMeToken.sol";

/**
 * @title ERC677 transferAndCall token implementation.
 * @dev See https://github.com/ethereum/EIPs/issues/677 for specification and discussion.
 */
contract ERC677 is MiniMeToken {

    /**
     * @dev ERC677 constructor is just a fallback to the MiniMeToken constructor
     */
    constructor(address _parentToken, uint _parentSnapShotBlock, string _tokenName, uint8 _decimalUnits, string _tokenSymbol, bool _transfersEnabled) public MiniMeToken(
        _parentToken, _parentSnapShotBlock, _tokenName, _decimalUnits, _tokenSymbol, _transfersEnabled) {
    }

    /** 
     * @notice `msg.sender` transfers `_amount` to `_to` contract and then tokenFallback() function is triggered in the `_to` contract.
     * @param _to The address of the contract able to receive the tokens
     * @param _amount The amount of tokens to be transferred
     * @param _data The payload to be treated by `_to` contract in corresponding format
     * @return True if the function call was successful
     */
    function transferAndCall(address _to, uint _amount, bytes _data) public returns (bool) {
        require(transfer(_to, _amount));

        emit Transfer(msg.sender, _to, _amount, _data);

        // call receiver
        if (isContract(_to)) {
            ERC677Receiver(_to).tokenFallback(msg.sender, _amount, _data);
        }

        return true;
    }

    /**
     * @notice Raised when transfer to contract has been completed
     */
    event Transfer(address indexed _from, address indexed _to, uint256 _amount, bytes _data);
}

/**
 * @title Receiver interface for ERC677 transferAndCall
 * @dev See https://github.com/ethereum/EIPs/issues/677 for specification and discussion.
 */
contract ERC677Receiver {
    function tokenFallback(address _from, uint _amount, bytes _data) public;
}