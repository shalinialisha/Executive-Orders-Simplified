# Import your Flask app and db instance
from server import app, db

# Use the app context
with app.app_context():
    # Create all tables based on your models
    db.create_all()
    
    print("Database has been reset and recreated.")