import os
import sqlite3
from functools import wraps
from flask import Flask, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("CAMPUSCONNECT_SECRET", "change-this-demo-secret-before-deployment")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax"
)
DB_PATH = os.path.join(os.path.dirname(__file__), "campusconnect.db")

def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

def init_db():
    with db() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            department TEXT NOT NULL,
            year TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS opportunities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            company TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Internship',
            description TEXT NOT NULL,
            deadline TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            opportunity_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Submitted',
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, opportunity_id),
            FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY(opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            event_date TEXT NOT NULL,
            venue TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            posted_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        """)
        admin = con.execute("SELECT id FROM students WHERE email=?", ("admin@campusconnect.com",)).fetchone()
        if not admin:
            con.execute("""INSERT INTO students(name,email,department,year,password_hash,role)
                VALUES(?,?,?,?,?,?)""",
                ("Campus Admin", "admin@campusconnect.com", "Administration", "Staff",
                 generate_password_hash("admin123"), "admin"))
        if con.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0] == 0:
            con.executemany("""INSERT INTO opportunities(title,company,category,description,deadline)
                VALUES(?,?,?,?,?)""", [
                ("Python Developer Intern", "TechNova", "Internship",
                 "Build useful Python features with a friendly engineering team.", "2026-12-15"),
                ("UI/UX Design Intern", "PixelWorks", "Internship",
                 "Help design accessible interfaces, wireframes and prototypes.", "2026-12-20"),
                ("Graduate Trainee", "Innova Systems", "Full-time",
                 "An entry-level opportunity for students interested in software.", "2027-01-10")
            ])
        if con.execute("SELECT COUNT(*) FROM events").fetchone()[0] == 0:
            con.execute("INSERT INTO events(title,event_date,venue,description) VALUES(?,?,?,?)",
                ("DBMS Project Showcase", "2026-12-05", "Computer Lab 2",
                 "Present your database projects and learn from other teams."))
        if con.execute("SELECT COUNT(*) FROM announcements").fetchone()[0] == 0:
            con.execute("INSERT INTO announcements(title,message) VALUES(?,?)",
                ("Welcome to CampusConnect", "Explore campus updates, events and career opportunities."))

def current_user():
    if not session.get("user_id"):
        return None
    with db() as con:
        row = con.execute("SELECT id,name,email,department,year,role FROM students WHERE id=?",
                          (session["user_id"],)).fetchone()
    return dict(row) if row else None

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            return jsonify({"error": "Please log in to continue."}), 401
        return fn(*args, **kwargs)
    return wrapper

def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if session.get("role") != "admin":
            return jsonify({"error": "Administrator access required."}), 403
        return fn(*args, **kwargs)
    return wrapper

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Python backend and SQLite are connected."})

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    department = str(data.get("department", "")).strip()
    year = str(data.get("year", "")).strip()
    password = str(data.get("password", ""))
    if not all([name, email, department, year, password]):
        return jsonify({"error": "Please complete every field."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must contain at least 6 characters."}), 400
    try:
        with db() as con:
            cur = con.execute("""INSERT INTO students(name,email,department,year,password_hash)
                VALUES(?,?,?,?,?)""",
                (name, email, department, year, generate_password_hash(password)))
            new_id = cur.lastrowid
        session["user_id"] = new_id
        session["role"] = "student"
        return jsonify({"message": "Account created successfully.", "user": current_user()}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "That email address is already registered."}), 409

@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    with db() as con:
        user = con.execute("SELECT * FROM students WHERE email=?", (email,)).fetchone()
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Email or password is incorrect."}), 401
    session.clear()
    session["user_id"] = user["id"]
    session["role"] = user["role"]
    return jsonify({"message": "Login successful.", "user": current_user()})

@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out."})

@app.get("/api/me")
@login_required
def me():
    return jsonify({"user": current_user()})

@app.get("/api/dashboard")
@login_required
def dashboard():
    with db() as con:
        student_count = con.execute("SELECT COUNT(*) FROM students WHERE role='student'").fetchone()[0]
        opportunity_count = con.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0]
        event_count = con.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        my_apps = con.execute("SELECT COUNT(*) FROM applications WHERE student_id=?",
                              (session["user_id"],)).fetchone()[0]
        announcements = con.execute("SELECT * FROM announcements ORDER BY id DESC LIMIT 4").fetchall()
        opportunities = con.execute("SELECT * FROM opportunities ORDER BY id DESC LIMIT 3").fetchall()
    return jsonify({
        "stats": {"students": student_count, "opportunities": opportunity_count,
                  "events": event_count, "my_applications": my_apps},
        "announcements": [dict(x) for x in announcements],
        "latest_opportunities": [dict(x) for x in opportunities]
    })

@app.get("/api/opportunities")
@login_required
def opportunities():
    with db() as con:
        rows = con.execute("""SELECT o.*, a.id AS application_id
            FROM opportunities o LEFT JOIN applications a
            ON a.opportunity_id=o.id AND a.student_id=?
            ORDER BY o.id DESC""", (session["user_id"],)).fetchall()
    return jsonify({"opportunities": [dict(x) for x in rows]})

@app.post("/api/opportunities/<int:opportunity_id>/apply")
@login_required
def apply(opportunity_id):
    if session.get("role") == "admin":
        return jsonify({"error": "Admin accounts cannot apply."}), 403
    try:
        with db() as con:
            con.execute("INSERT INTO applications(student_id,opportunity_id) VALUES(?,?)",
                        (session["user_id"], opportunity_id))
        return jsonify({"message": "Your application has been submitted."}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "You have already applied, or this opportunity does not exist."}), 409

@app.get("/api/events")
@login_required
def events():
    with db() as con:
        rows = con.execute("SELECT * FROM events ORDER BY event_date").fetchall()
    return jsonify({"events": [dict(x) for x in rows]})

@app.get("/api/admin/students")
@admin_required
def admin_students():
    with db() as con:
        rows = con.execute("""SELECT id,name,email,department,year,created_at
            FROM students WHERE role='student' ORDER BY id DESC""").fetchall()
    return jsonify({"students": [dict(x) for x in rows]})

@app.get("/api/admin/applications")
@admin_required
def admin_applications():
    with db() as con:
        rows = con.execute("""SELECT a.id,s.name AS student_name,o.title AS opportunity_title,
            a.status,a.applied_at FROM applications a
            JOIN students s ON s.id=a.student_id
            JOIN opportunities o ON o.id=a.opportunity_id ORDER BY a.id DESC""").fetchall()
    return jsonify({"applications": [dict(x) for x in rows]})

@app.post("/api/admin/opportunities")
@admin_required
def add_opportunity():
    data = request.get_json(silent=True) or {}
    fields = [str(data.get(k, "")).strip() for k in ("title","company","category","description","deadline")]
    if not all(fields):
        return jsonify({"error": "Complete all opportunity fields."}), 400
    with db() as con:
        con.execute("""INSERT INTO opportunities(title,company,category,description,deadline)
            VALUES(?,?,?,?,?)""", fields)
    return jsonify({"message": "Opportunity added."}), 201

@app.post("/api/admin/events")
@admin_required
def add_event():
    data = request.get_json(silent=True) or {}
    fields = [str(data.get(k, "")).strip() for k in ("title","event_date","venue","description")]
    if not all(fields):
        return jsonify({"error": "Complete all event fields."}), 400
    with db() as con:
        con.execute("INSERT INTO events(title,event_date,venue,description) VALUES(?,?,?,?)", fields)
    return jsonify({"message": "Event added."}), 201

@app.post("/api/admin/announcements")
@admin_required
def add_announcement():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    message = str(data.get("message", "")).strip()
    if not title or not message:
        return jsonify({"error": "Enter a title and announcement message."}), 400
    with db() as con:
        con.execute("INSERT INTO announcements(title,message) VALUES(?,?)", (title,message))
    return jsonify({"message": "Announcement posted."}), 201

@app.get("/api/admin/summary")
@admin_required
def admin_summary():
    with db() as con:
        students = con.execute("SELECT COUNT(*) FROM students WHERE role='student'").fetchone()[0]
        opportunities = con.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0]
        applications = con.execute("SELECT COUNT(*) FROM applications").fetchone()[0]
        events = con.execute("SELECT COUNT(*) FROM events").fetchone()[0]
    return jsonify({"students":students,"opportunities":opportunities,
                    "applications":applications,"events":events})

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=True)
