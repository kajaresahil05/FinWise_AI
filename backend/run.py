from app import create_app, db
import os

app = create_app()

@app.cli.command("init-db")
def init_db():
    """Initialize the database tables."""
    db.create_all()
    print("Database tables created successfully!")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
