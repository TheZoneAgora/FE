// design/agora-arena.html의 신뢰 3카드 섹션 포팅 (문구 원본 그대로).

export function TrustSection() {
  return (
    <section className="ar-section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="sec-head">
          <h2 className="sec-title">베팅이 아니라, 위임입니다</h2>
          <span className="sec-note">전부 Sui 온체인에서 코드로 강제됩니다</span>
        </div>
        <div className="trust">
          <div className="tr-item">
            <svg className="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10 V7 C8 4.8 9.8 3 12 3 C14.2 3 16 4.8 16 7 V10" />
              <path d="M12 14 V16" />
            </svg>
            <h3>돈은 내 Vault에서 안 나간다</h3>
            <p>
              Agent가 받는 건 <b>거래 요청 권한</b>뿐. 출금 함수는 소유자 서명만 통과합니다. Agent 키가 통째로
              털려도 원금은 그대로입니다.
            </p>
          </div>
          <div className="tr-item">
            <svg className="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3 V21 M5 8 H19 M7 16 H17" />
            </svg>
            <h3>손실 노출엔 상한이 있다</h3>
            <p>
              1회 한도와 epoch 누적 한도를 온체인에서 검사합니다. 최악의 하루에도 노출은 <b>내가 정한 상한</b>
              까지입니다.
            </p>
          </div>
          <div className="tr-item">
            <svg className="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 12 A9 9 0 1 0 12 3" />
              <path d="M3 5 V12 H10" />
            </svg>
            <h3>마음 바뀌면 1초</h3>
            <p>
              서명 한 번으로 Agent를 멈추고 <b>전액 회수</b>. 락업도, 위약금도, 대기 기간도 없습니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
