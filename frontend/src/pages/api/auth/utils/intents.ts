export const fetchDepositAddress = async (
  activeTab: "Solana" | "EVM" | "bitcoin",
  accountId: string
) => {
  let chain;

  if (activeTab === "Solana") {
    chain = "sol:mainnet";
  } else if (activeTab === "EVM") {
    chain = "eth:8453";
  } else if (activeTab === "bitcoin") {
    chain = "btc:mainnet";
  } else {
    throw new Error("Invalid activeTab");
  }

  const reqData = {
    jsonrpc: "2.0",
    id: 1,
    method: "deposit_address",
    params: [
      {
        account_id: accountId,
        chain,
      },
    ],
  };

  const res = await fetch("https://bridge.chaindefuser.com/rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
  });

  const data = await res.json();
  return data.result.address;
};
