import MySQLdb

# Connect to source and target
src_conn = MySQLdb.connect(host='localhost', user='root', password='', database='aacsjour_aacs')
dest_conn = MySQLdb.connect(host='localhost', user='root', password='', database='aacsjour_breakthroughpy')

src_cur = src_conn.cursor()
dest_cur = dest_conn.cursor()

# Get all tables from source
src_cur.execute("SHOW TABLES")
tables = [r[0] for r in src_cur.fetchall()]

print(f"Migrating {len(tables)} tables...")

# For each table, get rows and insert into dest
for table in tables:
    try:
        # Check if table exists in dest
        dest_cur.execute(f"SHOW TABLES LIKE '{table}'")
        if not dest_cur.fetchone():
            # Get CREATE TABLE from source
            src_cur.execute(f"SHOW CREATE TABLE `{table}`")
            create_stmt = src_cur.fetchone()[1]
            dest_cur.execute(create_stmt)
            print(f"Created table {table}")
            
        # Clear dest table safely (ignoring foreign keys temporarily)
        dest_cur.execute("SET FOREIGN_KEY_CHECKS=0")
        dest_cur.execute(f"TRUNCATE TABLE `{table}`")
        
        # Copy data
        src_cur.execute(f"SELECT * FROM `{table}`")
        rows = src_cur.fetchall()
        
        if rows:
            cols = [desc[0] for desc in src_cur.description]
            placeholders = ', '.join(['%s'] * len(cols))
            cols_str = ', '.join([f"`{c}`" for c in cols])
            
            insert_query = f"INSERT INTO `{table}` ({cols_str}) VALUES ({placeholders})"
            dest_cur.executemany(insert_query, rows)
            
        dest_conn.commit()
        print(f"Migrated {len(rows)} rows for {table}")
        dest_cur.execute("SET FOREIGN_KEY_CHECKS=1")
        
    except Exception as e:
        print(f"Error migrating {table}: {e}")

src_conn.close()
dest_conn.close()
print("Migration complete!")
