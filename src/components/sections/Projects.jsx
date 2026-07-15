import Container from "../ui/Container";
import { projectList } from "../../constants/projectData";
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
        <div className="project-card__media-frame">
          <div className="project-card__media-badge">3D / video</div>
          <div className="project-card__media-placeholder">
            <div className="project-card__media-circle"></div>
            <p className="project-card__media-title">Object / image placeholder</p>
            <p className="project-card__media-copy">
              {index === 0
                ? "Reserved for gameplay capture or 3D render"
                : "Reserved for VR scene render or walkthrough"}
            </p>
          </div>
        </div>
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
