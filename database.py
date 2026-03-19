import sqlite3

conn = sqlite3.connect("database.db")
c = conn.cursor()

c.execute("SELECT id, name, parent_id FROM folders;")

rows = c.fetchall()

for row in rows:
    print(row)

conn.close()