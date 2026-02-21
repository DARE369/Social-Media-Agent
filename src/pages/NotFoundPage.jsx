import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/NotFoundPage.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <h1 className="notfound-title">404</h1>
        <p className="notfound-message">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          Go Back Home
        </button>
      </div>
    </div>
  );
}
