interface OnboardingFooterProps {
  currentSlide: number;
  onGoToSlide: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function OnboardingFooter({
  currentSlide,
  onGoToSlide,
  onPrev,
  onNext,
}: OnboardingFooterProps) {
  return (
    <div className="footer-ui">
      <div className="dots">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`dot ${currentSlide === index ? "active" : ""}`}
            onClick={() => onGoToSlide(index)}
          />
        ))}
      </div>
      <div className="nav-buttons">
        <button
          type="button"
          className="btn prev-btn"
          style={{ display: currentSlide === 0 ? "none" : "flex" }}
          onClick={onPrev}
        >
          이전
        </button>
        <button type="button" className="btn next-btn" onClick={onNext}>
          {currentSlide === 2 ? "시작하기" : "다음으로"}
        </button>
      </div>
    </div>
  );
}
