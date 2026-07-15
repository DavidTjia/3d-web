import Container from "../ui/Container";
import kvtLogo from "../../assets/logo/kvt_logo.jpeg";
import { FaLinkedinIn, FaInstagram, FaTwitter } from "react-icons/fa";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <Container>
        <div className="footer__container">
          <div className="footer__top">
            <div className="footer__brand">
              <div className="footer__brand-header">
                <img src={kvtLogo} alt="Kawanua Virtual Teknologi" className="footer__brand-logo" />
               
              </div>
              <p className="footer__brand-tagline">
                Building trusted digital and virtual technology products for teams
                across Indonesia.
              </p>
            </div>

            <div className="footer__links">
              <p className="footer__section-title">Navigate</p>
              <a href="#home" className="footer__link">Home</a>
              <a href="#projects" className="footer__link">Project</a>
              <a href="#about" className="footer__link">About</a>
              <a href="#contact" className="footer__link">Contact</a>
            </div>

            <div className="footer__links">
              <p className="footer__section-title">Services</p>
              <span className="footer__contact-item">Web platforms</span>
              <span className="footer__contact-item">Interactive 3D</span>
              <span className="footer__contact-item">Enterprise tooling</span>
              <span className="footer__contact-item">Product design</span>
            </div>

            <div className="footer__contact">
              <p className="footer__section-title">Contact</p>
              <a href="mailto:hello@kawanuavt.com" className="footer__contact-item">
                hello@kawanuavt.com
              </a>
              <a href="tel:+62431000000" className="footer__contact-item">
                +62 431 000 000
              </a>
              <span className="footer__contact-item">Manado, North Sulawesi</span>
            </div>
          </div>

          <div className="footer__bottom">
            <p className="footer__copyright">
              © 2026 PT Kawanua Virtual Teknologi. All rights reserved.
            </p>
            <div className="footer__social">
              <a href="#" className="footer__social-link" aria-label="LinkedIn">
                <FaLinkedinIn />
              </a>
              <a href="#" className="footer__social-link" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="#" className="footer__social-link" aria-label="Twitter">
                <FaTwitter />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
