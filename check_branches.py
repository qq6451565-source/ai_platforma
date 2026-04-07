import subprocess

result = subprocess.check_output(['git', 'branch', '-r', '--sort=-committerdate', '--format=%(committerdate:iso) | %(refname:short)'], text=True, cwd=r'd:\user\dekstop\ai_platforma')
lines = result.strip().split('\n')
for line in lines[:15]:
    print(line)
