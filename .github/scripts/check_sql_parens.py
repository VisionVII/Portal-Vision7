#!/usr/bin/env python3
"""
check_sql_parens.py — Validates parentheses balance in SQL migration files.
Excludes single-quoted string literals, line comments (--) and block comments (/* */).
Prints "MISMATCH open=N close=N" if unbalanced, nothing if OK.
Usage: python3 check_sql_parens.py <file.sql>
"""
import re
import sys

content = open(sys.argv[1]).read()
no_strings = re.sub(r"'(?:[^']|'')*'", "''", content)
no_line_comments = re.sub(r'--[^\n]*', '', no_strings)
clean = re.sub(r'/\*.*?\*/', '', no_line_comments, flags=re.DOTALL)
o, c = clean.count('('), clean.count(')')
if o != c:
    print(f"MISMATCH open={o} close={c}")
