// GraphQL queries for Bitquery Base API as specified in PRD

export const GET_DEX_TRADES_QUERY = `
  query GetDexTrades($tokenA: String!, $tokenB: String!, $limit: Int!, $offset: Int!) {
    ethereum(network: base) {
      dexTrades(
        options: { limit: $limit, offset: $offset, desc: "block.timestamp.time" }
        sellCurrency: { is: $tokenA }
        buyCurrency: { is: $tokenB }
        date: { since: "2024-01-01" }
      ) {
        block {
          timestamp {
            time(format: "%Y-%m-%d %H:%M:%S")
          }
        }
        transaction {
          hash
        }
        smartContract {
          address {
            address
          }
        }
        sellCurrency {
          symbol
          address
        }
        buyCurrency {
          symbol
          address
        }
        sellAmount
        buyAmount
        price
        priceInUSD
        gasPrice
        gasValue
      }
    }
  }
`;

export const GET_LIQUIDITY_POOLS_QUERY = `
  query GetLiquidityPools($tokenA: String!, $tokenB: String!) {
    ethereum(network: base) {
      smartContractCalls(
        smartContractMethod: { is: "addLiquidity" }
        smartContractAddress: { in: [
          "0x2626664c2603336E57B271c5C0b26F421741e481",
          "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
          "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
          "0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891"
        ] }
        options: { limit: 100, desc: "block.timestamp.time" }
      ) {
        smartContract {
          address {
            address
          }
        }
        smartContractMethod {
          name
        }
        arguments {
          argument
          value
        }
        block {
          timestamp {
            time
          }
        }
        transaction {
          hash
        }
      }
    }
  }
`;

export const GET_POOL_RESERVES_QUERY = `
  query GetPoolReserves($poolAddress: String!) {
    ethereum(network: base) {
      smartContractCalls(
        smartContractAddress: { is: $poolAddress }
        smartContractMethod: { is: "getReserves" }
        options: { limit: 1, desc: "block.timestamp.time" }
      ) {
        arguments {
          argument
          value
        }
        block {
          timestamp {
            time
          }
        }
      }
    }
  }
`;

export const GET_VOLUME_ANALYTICS_QUERY = `
  query GetVolumeAnalytics($since: ISO8601DateTime!, $till: ISO8601DateTime!) {
    ethereum(network: base) {
      dexTrades(
        date: { since: $since, till: $till }
        sellCurrency: { in: [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
          "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1"
        ] }
        buyCurrency: { in: [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
          "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1"
        ] }
      ) {
        sellCurrency {
          symbol
          address
        }
        buyCurrency {
          symbol
          address
        }
        smartContract {
          address {
            address
          }
        }
        count
        sellAmount
        buyAmount
        tradeAmount(in: USD)
        maximum_price: price(calculate: maximum)
        minimum_price: price(calculate: minimum)
        average_price: price(calculate: average)
      }
    }
  }
`;

export const GET_HISTORICAL_PRICES_QUERY = `
  query GetHistoricalPrices($tokenA: String!, $tokenB: String!, $since: ISO8601DateTime!, $interval: String!) {
    ethereum(network: base) {
      dexTrades(
        sellCurrency: { is: $tokenA }
        buyCurrency: { is: $tokenB }
        date: { since: $since }
        options: { asc: "timeInterval.minute" }
      ) {
        timeInterval {
          minute(count: $interval)
        }
        volume: sellAmount(calculate: sum)
        trades: count
        maximum_price: price(calculate: maximum)
        minimum_price: price(calculate: minimum)
        average_price: price(calculate: average)
        open_price: price(calculate: any, uniq: blocks, selectWhere: { rank: { eq: 1 } })
        close_price: price(calculate: any, uniq: blocks, selectWhere: { rank: { eq: -1 } })
      }
    }
  }
`;

export const GET_TOP_PAIRS_QUERY = `
  query GetTopPairs($limit: Int!, $since: ISO8601DateTime!) {
    ethereum(network: base) {
      dexTrades(
        date: { since: $since }
        sellCurrency: { in: [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
          "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1"
        ] }
        buyCurrency: { in: [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
          "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
          "0x4158734D47Fc9692176B5085E0F52ee0Da5d47F1"
        ] }
        options: { limit: $limit, desc: "tradeAmount" }
      ) {
        sellCurrency {
          symbol
          address
        }
        buyCurrency {
          symbol
          address
        }
        trades: count
        volume: sellAmount(calculate: sum)
        tradeAmount(in: USD)
        average_price: price(calculate: average)
        price_change: price(calculate: any, selectWhere: { rank: { eq: -1 } }) - price(calculate: any, selectWhere: { rank: { eq: 1 } })
      }
    }
  }
`;

export const GET_DEX_LIQUIDITY_QUERY = `
  query GetDexLiquidity($dexAddress: String!) {
    ethereum(network: base) {
      smartContractCalls(
        smartContractAddress: { is: $dexAddress }
        smartContractMethod: { in: ["mint", "burn", "sync"] }
        options: { limit: 100, desc: "block.timestamp.time" }
      ) {
        smartContract {
          address {
            address
          }
        }
        smartContractMethod {
          name
        }
        arguments {
          argument
          value
        }
        block {
          timestamp {
            time
          }
        }
        gasValue
        gasPrice
      }
    }
  }
`;
