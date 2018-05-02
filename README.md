# Ico.Contracts.Smartcontainers

Both tokens (SMARC and LOGI) are based on [MiniMe](https://github.com/Giveth/minime) token.
This allows us to have fully-functional ERC-20 tokens with just a couple lines of code and to reduce amount of restrictions for further functionality.
All additional facilities, like voting, will be implemented through MiniMe cloning abilities.

MiniMe token is used as is except cloning functionality - factory and createCloneToken() method had been deleted.
This significantly decreased deployment gas amount for both tokens.

## Development Process

We use [Truffle](http://truffleframework.com/docs/) for development and testing.

Install Truffle:

```npm install -g truffle```

Install testing dependencies:

```npm install --save-dev chai chai-bignumber```

Launch develop network:

```truffle develop```

Or you can use pre-configured *dev* network to connect to any Etherium client on *localhost:7545*: 

```truffle console --network dev```

Publish contract:

```migrate --reset```.

Test:

```test```

Or you can run tests on develop network without pre-launching:

```truffle test```

If you meet *out of gas* issues while testing with ```truffle develop``` or ```truffle test``` then it's recommended
to switch to external client (consider [Ganache](truffleframework.com/ganache/)) instead of built-in one. You should
increase default gas limit to something greater than or equal to 3700000, which is an approximate price of deploying
SMARC contract (LOGI is a bit simpler and cheaper).

See [documentation](http://truffleframework.com/docs/) for further scenarios.