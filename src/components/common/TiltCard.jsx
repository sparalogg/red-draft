import { useEffect, useRef } from "react";
import VanillaTilt from "vanilla-tilt";
import "./TiltCard.css"; // Importa il file CSS
import parazombiesImage from "../../assets/images/Parazombies.png";

const TiltCard = () => {
  const cardRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      VanillaTilt.init(cardRef.current, {
        max: 25,
        speed: 400,
        glare: true,
        "max-glare": 0.3,
        perspective: 1000,
      });
    }

    return () => {
      cardRef.current?.vanillaTilt?.destroy();
    };
  }, []);

  return (
    <div className="wrapper-tilt">
      <div ref={cardRef} className="card-tilt"
      style={{ backgroundImage: `url(${parazombiesImage})` }}>
        {/* <span>Parazombies</span> */}
      </div>
    </div>
  );
};

export default TiltCard;
