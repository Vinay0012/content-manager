from flask import Flask, render_template, request, redirect, jsonify, session
import sqlite3
import random
import os
import uuid

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", "random-long-secret")

ADMIN_USER = "admin"
ADMIN_PASS = "987321654"

UPLOAD_PHOTO = "static/uploads/photos"
UPLOAD_VIDEO = "static/uploads/videos"

os.makedirs(UPLOAD_PHOTO, exist_ok=True)
os.makedirs(UPLOAD_VIDEO, exist_ok=True)

def init_db():

    conn = get_db()
    c = conn.cursor()

    # create folders table
    c.execute("""
    CREATE TABLE IF NOT EXISTS folders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )
    """)

    # create posts table
    c.execute("""
    CREATE TABLE IF NOT EXISTS posts(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        content TEXT,
        caption TEXT,
        folder_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()

def get_db():

    conn = sqlite3.connect("database.db")
    conn.execute("PRAGMA foreign_keys = ON")

    return conn

@app.route("/admin")
def admin():

    if not session.get("admin"):
        return redirect("/xxx")

    return render_template("index.html")

@app.route("/login", methods=["POST"])
def login():

    user = request.form["username"]
    pw = request.form["password"]

    if user == ADMIN_USER and pw == ADMIN_PASS:
        session["admin"] = True
        return redirect("/admin")

    return redirect("/")


@app.route("/")
def landing():
    return render_template("landing.html")

@app.route("/feed")
def feed():
    return render_template("feed.html")


@app.route("/add_text", methods=["POST"])
def add_text():

    text = request.form["text"]
    folder_id = request.form["folder_id"]

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO posts(type,content,folder_id) VALUES(?,?,?)",
        ("text", text, folder_id)
    )

    conn.commit()
    conn.close()

    return redirect("/admin")


@app.route("/add_photo", methods=["POST"])
def add_photo():

    file = request.files["photo"]
    caption = request.form["caption"]
    folder_id = request.form["folder_id"]

    filename = str(uuid.uuid4()) + "_" + file.filename
    path = os.path.join(UPLOAD_PHOTO, filename)
    file.save(path)

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO posts(type,content,caption,folder_id) VALUES(?,?,?,?)",
        ("photo", path, caption, folder_id)
    )

    conn.commit()
    conn.close()

    return redirect("/admin")


@app.route("/add_video", methods=["POST"])
def add_video():

    file = request.files["video"]
    caption = request.form["caption"]
    folder_id = request.form["folder_id"]

    path = os.path.join(UPLOAD_VIDEO, file.filename)
    file.save(path)

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO posts(type,content,caption,folder_id) VALUES(?,?,?,?)",
        ("video", path, caption, folder_id)
    )

    conn.commit()
    conn.close()

    return redirect("/admin")


@app.route("/random_post")
def random_post():

    conn = get_db()
    c = conn.cursor()

    c.execute("""
    SELECT id, type, content, caption, created_at
    FROM posts
    ORDER BY RANDOM()
    LIMIT 1
    """)

    row = c.fetchone()

    conn.close()

    return jsonify(row)


@app.route("/search_text")
def search_text():

    q = request.args.get("q")

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "SELECT content FROM posts WHERE type='text' AND content LIKE ?",
        ('%' + q + '%',)
    )

    rows = c.fetchall()

    conn.close()

    return jsonify([r[0] for r in rows])


@app.route("/manage")
def manage():

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT * FROM posts")

    posts = c.fetchall()

    conn.close()

    return render_template("manage.html", posts=posts)

@app.route("/folders")
def folders():

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT id, name, parent_id FROM folders")

    rows = c.fetchall()

    folders = [
        {"id": row[0], "name": row[1], "parent_id": row[2]}
        for row in rows
    ]

    conn.close()

    return jsonify(folders)

@app.route("/add_folder", methods=["POST"])
def add_folder():

    name = request.form["name"]
    parent_id = request.form.get("parent_id")

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO folders (name, parent_id) VALUES (?, ?)",
        (name, parent_id if parent_id else None)
    )

    conn.commit()
    conn.close()

    return redirect("/")

@app.route("/folder_posts")
def folder_posts():

    folder_id = request.args.get("folder_id")
    page = int(request.args.get("page", 1))
    per_page = 5
    offset = (page - 1) * per_page

    conn = get_db()
    c = conn.cursor()

    # total posts
    c.execute("""
    SELECT COUNT(*)
    FROM posts
    WHERE folder_id=?
    """, (folder_id,))
    total = c.fetchone()[0]

    # paginated posts
    c.execute("""
    SELECT id, type, content, caption, created_at
    FROM posts
    WHERE folder_id=?
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
    """, (folder_id, per_page, offset))

    rows = c.fetchall()

    conn.close()

    return jsonify({
        "posts": rows,
        "total": total,
        "page": page,
        "per_page": per_page
    })

@app.route("/all_posts")
def all_posts():

    # 🔒 protect route
    if not session.get("admin"):
        return redirect("/xxx")

    conn = get_db()
    c = conn.cursor()

    c.execute("""
    SELECT posts.id, posts.type, posts.content, posts.caption, folders.name
    FROM posts
    JOIN folders ON posts.folder_id = folders.id
    """)

    posts = c.fetchall()

    conn.close()

    return render_template("all_posts.html", posts=posts)

@app.route("/delete_post/<int:post_id>")
def delete_post(post_id):

    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM posts WHERE id=?", (post_id,))

    conn.commit()
    conn.close()

    return redirect("/all_posts")

@app.route("/delete_folder/<int:folder_id>")
def delete_folder(folder_id):

    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM folders WHERE id=?", (folder_id,))

    conn.commit()
    conn.close()

    return "ok"

@app.route("/rename_folder", methods=["POST"])
def rename_folder():

    folder_id = request.form["id"]
    new_name = request.form["name"]

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "UPDATE folders SET name=? WHERE id=?",
        (new_name, folder_id)
    )

    conn.commit()
    conn.close()

    return "ok"

@app.route("/add_table", methods=["POST"])
def add_table():

    table_data = request.form["table_data"]
    folder_id = request.form["folder_id"]

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "INSERT INTO posts(type,content,folder_id) VALUES(?,?,?)",
        ("table", table_data, folder_id)
    )

    conn.commit()
    conn.close()

    return redirect("/admin")

@app.route("/edit_timestamp", methods=["POST"])
def edit_timestamp():

    post_id = request.form["id"]
    new_time = request.form["time"]

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "UPDATE posts SET created_at=? WHERE id=?",
        (new_time, post_id)
    )

    conn.commit()
    conn.close()

    return "ok"

@app.route("/feed_posts")
def feed_posts():

    page = int(request.args.get("page", 1))
    per_page = 5
    offset = (page - 1) * per_page

    conn = get_db()
    c = conn.cursor()

    # total posts count
    c.execute("SELECT COUNT(*) FROM posts")
    total = c.fetchone()[0]

    # fetch posts
    c.execute("""
    SELECT id, type, content, caption, created_at
    FROM posts
    ORDER BY created_at ASC
    LIMIT ? OFFSET ?
    """,(per_page, offset))

    rows = c.fetchall()

    conn.close()

    return jsonify({
        "posts": rows,
        "total": total,
        "page": page,
        "per_page": per_page
    })

@app.route("/folder_posts_public")
def folder_posts_public():

    folder = request.args.get("folder")
    page = int(request.args.get("page", 1))
    per_page = 5
    offset = (page - 1) * per_page

    conn = get_db()
    c = conn.cursor()

    # total posts in this folder
    c.execute("""
    SELECT COUNT(*)
    FROM posts
    JOIN folders ON posts.folder_id = folders.id
    WHERE folders.name=?
    """,(folder,))

    total = c.fetchone()[0]

    # fetch posts
    c.execute("""
    SELECT posts.id, posts.type, posts.content, posts.caption, posts.created_at
    FROM posts
    JOIN folders ON posts.folder_id = folders.id
    WHERE folders.name=?
    ORDER BY posts.created_at ASC
    LIMIT ? OFFSET ?
    """,(folder, per_page, offset))

    rows = c.fetchall()

    conn.close()

    return jsonify({
        "posts": rows,
        "total": total,
        "page": page,
        "per_page": per_page
    })

@app.route("/update_post", methods=["POST"])
def update_post():

    post_id = request.form["id"]
    content = request.form.get("content")
    caption = request.form.get("caption")

    conn = get_db()
    c = conn.cursor()

    c.execute(
        "UPDATE posts SET content=?, caption=? WHERE id=?",
        (content, caption, post_id)
    )

    conn.commit()
    conn.close()

    return "ok"

@app.route("/delete_post_ajax/<int:post_id>")
def delete_post_ajax(post_id):

    conn = get_db()
    c = conn.cursor()

    c.execute("DELETE FROM posts WHERE id=?", (post_id,))

    conn.commit()
    conn.close()

    return "ok"

@app.route("/search_posts")
def search_posts():

    folder = request.args.get("folder")
    q = request.args.get("q", "").strip()

    conn = get_db()
    c = conn.cursor()

    query = f"%{q}%"

    if folder:
        c.execute("""
        SELECT posts.id, posts.type, posts.content, posts.caption, posts.created_at
        FROM posts
        JOIN folders ON posts.folder_id = folders.id
        WHERE folders.name=? AND (
            (posts.type = 'text' AND posts.content LIKE ?)
            OR
            (posts.type IN ('photo','video') AND posts.caption LIKE ?)
            OR
            (posts.type = 'table' AND posts.content LIKE ?)
        )
        ORDER BY posts.created_at ASC
        """, (folder, query, query, query))

    else:
        c.execute("""
        SELECT id, type, content, caption, created_at
        FROM posts
        WHERE (
            (type = 'text' AND content LIKE ?)
            OR
            (type IN ('photo','video') AND caption LIKE ?)
            OR
            (type = 'table' AND content LIKE ?)
        )
        ORDER BY created_at DESC
        """, (query, query, query))

    rows = c.fetchall()
    conn.close()

    return jsonify(rows)

@app.route("/logout")
def logout():

    session.clear()

    return redirect("/")

@app.route("/move_post", methods=["POST"])
def move_post():
	post_id = request.form.get("post_id")
	folder_id = request.form.get("folder_id")

	conn = sqlite3.connect("database.db")
	cur = conn.cursor()

	cur.execute("UPDATE posts SET folder_id=? WHERE id=?", (folder_id, post_id))

	conn.commit()
	conn.close()

	return "ok"

@app.route("/xxx", methods=["GET", "POST"])
def admin_entry():

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username == ADMIN_USER and password == ADMIN_PASS:
            session["admin"] = True
            return redirect("/admin")   # ✅ index.html

        return "Invalid credentials"

    # already logged in → skip login
    if session.get("admin"):
        return redirect("/admin")

    return render_template("login.html")

init_db()

if __name__ == "__main__":
    app.run(debug=False)