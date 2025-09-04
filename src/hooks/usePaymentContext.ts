import { useWalletClient } from "wagmi";
import { useCallback } from "react";
import axios from "axios";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";

export function usePaymentContext(): {
  createSession: () => Promise<void>;
} {
  const { data: walletClient, isError, isLoading } = useWalletClient();

  const createSession = useCallback(async () => {
    if (!walletClient || !walletClient.account) throw new Error("please connect your wallet");
    if (isError) throw new Error("wallet not connected");
    if (isLoading) throw new Error("wallet is loading");
    
    const baseClient = axios.create({
      baseURL: "https://payments.vistara.dev",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const apiClient = withPaymentInterceptor(baseClient, walletClient);
    const response = await apiClient.post("/api/payment", { amount: "$0.001" });
    const paymentResponse = response.config.headers["X-PAYMENT"];
    
    if (!paymentResponse) throw new Error("payment response is absent");
    
    const decoded = decodeXPaymentResponse(paymentResponse);
    console.log(`decoded payment response: ${JSON.stringify(decoded)}`);
  }, [walletClient, isError, isLoading]);

  return { createSession };
}