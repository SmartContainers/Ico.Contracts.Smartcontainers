pragma solidity ^0.4.21;

/**
 * To simplify flow and deploying process we don't use MiniMe controller approach, instead we extend it through inheritance.
 * See https://github.com/Giveth/minime for details of MiniMe.
 *
 * We use Ownable approach implementation from https://github.com/OpenZeppelin/zeppelin-solidity.
 *
 * This is a mintable token. Minting is performed through generateTokens() function of base MiniMe contract.
 * After minting is done controller must call finishMinting() function to enable transfers and to lock generating new tokens forever.
 * Also, we mix "Controlled" ans "Ownable" approaches (which are actually the same) to bring in double-layered authorization.
 * At the start controller and owner are the same. Controller can generate tokens and set locks.
 * After finishing minting controller loses all it's abilities, but owner remains able to burn tokens from the special pre-defined address.
 * Such an approach is intended to increase security and investor confidence.
 */

import "./ERC677.sol";
import "./Ownable.sol";

/**
 * @title Smart Containers SMARC token contract 
 */
contract SmarcToken is ERC677, Ownable {

    // mapping for locking certain addresses
    mapping(address => uint256) public lockups;

    // burnable address
    address public burnable;

    /**
     * @dev Smarc constructor just parametrizes the ERC677 -> MiniMeToken constructor
     */
    function SmarcToken() public ERC677(
        0x0,                      // no parent token
        0,                        // no parent token - no snapshot block number
        "SmarcToken",             // Token name
        18,                       // Decimals
        "SMARC",                  // Symbol
        false                     // Disable transfers for time of minting
    ) {}

    uint256 public constant maxSupply = 150 * 1000 * 1000 * 10**uint256(decimals); // use the smallest denomination unit to operate with token amounts

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
     * @notice Finishes minting process and throws out the controller.
     * @dev Owner can not finish minting without setting up address for burning tokens.
     * @param _burnable The address to burn tokens from
     */
    function finishMinting(address _burnable) public onlyController() {
        require(_burnable != address(0x0)); // burnable address must be set
        assert(totalSupply() <= maxSupply); // ensure hard cap
        enableTransfers(true); // turn-on transfers
        changeController(address(0x0)); // ensure no new tokens will be created
        burnable = _burnable; // set burnable address
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

    /**
     * @notice Burns `_amount` tokens from pre-defined "burnable" address.
     * @param _amount The amount of tokens to burn
     * @return True if the tokens are burned correctly
     */
    function burn(uint _amount) public onlyOwner returns (bool) {
        require(burnable != address(0x0)); // burnable address must be set

        uint currTotalSupply = totalSupply();
        uint previousBalance = balanceOf(burnable);

        require(currTotalSupply >= _amount);
        require(previousBalance >= _amount);

        updateValueAtNow(totalSupplyHistory, currTotalSupply - _amount);
        updateValueAtNow(balances[burnable], previousBalance - _amount);

        emit Transfer(burnable, 0, _amount);
        
        return true;
    }
}