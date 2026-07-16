import Container from "../ui/Container";
import { projectList } from "../../constants/projectData";
import wardekaLogo from "../../assets/logo/wardeka_logo.jpeg";
import "./Projects.css";

function ProjectCard({ project, index, isReversed }) {
  return (
    <article
      className={`project-card ${isReversed ? "project-card--reverse" : ""}`}
    >
      <div className="project-card__content">
        <div className="project-card__meta">
          <span className="project-card__label">
            Case study — {String(index + 1).padStart(2, "0")}
          </span>
          <h3>{project.title}</h3>
          <p className="project-card__category">{project.category}</p>
          <p className="project-card__description">{project.description}</p>
        </div>

        <div className="project-card__tags">
          {project.tags.map((tag) => (
            <span key={tag} className="project-card__tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="project-card__details">
          {project.details.map((detail) => (
            <div key={detail.label} className="project-card__detail">
              <span className="project-card__detail-label">{detail.label}</span>
              <strong className="project-card__detail-value">
                {detail.value}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="project-card__media">
     
         
          {index === 0 ? (
            <img
              src={wardekaLogo}
              className="project-card__media-image"
              alt="Wardeka Edonisia"
            />
          ) : (
            <div className="project-card__media-placeholder">
              <div className="project-card__media-circle"></div>
              <p className="project-card__media-title">Nusa Space VR Showcase</p>
              <p className="project-card__media-copy">
                VR asset integration and interactive virtual environment walkthrough.
              </p>
            </div>
          )}
        </div>
    </article>
  );
}

function Projects() {
  return (
    <section className="projects" id="projects">
      <Container>
        <div className="projects__wrapper">
          <h2 className="projects__title">
            A closer look at what we’ve built.
          </h2>

          <div className="projects__grid">
            {projectList.map((project, index) => (
              <ProjectCard
                key={project.title}
                project={project}
                index={index}
                isReversed={index % 2 === 1}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export default Projects;
