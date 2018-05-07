pragma solidity ^0.4.21;

/*
 *  To simplify flow and deploying process we don't use MiniMe controller approach,
 *  instead we extend it through inheritance.
 *
 *  See https://github.com/Giveth/minime for details of MiniMe.
 */

import "./ERC677.sol";

/**
 * @title Smart Containers LOGI token contract 
 */
contract LogiToken is ERC677 {

    /**
     * @dev Logi constructor just parametrizes the ERC677 -> MiniMeToken constructor
     */
    function LogiToken() public ERC677(
        0x0,                      // no parent token
        0,                        // no parent token - no snapshot block number
        "LogiToken",              // Token name
        18,                       // Decimals
        "LOGI",                   // Symbol
        false                     // Disable transfers for time of minting
    ) {}


    // use the smallest denomination unit to operate with token amounts
    uint256 public constant maxSupply = 100 * 1000 * 1000 * 10**uint256(decimals);

    // mapping for locking certain addresses
    mapping(address => uint256) public lockups;

    /**
     * @notice Sets the locks of an array of addresses.
     * @dev Must be called while minting (enableTransfers = false). Sizes of `_holder` and `_lockups` must be the same.
     * @param _holders The array of investor addresses
     * @param _lockups The array of timestamps until which corresponding address must be locked
     */
    function setLocks(address[] _holders, uint256[] _lockups) public onlyController {
        require(_holders.length == _lockups.length);
        require(_holders.length < 255);
        require(transfersEnabled == false);

        for (uint8 i = 0; i < _holders.length; i++) {
            address holder = _holders[i];
            uint256 lockup = _lockups[i];

            // make sure lockup period can not be overwritten once set
            require(now >= lockups[holder]);

            lockups[holder] = lockup;
        }
    }

    /**
     * @dev Finishes minting process and throws out the controller.
     */
    function finishMinting() public onlyController() {
        assert(totalSupply() <= maxSupply); // ensure hard cap
        enableTransfers(true); // turn-on transfers
        changeController(address(0x0)); // ensure no new tokens will be created
    }

    modifier notLocked(address _addr) {
        require(now >= lockups[_addr]);
        _;
    }

    /**
     * @notice Send `_amount` tokens to `_to` from `msg.sender`
     * @dev We override transfer function to add lockup check
     * @param _to The address of the recipient
     * @param _amount The amount of tokens to be transferred
     * @return Whether the transfer was successful or not
     */
    function transfer(address _to, uint256 _amount) public notLocked(msg.sender) returns (bool success) {
        return super.transfer(_to, _amount);
    }

    /**
     * @notice Send `_amount` tokens to `_to` from `_from` on the condition it is approved by `_from`
     * @dev We override transfer function to add lockup check
     * @param _from The address holding the tokens being transferred
     * @param _to The address of the recipient
     * @param _amount The amount of tokens to be transferred
     * @return True if the transfer was successful
     */
    function transferFrom(address _from, address _to, uint256 _amount) public notLocked(_from) returns (bool success) {
        return super.transferFrom(_from, _to, _amount);
    }
}