import Navbar from "../components/layout/Navbar";
import Hero from "../components/sections/Hero";
import Projects from "../components/sections/Projects";
import Contact from "../components/sections/Contact";
import Footer from "../components/layout/Footer";

function Home() {
  return (
    <>
      <Navbar />

      <main>
        <Hero />

        <Projects />

        <Contact />
      </main>

      <Footer />
    </>
  );
}

export default Home;
