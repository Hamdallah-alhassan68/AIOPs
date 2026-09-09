import sqlite3
import os


class IncidentQueryService:

    def __init__(self):

        base_dir = os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )

        self.db_path = os.path.join(
            base_dir,
            "database",
            "incidents.db"
        )

    def get_recent_incidents(
        self,
        limit=100
    ):

        conn = sqlite3.connect(
            self.db_path
        )

        conn.row_factory = sqlite3.Row

        cursor = conn.cursor()

        cursor.execute("""
        SELECT *
        FROM incidents
        ORDER BY created_at DESC
        LIMIT ?
        """, (limit,))

        data = [
            dict(row)
            for row in cursor.fetchall()
        ]

        conn.close()

        return data