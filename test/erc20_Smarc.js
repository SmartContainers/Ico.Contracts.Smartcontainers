const erc20 = require('./erc20');

const SmarcToken = artifacts.require('SmarcToken');

contract('SMARC', function(accounts) {
    erc20({
        accounts: accounts,
        create: async () => {
            return await SmarcToken.new();
        },
        mint: async (contract, to, amount) => {
            await contract.generateTokens(to, amount, { from: accounts[0] });
            await contract.finishMinting(accounts[0], { from: accounts[0] });
        }
    });
});
