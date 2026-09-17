"""
Seed script for TaskPilot demo data.
Run with: python seed.py
Idempotent — skips seeding if data already exists in database.
"""

from models import SessionLocal, init_db, Project, Location, Contractor, Snag, Task


def seed():
    init_db()
    db = SessionLocal()

    try:
        existing_project = db.query(Project).first()
        if existing_project:
            print(f"Database already seeded with project: '{existing_project.name}' (ID: {existing_project.id}). Skipping.")
            return

        print("Seeding demo project data...")

        # 1. Project
        project = Project(
            name="Skyline Luxury Residence (Unit 402)",
            description="Interior fit-out project for 4BHK luxury penthouse."
        )
        db.add(project)
        db.flush()

        # 2. Locations
        locations = [
            Location(project_id=project.id, name="Master Bathroom", floor="4th Floor"),
            Location(project_id=project.id, name="Master Bedroom", floor="4th Floor"),
            Location(project_id=project.id, name="Living Room", floor="4th Floor"),
            Location(project_id=project.id, name="Kitchen", floor="4th Floor"),
            Location(project_id=project.id, name="Guest Bedroom", floor="4th Floor"),
            Location(project_id=project.id, name="Balcony", floor="4th Floor"),
            Location(project_id=project.id, name="Foyer", floor="4th Floor"),
            Location(project_id=project.id, name="Dining Area", floor="4th Floor"),
        ]
        db.add_all(locations)
        db.flush()

        # 3. Contractors
        contractors = [
            Contractor(project_id=project.id, name="Apex False Ceiling Works", trade="False Ceiling", phone="+1 555-0101"),
            Contractor(project_id=project.id, name="AquaFlow Plumbing Solutions", trade="Plumbing", phone="+1 555-0102"),
            Contractor(project_id=project.id, name="SparkLine Electricals", trade="Electrical", phone="+1 555-0103"),
            Contractor(project_id=project.id, name="Woodcraft Carpentry & Joinery", trade="Carpentry", phone="+1 555-0104"),
            Contractor(project_id=project.id, name="PrimeFinishes Painting", trade="Painting", phone="+1 555-0105"),
            Contractor(project_id=project.id, name="TileCraft Flooring", trade="Tiling & Flooring", phone="+1 555-0106"),
        ]
        db.add_all(contractors)
        db.flush()

        # Map for sample references
        loc_map = {loc.name: loc.id for loc in locations}
        contr_map = {c.trade: c.id for c in contractors}

        # 4. Initial sample snags
        sample_snags = [
            Snag(
                project_id=project.id,
                location_id=loc_map.get("Kitchen"),
                contractor_id=contr_map.get("Plumbing"),
                title="Under-sink drain pipe leaking",
                description="Water seepage noticed beneath the kitchen sink cabinet.",
                status="Open",
                priority="High"
            ),
            Snag(
                project_id=project.id,
                location_id=loc_map.get("Living Room"),
                contractor_id=contr_map.get("Electrical"),
                title="Cove lighting flickering near main window",
                description="Warm white LED strip flickers intermittently when dimmed.",
                status="In Progress",
                priority="Medium"
            ),
            Snag(
                project_id=project.id,
                location_id=loc_map.get("Master Bedroom"),
                contractor_id=contr_map.get("Painting"),
                title="Uneven wall paint patch behind wardrobe",
                description="Visible roller marks and color shade mismatch on north wall.",
                status="Open",
                priority="Low"
            ),
        ]
        db.add_all(sample_snags)

        # 5. Initial sample tasks
        sample_tasks = [
            Task(
                project_id=project.id,
                location_id=loc_map.get("Master Bathroom"),
                contractor_id=contr_map.get("Plumbing"),
                title="Install thermostatic shower mixer and hand shower",
                description="Mount chrome fixtures as per layout drawing A-12.",
                due_date="Friday",
                status="Pending",
                priority="High"
            ),
            Task(
                project_id=project.id,
                location_id=loc_map.get("Living Room"),
                contractor_id=contr_map.get("False Ceiling"),
                title="Complete gypsum board framing and perimeter channel",
                description="Ensure laser level alignment for 9-foot ceiling height.",
                due_date="Tomorrow",
                status="In Progress",
                priority="Medium"
            )
        ]
        db.add_all(sample_tasks)
        db.commit()

        print("Database seeded successfully!")
        print(f"- Project: {project.name}")
        print(f"- Locations created: {len(locations)}")
        print(f"- Contractors created: {len(contractors)}")
        print(f"- Sample snags created: {len(sample_snags)}")
        print(f"- Sample tasks created: {len(sample_tasks)}")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
