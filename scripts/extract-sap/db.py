"""Read-only access to the restored SAP Business One database (`TR`).

The console never talks to this. It is a build-time tool: it reads the real
database once, and writes JSON into `resources/js/demo/real/`. Nothing here
writes to SQL Server, and every query is a SELECT.

Requires the local restore described in
`C:\\temp\\DB_DUMP Trifolium\\analysis\\README.md` and `pip install mssql-python`.
"""

import mssql_python

# The analysis scripts try these in order; the default instance answers first.
CANDIDATE_SERVERS = [
    'localhost',
    '(local)',
    'lpc:localhost',
    r'localhost\MSSQLSERVER',
    '127.0.0.1',
]

DATABASE = 'TR'


def connect(database=DATABASE):
    """Open a read-only-by-convention connection to the restored database."""
    last = None

    for server in CANDIDATE_SERVERS:
        try:
            conn = mssql_python.connect(
                f'Server={server};Database={database};Trusted_Connection=yes;'
                'Encrypt=no;TrustServerCertificate=yes;'
            )
            conn.autocommit = True

            return conn
        except Exception as error:  # noqa: BLE001 — try the next candidate
            last = error

    raise last


def rows(conn, sql, params=()):
    """Run one SELECT and return `(columns, rows)`."""
    cursor = conn.cursor()
    cursor.execute(sql, params)
    columns = [d[0] for d in cursor.description] if cursor.description else []
    data = cursor.fetchall() if cursor.description else []
    cursor.close()

    return columns, [list(r) for r in data]


def dicts(conn, sql, params=()):
    """Run one SELECT and return a list of dicts."""
    columns, data = rows(conn, sql, params)

    return [dict(zip(columns, r)) for r in data]
