pragma solidity ^0.4.21;

/**
 * This is a sample of voting contract for holders of Logi token.
 * Voting is implemented as dedicated token with the same initial distribution as Logi at the specified time (block number).
 * Direct transferring of voting tokens is blocked, instead holders should use vote() method of current contract.
 * If user votes YES then all their voting tokens are transferred to the YES address.
 * Respectively, if user votes NO then all their voting tokens are transferred to the NO address.
 * After voting the balances of YES and NO addresses represent voting results. 
 */

import "./MiniMeToken.sol";
import "./TokenController.sol";
import "./Ownable.sol";

/**
 * @title Logi voting sample
 */
contract LogiVotingSample is TokenController, Ownable {
    
    MiniMeToken public votingToken;
    address public yay;
    address public nay;
    uint256 public endTime;
    string public result;

    /**
     * @dev Ctor
     * @param _logi The address of the Logi token contract
     * @param _logiSnapshotBlock Block of the Logi token that will determine the initial distribution of the voting token
     * @param _yay The address for YES votes
     * @param _nay The address for NO votes
     */
    function LogiVotingSample(address _logi, uint256 _logiSnapshotBlock, address _yay, address _nay) public {
        // create new token that points to Logi as it's parent
        votingToken = new MiniMeToken(
            _logi,                    // Logi
            _logiSnapshotBlock > 0 ?  // Logi snapshot block number
                _logiSnapshotBlock : 
                block.number,       
            "LogiVotingSampleToken",  // Token name
            18,                       // Same as Logi
            "LOGIV1",                 // Symbol
            false                     // Only controller can make transfers
        );

        // change it's controller to the current contract to be able to transfer tokens
        votingToken.changeController(address(this));

        // init state
        yay = _yay;
        nay = _nay;
        endTime = now + (2 weeks);
    }

    function proxyPayment(address _owner) public payable returns(bool) {
        return false;
    }

    function onTransfer(address _from, address _to, uint _amount) public returns(bool) {
        return true;
    }

    function onApprove(address _owner, address _spender, uint _amount) public returns(bool) {
        return false;
    }

    /**
     * @notice Called when a vote is casted
     */
    event Voted(address _addr, bool _vote, uint256 _votes);

    /**
     * @notice Send `true` to vote for YES, otherwise send `false` for NO
     * @param _vote The vote value 
     */
    function vote(bool _vote) public {
        // ensure voting is running
        require(endTime >= now);

        // votes can not be revoked
        require(msg.sender != yay && msg.sender != nay);

        // get the full balance
        uint256 qnt = votingToken.balanceOf(msg.sender);

        // transfer all user voting tokens to the corresponding result address
        require(votingToken.transferFrom(msg.sender, _vote ? yay : nay, qnt));

        // emit event
        emit Voted(msg.sender, _vote, qnt);
    }

    /**
     * @notice Processes voting result
     */
    function doSomethingUsefulAfterVoting() public onlyOwner {
        // ensure voting is finished
        require(endTime < now);

        uint256 yayCount = votingToken.balanceOf(yay);
        uint256 nayCount = votingToken.balanceOf(nay);

        result = yayCount > nayCount ? "The decision is made!" : "Not today. Try again later.";
    }
}