import Container from "../ui/Container";
import "./Contact.css";

function Contact() {
  return (
    <section className="contact" id="contact">
      <Container>
        <div className="contact__card">
          <div className="contact__top">
            <p className="contact__eyebrow">— START A PROJECT</p>
            <h2 className="contact__title">
              Have a product in mind? Let’s build it together.
            </h2>
            <p className="contact__copy">
              Tell us about your goals and timeline — we’ll respond within one
              business day with next steps.
            </p>
          </div>

          <div className="contact__actions">
            <a href="mailto:hello@kawanuavt.com">
              <button className="contact__button" type="button">
                Start a conversation
              </button>
            </a>
            <a className="contact__email" href="mailto:hello@kawanuavt.com">
              hello@kawanuavt.com
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}

export default Contact;
