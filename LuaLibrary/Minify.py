#!/usr/bin/env python
import re

# List files here
OUTPUT_PATH = 'MTATD.bundle.lua'
FILES = [
    'MTATD.lua',
    'Backend.lua',

    'MTAUnit/MTAUnit.lua',
    'MTAUnit/UnitTest.lua',
    'MTAUnit/TestRunner.lua'
]

# Create output file
with open(OUTPUT_PATH, 'w') as outputFile:
    # Write all files
    for path in FILES:
        with open(path) as file:
            for line in file:
                if line.find('--') == -1:
                    if not re.match(r'^\s*$', line):
                        outputFile.write(line
                            .replace('\n', ' ')
                            .replace('[[', '')
                            .replace(']]', '')
                        )
