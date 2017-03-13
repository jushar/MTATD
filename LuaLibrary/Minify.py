#!/usr/bin/env python
import re
import sys

# List files here
MINIFY_MODE = bool(int(sys.argv[1]))
OUTPUT_PATH = 'MTATD.bundle.lua'
FILES = [
    'MTATD.lua',
    'Backend.lua',

    'MTAUnit/MTAUnit.lua',
    'MTAUnit/UnitTest.lua',
    'MTAUnit/TestRunner.lua'
]

# Create output file
print("Minify mode is {status}".format(status="enabled" if MINIFY_MODE else "disabled"))
with open(OUTPUT_PATH, 'w') as outputFile:
    # Write all files
    for path in FILES:
        with open(path) as file:
            for line in file:
                if MINIFY_MODE:
                    if line.find('--') == -1:
                        if not re.match(r'^\s*$', line):
                            outputFile.write(line
                                .replace('\n', ' ')
                                .replace('[[', '')
                                .replace(']]', '')
                            )
                else:
                    outputFile.write(line)
