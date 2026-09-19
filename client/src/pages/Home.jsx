import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Users,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";
import "../styles/landing.css";

const Home = () => {
  const navigate = useNavigate();


  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="brand">
          <div className="brand-circle">
            TuroLink
          </div>
        </Link>

        <div className="landing-links">
          <a href="#about">About</a>
          <a href="#how-it-works">How it Works</a>
          <a href="#faq">FAQ</a>
        </div>

        <div className="nav-actions">
          <Link
            to="/login"
            className="btn btn-outline btn-small"
          >
            Log in
          </Link>

          <Link
            to="/register"
            className="btn btn-primary btn-small"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      <main className="hero">
        <section className="hero-content">
          <span className="eyebrow">
            Peer learning in Dagupan City
          </span>

          <h1>
            Find the right tutor,
            <br />
            right here in
            <br />
            Dagupan City.
          </h1>

          <p>
            A web-based peer tutoring platform
            connecting learners with tutors and
            teachers — affordable, local, and built
            for SDG 4: Quality Education.
          </p>

          <div className="hero-buttons">
            <button
              className="btn btn-primary"
              onClick={() => navigate("/register")}
            >
              Continue as Student
              <ArrowRight size={18} />
            </button>

           
          </div>
        </section>

        <section
          className="hero-art"
          aria-label="TuroLink graphic"
        >
          <div className="circle circle-sage"></div>
          <div className="circle circle-green"></div>
          <div className="circle circle-white"></div>

          <div className="floating-card floating-card-one">
            <BookOpen size={20} />
            Learn
          </div>

          <div className="floating-card floating-card-two">
            <Users size={20} />
            Connect
          </div>
        </section>
      </main>

      <section id="about" className="info-section">
        <div>
          <span className="section-label">
            ABOUT TUROLINK
          </span>

          <h2>
            Learning becomes easier when help is
            within reach.
          </h2>
        </div>

        <p>
          TuroLink gives students a simple place to
          access their learning dashboard, monitor
          courses and keep track of tutoring
          sessions.
        </p>
      </section>

      <section
        id="how-it-works"
        className="how-section"
      >
        <span className="section-label">
          HOW IT WORKS
        </span>

        <h2>Three simple steps.</h2>

        <div className="step-grid">
          <article className="step-card">
            <span>01</span>
            <CheckCircle2 size={30} />
            <h3>Create an account</h3>
            <p>
              Sign up as a student using your basic
              information.
            </p>
          </article>

          <article className="step-card">
            <span>02</span>
            <BookOpen size={30} />
            <h3>Access your courses</h3>
            <p>
              See your enrolled subjects and upcoming
              learning sessions.
            </p>
          </article>

          <article className="step-card">
            <span>03</span>
            <Users size={30} />
            <h3>Track your learning</h3>
            <p>
              Use your dashboard to follow your
              progress and schedule.
            </p>
          </article>
        </div>
      </section>

      <section id="faq" className="faq-section">
        <span className="section-label">FAQ</span>

        <h2>Built for students.</h2>

        <p>
          TuroLink is currently focused on the
          student experience. Create an account,
          log in and access your personal learning
          dashboard.
        </p>
      </section>
    </div>
  );
};

export default Home;