"""
Database schema and session management for TaskPilot.
Supports Neon PostgreSQL (production/cloud) and SQLite (local fallback).
Defines models: Project, Location, Contractor, Snag, and Task.
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

load_dotenv()

raw_db_url = os.getenv("DATABASE_URL", "sqlite:///voice_project.db")

# SQLAlchemy 1.4+ requires "postgresql://" or "postgresql+psycopg2://" instead of "postgres://"
if raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_db_url

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Postgres configuration with pool_pre_ping for serverless databases like Neon
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    locations = relationship("Location", back_populates="project", cascade="all, delete-orphan")
    contractors = relationship("Contractor", back_populates="project", cascade="all, delete-orphan")
    snags = relationship("Snag", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "Master Bathroom", "Kitchen", "Living Room"
    floor = Column(String(100), nullable=True)

    project = relationship("Project", back_populates="locations")
    snags = relationship("Snag", back_populates="location")
    tasks = relationship("Task", back_populates="location")


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    trade = Column(String(255), nullable=False)  # e.g., "False Ceiling", "Plumbing", "Electrical", "Carpentry"
    phone = Column(String(50), nullable=True)

    project = relationship("Project", back_populates="contractors")
    snags = relationship("Snag", back_populates="contractor")
    tasks = relationship("Task", back_populates="contractor")


class Snag(Base):
    __tablename__ = "snags"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Open")  # Open, In Progress, Resolved, Closed
    priority = Column(String(50), default="Medium")  # Low, Medium, High, Critical
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="snags")
    location = relationship("Location", back_populates="snags")
    contractor = relationship("Contractor", back_populates="snags")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String(100), nullable=True)
    status = Column(String(50), default="Pending")  # Pending, In Progress, Completed
    priority = Column(String(50), default="Medium")  # Low, Medium, High, Critical
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
    location = relationship("Location", back_populates="tasks")
    contractor = relationship("Contractor", back_populates="tasks")


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
