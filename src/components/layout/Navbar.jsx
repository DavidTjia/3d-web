import { useEffect, useState } from "react";
import { HiOutlineMenuAlt3, HiOutlineX } from "react-icons/hi";

import Container from "../ui/Container";

import { navigationItems } from "../../constants/navigation";
import kvtLogo from "../../assets/logo/kvt_logo.jpeg";

import "./Navbar.css";

function Navbar() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMenuToggle = () => {
    setIsMobileMenuOpen((previousState) => !previousState);
  };

  const handleNavigationClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`navbar ${hasScrolled ? "navbar--scrolled" : ""}`}>
      <Container>
        <div className="navbar__content">
          <a href="#home" className="navbar__logo">
            <img src={kvtLogo} alt="Kawanua Virtual Teknologi" className="navbar__logo-image" />
          </a>

          <nav className="navbar__navigation" aria-label="Primary navigation">
            {navigationItems.map((navigationItem) => (
              <a
                key={navigationItem.label}
                href={navigationItem.href}
                className="navbar__link"
                onClick={handleNavigationClick}
              >
                {navigationItem.label}
              </a>
            ))}
          </nav>

          <button
            className="navbar__menu-button"
            type="button"
            aria-controls="navbar-mobile-menu"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={handleMenuToggle}
          >
            {isMobileMenuOpen ? <HiOutlineX /> : <HiOutlineMenuAlt3 />}
          </button>
        </div>
      </Container>

      <div
        id="navbar-mobile-menu"
        className={`mobile-navigation ${isMobileMenuOpen ? "mobile-navigation--open" : ""}`}
      >
        <Container>
          {navigationItems.map((navigationItem) => (
            <a
              key={navigationItem.label}
              href={navigationItem.href}
              className="mobile-navigation__link"
              onClick={handleNavigationClick}
            >
              {navigationItem.label}
            </a>
          ))}
        </Container>
      </div>
    </header>
  );
}

export default Navbar;
