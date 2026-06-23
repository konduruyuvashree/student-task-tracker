from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
DB = "tasks.db"

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                subject TEXT NOT NULL,
                deadline TEXT,
                status TEXT DEFAULT 'Pending',
                priority TEXT DEFAULT 'Medium',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    subject = request.args.get('subject', '')
    status = request.args.get('status', '')
    with get_db() as conn:
        query = "SELECT * FROM tasks WHERE 1=1"
        params = []
        if subject:
            query += " AND subject = ?"
            params.append(subject)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY deadline ASC"
        tasks = conn.execute(query, params).fetchall()
    return jsonify([dict(t) for t in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    with get_db() as conn:
        conn.execute(
            "INSERT INTO tasks (title, subject, deadline, status, priority) VALUES (?,?,?,?,?)",
            (data['title'], data['subject'], data.get('deadline',''), data.get('status','Pending'), data.get('priority','Medium'))
        )
        conn.commit()
    return jsonify({"message": "Task added"}), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    with get_db() as conn:
        conn.execute(
            "UPDATE tasks SET title=?, subject=?, deadline=?, status=?, priority=? WHERE id=?",
            (data['title'], data['subject'], data.get('deadline',''), data['status'], data.get('priority','Medium'), task_id)
        )
        conn.commit()
    return jsonify({"message": "Task updated"})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    with get_db() as conn:
        conn.execute("DELETE FROM tasks WHERE id=?", (task_id,))
        conn.commit()
    return jsonify({"message": "Task deleted"})

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    with get_db() as conn:
        subjects = conn.execute("SELECT DISTINCT subject FROM tasks ORDER BY subject").fetchall()
    return jsonify([s['subject'] for s in subjects])

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
