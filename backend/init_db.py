from app import create_app
from app.models import User

app = create_app()

with app.app_context():
    # Check if admin user exists
    admin = User.query.filter_by(username='admin').first()
    
    if not admin:
        admin = User(username='admin', email='admin@fleetai.com')
        admin.set_password('admin123')
        from app.database.db import db
        db.session.add(admin)
        db.session.commit()
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
    else:
        print("Admin user already exists!")
