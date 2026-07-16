import { TbBox } from "react-icons/tb";
import Container from "../ui/Container";
import "./Hero.css";

function Hero() {
  return (
    <section className="hero" id="home">
      <Container>
        <div className="hero__inner">
          <div className="hero__grid">
            <div className="hero__copy">
              <p className="hero__eyebrow">— DIGITAL & VIRTUAL TECHNOLOGY PARTNER</p>
              <h1 className="hero__title">
                Innovative <br />
                solutions<span className="hero__dot">.</span> <br />
                Trusted results<span className="hero__dot">..</span>
              </h1>
              <p className="hero__description">
                We design and build virtual technology products — from interactive 3D
                experiences to enterprise software — for teams that need to move fast
                without compromising on quality.
              </p>

              <div className="hero__actions">
                <a href="#projects" className="hero__button hero__button--primary">
                  View our projects
                </a>
                <a href="#about" className="hero__button hero__button--secondary">
                  Learn about us
                </a>
              </div>

              <div className="hero__stats">
                <div className="hero__stat">
                  <p className="hero__stat-value">40+</p>
                  <p className="hero__stat-label">Projects delivered</p>
                </div>
                <div className="hero__stat">
                  <p className="hero__stat-value">12</p>
                  <p className="hero__stat-label">Industry partners</p>
                </div>
                <div className="hero__stat">
                  <p className="hero__stat-value">98%</p>
                  <p className="hero__stat-label">Client retention</p>
                </div>
              </div>
            </div>

            <div className="hero__visual">
              <div className="hero__visual-card">
                <div className="hero__resolution-bubble">1:1 · 640 x 640</div>
                <div className="hero__visual-frame">
                  <div className="hero__visual-placeholder">
                    <div className="hero__visual-placeholder-icon">
                      <TbBox size={26} />
                    </div>
                    <p className="hero__visual-placeholder-title">3D object / interactive media</p>
                    <p className="hero__visual-placeholder-copy">
                      placeholder - to be replaced with final asset
                    </p>
                  </div>
                </div>

                <div className="hero__visual-label">
                  <span className="hero__visual-label-interactive">Interactive</span>
                  <span className="hero__visual-label-drag">drag to rotate</span>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default Hero;
