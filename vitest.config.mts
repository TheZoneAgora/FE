import { defineConfig } from "vitest/config";

// 순수 로직만 검사한다. 지갑 서명·네트워크가 필요한 경로는 여기서 다루지 않는다.
// 컴포넌트 테스트를 붙일 때 environment를 "jsdom"으로 바꾸고
// @testing-library/react를 추가하면 된다.
export default defineConfig({
  resolve: {
    // tsconfig의 "@/*" 경로 별칭을 그대로 쓴다 (Vite 네이티브 지원).
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "components/**/*.test.ts"],
    // PTB 빌더는 코인 타입이 없으면 만들어지기 전에 throw한다. 실제 배포에서 쓰는
    // 값과 같은 모양이면 되고, 네트워크를 타지 않으므로 아무 Vault나 가리켜도 된다.
    env: {
      NEXT_PUBLIC_AGENT_MARKET_PACKAGE_ID:
        "0x7dcf1c6495682131bcf3a41d4723f7422ca4d49aadaed5d8bc9c2e4a683deb26",
      NEXT_PUBLIC_AGORA_FIAT_COIN_TYPE: "0x2::sui::SUI",
      NEXT_PUBLIC_AGORA_CRYPTO_COIN_TYPE:
        "0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP",
      NEXT_PUBLIC_AGORA_AGENT_OPERATOR:
        "0x141a93d0f4799b196c67103975af1b1420579781a69bd923b3c9005d88e8251d",
    },
  },
});
