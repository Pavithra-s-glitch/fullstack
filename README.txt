CAMPUSCONNECT - FULL STACK DBMS PROJECT
=======================================

PROJECT ARCHITECTURE
Browser (HTML/CSS/JavaScript)
    -> Node.js + Express (port 3000; serves frontend and proxies /api)
    -> Python + Flask (port 5000; backend API)
    -> SQLite database (backend/campusconnect.db)

REQUIREMENTS
1. Python 3.10 or newer
2. Node.js LTS (includes npm)
3. Visual Studio Code

OPEN THE PROJECT
1. Download and extract CampusConnect_FullStack.zip.
2. Open VS Code.
3. Click File > Open Folder.
4. Select the extracted CampusConnect_FullStack folder.
5. In VS Code click Terminal > New Terminal.

START THE PYTHON BACKEND (TERMINAL 1)
Windows:
    cd backend
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    python app.py

If "python" does not work, try "py".
Keep this terminal running. It should say the server is running on port 5000.
The SQLite file backend/campusconnect.db is created automatically.

START NODE.JS FRONTEND (TERMINAL 2)
Open a second terminal using Terminal > New Terminal.
Make sure the second terminal is at the main CampusConnect_FullStack folder.
If needed, go to the main folder using:
    cd ..
(Only do this if your terminal is currently inside backend.)
Then run:
    npm install
    npm start

Keep this terminal running too. It should show:
    CampusConnect frontend: http://localhost:3000

OPEN THE WEBSITE
Open Chrome and visit:
    http://localhost:3000

DEMO ADMIN
Email: admin@campusconnect.com
Password: admin123

STUDENT DEMO
1. Click Get started and register a student account.
2. Sign in.
3. View dashboard, opportunities and events.
4. Apply for an opportunity.
5. Sign out.
6. Sign in with the demo admin account.
7. Add an opportunity, event and announcement.
8. View registered students and applications.

DATABASE TABLES
students       - student profiles and login credentials
opportunities  - internships and jobs
applications   - student applications; foreign keys connect students and opportunities
events         - campus events
announcements - campus notices

IMPORTANT
- Start Python first, then Node.js.
- Both terminals must remain running.
- Open localhost:3000 (not port 5000) in your browser.
- Do not open index.html by double-clicking it.
- This is a classroom demo. The demo admin password and Flask secret key must be changed before real deployment.
- Passwords are stored as password hashes, not plain text.
