"use client";

import { useState } from "react";
import Image from "next/image";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const goToSlide = (index: number) => {
    if (index < 0 || index > 2) return;
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    if (currentSlide < 2) {
      setCurrentSlide((prev) => prev + 1);
      return;
    }
    onComplete();
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div className="onboarding-screen">
      <div
        className="slider-container"
        style={{ transform: `translateX(-${currentSlide * 100}vw)` }}
        onTouchStart={(e) => setTouchStartX(e.changedTouches[0].screenX)}
        onTouchEnd={(e) => {
          const touchEndX = e.changedTouches[0].screenX;
          if (touchStartX - touchEndX > 50) nextSlide();
          if (touchEndX - touchStartX > 50) prevSlide();
        }}
      >
        <div className="slide">
          <div className="visual-area">
            <Image
              src="/baby.png"
              alt="아기 캐릭터"
              width={280}
              height={280}
              className="main-img baby-float"
              priority
            />
            <div className="spoon-action">🥄</div>
          </div>
          <div className="title">맛있는 첫걸음, 맘마노트</div>
          <div className="desc">
            우리 아이 성장 단계에 딱 맞는
            <br />
            이유식 식단을 AI가 추천해드려요.
          </div>
        </div>

        <div className="slide">
          <div className="visual-area">
            <Image
              src="/calendar.png"
              alt="캘린더 화면"
              width={280}
              height={280}
              className="main-img calendar-tilt"
            />
          </div>
          <div className="title">꼼꼼한 기록, 한눈에 확인</div>
          <div className="desc">
            언제 무엇을 얼마나 먹었는지
            <br />
            간편하게 기록하고 확인하세요.
          </div>
        </div>

        <div className="slide">
          <div className="visual-area">
            <Image
              src="/family.png"
              alt="가족 공유 화면"
              width={280}
              height={280}
              className="main-img"
            />
            <div className="heart-beat">💚</div>
          </div>
          <div className="title">온 가족이 함께해요</div>
          <div className="desc">
            엄마, 아빠, 할머니까지 공유하여
            <br />
            아이의 식단을 공동 관리할 수 있어요.
          </div>
        </div>
      </div>

      <div className="footer-ui">
        <div className="dots">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={`dot ${currentSlide === index ? "active" : ""}`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
        <div className="nav-buttons">
          <button
            type="button"
            className="btn prev-btn"
            style={{ display: currentSlide === 0 ? "none" : "flex" }}
            onClick={prevSlide}
          >
            이전
          </button>
          <button type="button" className="btn next-btn" onClick={nextSlide}>
            {currentSlide === 2 ? "시작하기" : "다음으로"}
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(body) {
          font-family: "Pretendard", sans-serif;
        }

        .onboarding-screen {
          --primary-color: #5dc195;
          --bg-color: #fdfefe;
          --text-color: #4a4a4a;
          margin: 0;
          padding: 0;
          overflow: hidden;
          touch-action: pan-y;
          width: 100vw;
          height: 100vh;
          background-color: var(--bg-color);
        }

        .slider-container {
          display: flex;
          width: 300vw;
          height: 100vh;
          transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .slide {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: 15vh;
          box-sizing: border-box;
        }

        .visual-area {
          position: relative;
          width: 280px;
          height: 280px;
          margin-bottom: 30px;
        }

        .main-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.05));
        }

        .baby-float {
          animation: babyFloat 4s ease-in-out infinite;
        }

        .spoon-action {
          position: absolute;
          top: 40%;
          right: 10%;
          font-size: 40px;
          animation: eatAction 2.5s ease-in-out infinite;
        }

        .calendar-tilt {
          animation: tilt 3s ease-in-out infinite;
        }

        .heart-beat {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 50px;
          animation: pulse 1.5s infinite;
        }

        .title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-color);
          margin-bottom: 12px;
        }

        .desc {
          font-size: 16px;
          color: #999;
          line-height: 1.6;
          text-align: center;
        }

        .footer-ui {
          position: fixed;
          bottom: 40px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 100;
        }

        .dots {
          display: flex;
          gap: 8px;
          margin-bottom: 25px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #eee;
          transition: 0.3s;
          cursor: pointer;
        }

        .dot.active {
          width: 24px;
          border-radius: 10px;
          background: var(--primary-color);
        }

        .nav-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .btn {
          border: none;
          height: 56px;
          border-radius: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
        }

        .next-btn {
          background: var(--primary-color);
          color: white;
          width: 180px;
          box-shadow: 0 10px 20px rgba(93, 193, 149, 0.2);
        }

        .prev-btn {
          background: #f0f2f5;
          color: #777;
          width: 90px;
        }

        @keyframes babyFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes eatAction {
          0%,
          100% {
            transform: translate(0, 0);
          }
          40%,
          60% {
            transform: translate(-35px, -10px) rotate(-20deg);
          }
        }

        @keyframes tilt {
          0%,
          100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.7;
          }
        }

        @media (max-width: 420px) {
          .next-btn {
            width: 170px;
          }
        }

        @media (max-height: 740px) {
          .slide {
            padding-top: 12vh;
          }

          .footer-ui {
            bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
}
