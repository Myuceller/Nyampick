import Image from "next/image";
import { OnboardingSlideData } from "./slides";

interface OnboardingSlideProps {
  data: OnboardingSlideData;
  priority?: boolean;
}

export function OnboardingSlide({ data, priority = false }: OnboardingSlideProps) {
  return (
    <div className="slide">
      <div className="visual-area">
        <Image
          src={data.imageSrc}
          alt={data.imageAlt}
          width={280}
          height={280}
          className={data.imageClassName}
          priority={priority}
        />
        {data.overlay === "spoon" ? <div className="spoon-action">🥄</div> : null}
        {data.overlay === "heart" ? <div className="heart-beat">💚</div> : null}
      </div>
      <div className="title">{data.title}</div>
      <div className="desc">
        {data.descTop}
        <br />
        {data.descBottom}
      </div>
    </div>
  );
}
